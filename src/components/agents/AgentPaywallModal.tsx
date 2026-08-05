"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getAccount } from "@multiversx/sdk-dapp/out/methods/account/getAccount";
import { refreshAccount } from "@multiversx/sdk-dapp/out/utils/account/refreshAccount";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  AGENT_NOVA_DISCOUNT,
  AGENT_SUBSCRIPTION_USDC,
  agentSubscriptionNovaAmount,
  agentSubscriptionNovaFace,
  type AgentDefinition,
} from "@/config/agents";
import {
  createAgentSubscriptionPayment,
  type AgentPaymentAsset,
} from "@/lib/agents/createSubscriptionPayment";
import { signAndSendTransactions } from "@/lib/mx/signAndSendTransactions";

type AgentPaywallModalProps = {
  open: boolean;
  agent: AgentDefinition | null;
  walletAddress: string | null;
  onClose: () => void;
  onSubscribed: (expiresAt: string) => void;
  onConnect: () => void;
};

export function AgentPaywallModal({
  open,
  agent,
  walletAddress,
  onClose,
  onSubscribed,
  onConnect,
}: AgentPaywallModalProps) {
  const [asset, setAsset] = useState<AgentPaymentAsset>("USDC");
  const [status, setStatus] = useState<
    "idle" | "signing" | "activating" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const novaFace = useMemo(() => agentSubscriptionNovaFace(), []);
  const novaDiscounted = useMemo(() => agentSubscriptionNovaAmount(), []);
  const discountPct = Math.round(AGENT_NOVA_DISCOUNT * 100);

  const busy = status === "signing" || status === "activating";

  const handlePay = async () => {
    if (!agent) return;
    if (!walletAddress) {
      onConnect();
      return;
    }

    setError(null);
    setStatus("signing");
    try {
      await refreshAccount();
      const latest = getAccount();
      if (!latest.address) throw new Error("Wallet address unavailable");

      const { tx } = await createAgentSubscriptionPayment({
        senderAddress: latest.address,
        agentId: agent.id,
        asset,
        nonce: latest.nonce,
      });

      const { sentTransactions } = await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: `Paying ${agent.name} subscription…`,
          successMessage: "Payment sent — activating access…",
          errorMessage: "Subscription payment failed",
        },
      });

      const paymentTxHash = Array.isArray(sentTransactions[0])
        ? sentTransactions[0][0]?.hash
        : sentTransactions[0]?.hash;
      if (!paymentTxHash) {
        throw new Error("Payment broadcast succeeded but tx hash is missing");
      }

      setStatus("activating");
      let res = await fetch("/api/agents/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: latest.address,
          agentId: agent.id,
          asset,
          paymentTxHash,
        }),
      });
      let json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        retry?: boolean;
        subscription?: { expiresAt?: string };
      };

      if (!res.ok && json.retry) {
        await new Promise((r) => setTimeout(r, 4000));
        res = await fetch("/api/agents/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: latest.address,
            agentId: agent.id,
            asset,
            paymentTxHash,
          }),
        });
        json = (await res.json()) as typeof json;
      }

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to activate subscription");
      }

      setStatus("success");
      onSubscribed(json.subscription?.expiresAt ?? new Date().toISOString());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  };

  if (!agent) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close paywall"
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="agent-paywall-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-purple/30 bg-deep/95 shadow-[0_0_50px_rgba(179,71,255,0.14)]"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-purple">
                Unlock Terminal Access
              </p>
              <h2
                id="agent-paywall-title"
                className="mt-1 font-display text-xl font-bold tracking-wide"
              >
                {agent.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Monthly clearance for live command, telemetry, and execution
                logs. Pay in USDC or save with $NOVA.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAsset("USDC")}
                  className={`rounded-xl border px-3 py-4 text-left transition ${
                    asset === "USDC"
                      ? "border-cyan/50 bg-cyan/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Standard
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-cyan">
                    {AGENT_SUBSCRIPTION_USDC} USDC
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted">/ month</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAsset("NOVA")}
                  className={`rounded-xl border px-3 py-4 text-left transition ${
                    asset === "NOVA"
                      ? "border-purple/50 bg-purple/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-purple">
                    Save {discountPct}%
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-purple">
                    {novaDiscounted.toLocaleString()} NOVA
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted line-through">
                    {novaFace.toLocaleString()} NOVA
                  </p>
                </button>
              </div>

              {error && (
                <p className="font-mono text-[11px] text-magenta">{error}</p>
              )}
              {status === "success" && (
                <p className="font-mono text-[11px] text-green">
                  Subscription active — opening terminal…
                </p>
              )}
              {status === "activating" && (
                <p className="font-mono text-[11px] text-cyan">
                  Confirming on-chain payment…
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <GlowButton
                  variant="purple"
                  fullWidth
                  onClick={() => void handlePay()}
                  className={busy ? "pointer-events-none opacity-50" : ""}
                >
                  {!walletAddress
                    ? "Connect Wallet"
                    : busy
                      ? "Processing…"
                      : asset === "USDC"
                        ? `Pay ${AGENT_SUBSCRIPTION_USDC} USDC`
                        : `Pay ${novaDiscounted.toLocaleString()} NOVA`}
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  fullWidth
                  onClick={onClose}
                  className={busy ? "pointer-events-none opacity-40" : ""}
                >
                  Not now
                </GlowButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
