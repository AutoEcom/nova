"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { GlowButton } from "@/components/ui/GlowButton";
import { useWalletUI } from "@/providers/WalletUIProvider";
import { EXPLORER_URL } from "@/config/network";

type ActiveRow = {
  id?: string;
  agentId: string;
  agentName: string;
  status: string;
  paymentAsset: string;
  daysRemaining: number | null;
  autoRenew?: boolean;
  complimentary?: boolean;
  expiresAt?: string;
};

type HistoryRow = {
  id: string;
  agentName: string;
  date: string;
  amount: string;
  asset: string;
  status: string;
  txHash: string | null;
};

export function BillingPanel() {
  const { isBillingOpen, closeBillingModal, openConnect } = useWalletUI();
  const router = useRouter();
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/agents/billing?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        active?: ActiveRow[];
        history?: HistoryRow[];
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load billing");
      setActive(json.active ?? []);
      setHistory(json.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBillingOpen) return;
    if (isLoggedIn && account.address) {
      void load(account.address);
    } else {
      setActive([]);
      setHistory([]);
    }
  }, [isBillingOpen, isLoggedIn, account.address, load]);

  useEffect(() => {
    if (!isBillingOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isBillingOpen]);

  const toggleAutoRenew = async (row: ActiveRow) => {
    if (!account.address || !row.id || row.complimentary) return;
    setBusyId(row.id);
    try {
      const res = await fetch("/api/agents/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          subscriptionId: row.id,
          autoRenew: !row.autoRenew,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AnimatePresence>
      {isBillingOpen && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close billing"
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={closeBillingModal}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="billing-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan/25 bg-deep/95 shadow-[0_0_50px_rgba(0,240,255,0.12)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
                  Account
                </p>
                <h2
                  id="billing-title"
                  className="mt-1 font-display text-lg font-semibold tracking-wide"
                >
                  Billing & Subscriptions
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted">
                  Manage agent clearances, auto-renewal, and payment history.
                </p>
              </div>
              <GlowButton
                variant="ghost"
                className="!px-3 !py-2 !text-xs"
                onClick={closeBillingModal}
              >
                Close
              </GlowButton>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {!isLoggedIn ? (
                <div className="rounded-xl border border-white/10 bg-void/50 px-4 py-6 text-center">
                  <p className="text-sm text-muted">
                    Connect a wallet to view subscriptions.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <GlowButton variant="cyan" onClick={openConnect}>
                      Connect Wallet
                    </GlowButton>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <p className="font-mono text-[11px] text-magenta">{error}</p>
                  )}
                  {loading && (
                    <p className="font-mono text-[11px] text-muted">
                      Loading billing…
                    </p>
                  )}

                  <section>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      Active subscriptions
                    </h3>
                    <div className="mt-3 space-y-2">
                      {active.length === 0 && !loading && (
                        <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4 text-sm text-muted">
                          No paid clearances yet. Launch an agent to subscribe.
                        </p>
                      )}
                      {active.map((row) => (
                        <div
                          key={`${row.agentId}-${row.id ?? "free"}`}
                          className="rounded-xl border border-white/10 bg-void/45 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-display text-sm font-semibold">
                                {row.agentName}
                              </p>
                              <p className="mt-1 font-mono text-[11px] text-muted">
                                {row.complimentary
                                  ? "Complimentary · always on"
                                  : `${row.daysRemaining ?? 0} days remaining`}
                                {" · "}
                                {row.paymentAsset}
                              </p>
                              {!row.complimentary && (
                                <p className="mt-1 font-mono text-[10px] text-muted">
                                  Auto-renew:{" "}
                                  <span
                                    className={
                                      row.autoRenew ? "text-green" : "text-magenta"
                                    }
                                  >
                                    {row.autoRenew ? "On" : "Off"}
                                  </span>
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!row.complimentary && row.id && (
                                <GlowButton
                                  variant="ghost"
                                  className="!px-3 !py-2 !text-[11px]"
                                  onClick={() => void toggleAutoRenew(row)}
                                >
                                  {busyId === row.id
                                    ? "…"
                                    : row.autoRenew
                                      ? "Disable renew"
                                      : "Enable renew"}
                                </GlowButton>
                              )}
                              {!row.complimentary && (
                                <GlowButton
                                  variant="cyan"
                                  className="!px-3 !py-2 !text-[11px]"
                                  onClick={() => {
                                    closeBillingModal();
                                    router.push("/dashboard/agents");
                                  }}
                                >
                                  Renew / Change
                                </GlowButton>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      Transaction history
                    </h3>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full min-w-[520px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-white/8 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                            <th className="px-3 py-2.5 font-medium">Date</th>
                            <th className="px-3 py-2.5 font-medium">Agent</th>
                            <th className="px-3 py-2.5 font-medium">Amount</th>
                            <th className="px-3 py-2.5 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 font-mono text-[11px] text-muted"
                              >
                                No payments recorded yet.
                              </td>
                            </tr>
                          )}
                          {history.map((h) => (
                            <tr
                              key={h.id}
                              className="border-b border-white/[0.04] font-mono text-[11px] last:border-b-0"
                            >
                              <td className="px-3 py-2.5 text-muted">
                                {new Date(h.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2.5 text-foreground">
                                {h.agentName}
                              </td>
                              <td className="px-3 py-2.5 text-cyan">
                                {h.amount} {h.asset}
                                {h.txHash && (
                                  <>
                                    {" · "}
                                    <a
                                      href={`${EXPLORER_URL}/transactions/${h.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted underline-offset-2 hover:text-cyan hover:underline"
                                    >
                                      tx
                                    </a>
                                  </>
                                )}
                              </td>
                              <td className="px-3 py-2.5 capitalize text-muted">
                                {h.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
