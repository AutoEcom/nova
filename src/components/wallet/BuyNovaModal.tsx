"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { getAccount } from "@multiversx/sdk-dapp/out/methods/account/getAccount";
import { refreshAccount } from "@multiversx/sdk-dapp/out/utils/account/refreshAccount";
import {
  isTreasuryConfigured,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { createBuyNovaTransaction, type PaymentAsset } from "@/lib/mx/createBuyTransaction";
import { formatAddress, formatTokenAmount } from "@/lib/mx/format";
import { fetchWalletTokenBalances } from "@/lib/mx/fetchBalances";
import { signAndSendTransactions } from "@/lib/mx/signAndSendTransactions";
import { useWalletUI } from "@/providers/WalletUIProvider";
import { useMxReady } from "@/providers/MultiversXProvider";
import { GlowButton } from "@/components/ui/GlowButton";

const QUICK_AMOUNTS = ["0.1", "0.5", "1", "5"];

export function BuyNovaModal() {
  const { isBuyOpen, closeBuyModal, openConnect } = useWalletUI();
  // Re-render (and rebind wallet hooks to the real store) once the SDK is ready.
  useMxReady();
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();

  const [asset, setAsset] = useState<PaymentAsset>("EGLD");
  const [amount, setAmount] = useState("1");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [status, setStatus] = useState<"idle" | "signing" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBuyOpen || !account.address) return;
    let cancelled = false;
    void (async () => {
      const { usdc } = await fetchWalletTokenBalances(account.address);
      if (!cancelled) {
        setUsdcBalance(formatTokenAmount(usdc.balance, usdc.decimals, 4));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBuyOpen, account.address]);

  useEffect(() => {
    if (!isBuyOpen) {
      setStatus("idle");
      setError(null);
    }
  }, [isBuyOpen]);

  useEffect(() => {
    if (!isBuyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBuyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBuyOpen, closeBuyModal]);

  const handleBuy = useCallback(async () => {
    setError(null);

    if (!isLoggedIn || !account.address) {
      openConnect();
      return;
    }

    if (!isTreasuryConfigured()) {
      setError(
        "Treasury address not configured. Set NEXT_PUBLIC_TREASURY_ADDRESS in .env.local",
      );
      setStatus("error");
      return;
    }

    try {
      setStatus("signing");
      await refreshAccount();
      const latest = getAccount();
      if (!latest.address) {
        throw new Error("Wallet address unavailable after refresh");
      }
      const tx = await createBuyNovaTransaction({
        senderAddress: latest.address,
        amount,
        asset,
        nonce: latest.nonce,
      });

      await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: `Sending ${asset} for $NOVA…`,
          successMessage: "Payment sent to NOVA treasury",
          errorMessage: "Purchase transaction failed",
        },
      });

      setStatus("success");
    } catch (err) {
      console.error("[NOVA] Buy transaction failed", err);
      const message =
        err instanceof Error ? err.message : "Transaction was rejected or failed";
      setError(message);
      setStatus("error");
    }
  }, [account.address, amount, asset, isLoggedIn, openConnect]);

  return (
    <AnimatePresence>
      {isBuyOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close buy modal"
            className="absolute inset-0 bg-void/75 backdrop-blur-sm"
            onClick={closeBuyModal}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="buy-nova-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong relative z-10 w-full max-w-md rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_0_60px_rgba(0,240,255,0.12)] sm:rounded-3xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
                  Acquire · {NOVA_TOKEN_ID}
                </p>
                <h2
                  id="buy-nova-title"
                  className="mt-1 font-display text-xl font-bold tracking-wide text-glow-cyan"
                >
                  Buy $NOVA
                </h2>
              </div>
              <button
                type="button"
                onClick={closeBuyModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-muted hover:text-foreground touch-manipulation"
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-muted">
              Pay with EGLD or USDC. Funds transfer to the NOVA treasury for{" "}
              <span className="font-mono text-cyan">{NOVA_TOKEN_ID}</span>.
            </p>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["EGLD", "USDC"] as PaymentAsset[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAsset(option)}
                  className={`rounded-xl border px-3 py-3 font-display text-sm font-semibold tracking-wide transition-all touch-manipulation ${
                    asset === option
                      ? option === "EGLD"
                        ? "border-cyan/50 bg-cyan/15 text-cyan btn-glow-cyan"
                        : "border-purple/50 bg-purple/15 text-purple btn-glow-purple"
                      : "border-white/10 bg-white/5 text-muted hover:border-white/20"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
              Amount ({asset})
            </label>
            <div className="mb-3 flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-cyan/20 bg-void/60 px-4 py-3 font-mono text-base text-foreground outline-none ring-cyan/30 placeholder:text-muted focus:border-cyan/50 focus:ring-2"
                placeholder="0.00"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-muted hover:border-cyan/30 hover:text-cyan touch-manipulation"
                >
                  {q} {asset}
                </button>
              ))}
            </div>

            <div className="mb-5 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 font-mono text-[11px] text-muted">
              <p>
                Wallet:{" "}
                <span className="text-foreground">
                  {account.address
                    ? formatAddress(account.address)
                    : "Not connected"}
                </span>
              </p>
              <p>
                Available:{" "}
                <span className="text-cyan">
                  {asset === "EGLD"
                    ? `${formatTokenAmount(account.balance || "0", 18, 4)} EGLD`
                    : `${usdcBalance} USDC`}
                </span>
              </p>
              <p>
                Treasury:{" "}
                <span className="text-purple">{formatAddress(TREASURY_ADDRESS)}</span>
              </p>
              <p>
                Pay with:{" "}
                <span className="text-foreground">
                  {asset === "USDC" ? USDC_TOKEN_ID : "EGLD"}
                </span>
              </p>
            </div>

            {error && (
              <p className="mb-3 rounded-xl border border-magenta/30 bg-magenta/10 px-3 py-2 font-mono text-[11px] text-magenta">
                {error}
              </p>
            )}

            {status === "success" && (
              <p className="mb-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2 font-mono text-[11px] text-green">
                Transaction submitted. Track status in your wallet notifications.
              </p>
            )}

            <GlowButton
              variant="cyan"
              fullWidth
              onClick={handleBuy}
              className={status === "signing" ? "opacity-70 pointer-events-none" : ""}
            >
              {!isLoggedIn
                ? "Connect to Buy"
                : status === "signing"
                  ? "Confirm in Wallet…"
                  : `Pay ${amount || "0"} ${asset}`}
            </GlowButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
