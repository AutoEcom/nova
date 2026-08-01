"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { getAccount } from "@multiversx/sdk-dapp/out/methods/account/getAccount";
import { refreshAccount } from "@multiversx/sdk-dapp/out/utils/account/refreshAccount";
import {
  EGLD_DECIMALS,
  FALLBACK_EGLD_PRICE_USD,
  isTreasuryConfigured,
  MIN_PURCHASE_USDC,
  NOVA_PRICE_IN_USDC,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
  USDC_PRESETS,
  USDC_TOKEN_ID,
} from "@/config/network";
import {
  createBuyNovaTransaction,
  type PaymentAsset,
} from "@/lib/mx/createBuyTransaction";
import {
  fetchEgldPriceUsd,
  meetsMinimum,
  minAmountFor,
  novaForUsdcValue,
  usdcValueOf,
} from "@/lib/mx/pricing";
import { formatAddress, formatTokenAmount } from "@/lib/mx/format";
import { fetchWalletTokenBalances } from "@/lib/mx/fetchBalances";
import { signAndSendTransactions } from "@/lib/mx/signAndSendTransactions";
import { useWalletUI } from "@/providers/WalletUIProvider";
import { useMxReady } from "@/providers/MultiversXProvider";
import { GlowButton } from "@/components/ui/GlowButton";

const novaFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/** Trim a float to `digits` decimals without trailing zeros. */
function trimNumber(value: number, digits = 6): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

/**
 * Round UP to `digits` decimals (then strip trailing zeros).
 * Used for EGLD amounts derived from a USDC floor so display rounding never
 * drops the payment below the $5 minimum.
 */
function ceilTrimNumber(value: number, digits = 6): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const factor = 10 ** digits;
  const ceiled = Math.ceil(value * factor - 1e-12) / factor;
  return trimNumber(ceiled, digits);
}

export function BuyNovaModal() {
  const { isBuyOpen, closeBuyModal, openConnect } = useWalletUI();
  // Re-render (and rebind wallet hooks to the real store) once the SDK is ready.
  useMxReady();
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();

  const [asset, setAsset] = useState<PaymentAsset>("USDC");
  const [amount, setAmount] = useState(String(USDC_PRESETS[0]));
  const [egldPrice, setEgldPrice] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [status, setStatus] = useState<
    "idle" | "signing" | "delivering" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [fulfillTxHash, setFulfillTxHash] = useState<string | null>(null);

  const price = egldPrice ?? FALLBACK_EGLD_PRICE_USD;

  // ---- Derived pricing (real-time calculator) -----------------------------
  const amountNum = Number(amount);
  const usdcValue = useMemo(
    () => usdcValueOf(amountNum, asset, price),
    [amountNum, asset, price],
  );
  const novaOut = useMemo(() => novaForUsdcValue(usdcValue), [usdcValue]);
  const minAmount = useMemo(() => minAmountFor(asset, price), [asset, price]);
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const belowMinimum = hasAmount && !meetsMinimum(amountNum, asset, price);
  const canSubmit =
    hasAmount &&
    !belowMinimum &&
    status !== "signing" &&
    status !== "delivering";

  const presets = useMemo(() => {
    if (asset === "USDC") {
      return USDC_PRESETS.map((usd) => ({
        value: String(usd),
        label: String(usd),
        usd,
      }));
    }
    return USDC_PRESETS.map((usd) => {
      const egld = price > 0 ? usd / price : 0;
      // Ceil so 5 USDC → EGLD presets always clear meetsMinimum after rounding.
      const value = ceilTrimNumber(egld, 6);
      return { value, label: trimNumber(Number(value), 4), usd };
    });
  }, [asset, price]);

  // ---- Effects ------------------------------------------------------------
  useEffect(() => {
    if (!isBuyOpen) return;
    setAsset("USDC");
    setAmount(String(USDC_PRESETS[0]));
    setStatus("idle");
    setError(null);
    setFulfillTxHash(null);
    let cancelled = false;
    void (async () => {
      const p = await fetchEgldPriceUsd();
      if (!cancelled) setEgldPrice(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [isBuyOpen]);

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
    if (!isBuyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBuyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBuyOpen, closeBuyModal]);

  // ---- Handlers -----------------------------------------------------------
  /** Switch payment asset while preserving the equivalent purchase value. */
  const changeAsset = useCallback(
    (next: PaymentAsset) => {
      if (next === asset) return;
      const currentValue = usdcValueOf(
        Number.isFinite(amountNum) ? amountNum : 0,
        asset,
        price,
      );
      if (currentValue > 0) {
        if (next === "USDC") {
          setAmount(trimNumber(currentValue, 2));
        } else {
          // Ceil EGLD so a $5 USDC selection doesn't land microscopically under min.
          setAmount(ceilTrimNumber(currentValue / price, 6));
        }
      }
      setAsset(next);
    },
    [asset, amountNum, price],
  );

  const handleBuy = useCallback(async () => {
    setError(null);

    if (!isLoggedIn || !account.address) {
      openConnect();
      return;
    }

    if (!hasAmount) {
      setError("Enter an amount to continue");
      setStatus("error");
      return;
    }

    if (belowMinimum) {
      setError(
        `Minimum purchase is ${MIN_PURCHASE_USDC} USDC` +
          (asset === "EGLD"
            ? ` (≈ ${trimNumber(minAmount, 6)} EGLD)`
            : ""),
      );
      setStatus("error");
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
        egldPriceUsd: price,
        nonce: latest.nonce,
      });

      const { sentTransactions } = await signAndSendTransactions({
        transactions: [tx],
        transactionsDisplayInfo: {
          processingMessage: `Sending ${asset} for $NOVA…`,
          successMessage: "Payment sent — delivering $NOVA…",
          errorMessage: "Purchase transaction failed",
        },
      });

      const paymentTxHash = Array.isArray(sentTransactions[0])
        ? sentTransactions[0][0]?.hash
        : sentTransactions[0]?.hash;

      if (!paymentTxHash) {
        throw new Error("Payment broadcast succeeded but tx hash is missing");
      }

      // Server verifies the payment on-chain and sends $NOVA from the treasury.
      setStatus("delivering");
      const fulfillRes = await fetch("/api/nova/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentTxHash }),
      });
      const fulfillJson = (await fulfillRes.json()) as {
        ok?: boolean;
        error?: string;
        fulfillTxHash?: string;
        alreadyFulfilled?: boolean;
        code?: string;
      };

      if (!fulfillRes.ok) {
        throw new Error(
          fulfillJson.error ??
            "Payment received, but automatic $NOVA delivery failed. Contact support with your payment tx hash.",
        );
      }

      setFulfillTxHash(fulfillJson.fulfillTxHash ?? null);
      setStatus("success");
    } catch (err) {
      console.error("[NOVA] Buy transaction failed", err);
      const message =
        err instanceof Error ? err.message : "Transaction was rejected or failed";
      setError(message);
      setStatus("error");
    }
  }, [
    account.address,
    amount,
    asset,
    belowMinimum,
    hasAmount,
    isLoggedIn,
    minAmount,
    openConnect,
    price,
  ]);

  const payLabel = !isLoggedIn
    ? "Connect to Buy"
    : status === "signing"
      ? "Confirm in Wallet…"
      : status === "delivering"
        ? "Delivering $NOVA…"
        : belowMinimum
          ? asset === "EGLD"
            ? `Minimum ≈ ${trimNumber(minAmount, 6)} EGLD`
            : `Minimum ${MIN_PURCHASE_USDC} USDC`
          : `Buy ≈ ${novaFmt.format(novaOut)} NOVA`;

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
              Fixed rate:{" "}
              <span className="font-mono text-cyan">
                1 NOVA = {NOVA_PRICE_IN_USDC} USDC
              </span>
              . Pay with EGLD or USDC — funds route to the NOVA treasury.
            </p>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["USDC", "EGLD"] as PaymentAsset[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeAsset(option)}
                  className={`rounded-xl border px-3 py-3 font-display text-sm font-semibold tracking-wide transition-all touch-manipulation ${
                    asset === option
                      ? option === "EGLD"
                        ? "border-purple/50 bg-purple/15 text-purple btn-glow-purple"
                        : "border-cyan/50 bg-cyan/15 text-cyan btn-glow-cyan"
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
                className={`w-full rounded-xl border bg-void/60 px-4 py-3 font-mono text-base text-foreground outline-none ring-cyan/30 placeholder:text-muted focus:ring-2 ${
                  belowMinimum
                    ? "border-magenta/50 focus:border-magenta/60"
                    : "border-cyan/20 focus:border-cyan/50"
                }`}
                placeholder="0.00"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.usd}
                  type="button"
                  onClick={() => setAmount(preset.value)}
                  className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left font-mono text-[11px] text-muted hover:border-cyan/30 hover:text-cyan touch-manipulation"
                >
                  <span className="text-foreground">
                    {preset.label} {asset}
                  </span>
                  {asset === "EGLD" && (
                    <span className="text-[9px] text-muted">
                      ≈ ${preset.usd}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Real-time calculator */}
            <div className="mb-4 rounded-2xl border border-cyan/20 bg-cyan/[0.04] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  You receive
                </span>
                <span className="font-mono text-[10px] text-muted">
                  ≈ {usdFmt.format(usdcValue)}
                </span>
              </div>
              <p className="mt-1 font-display text-2xl font-bold tracking-wide text-glow-cyan">
                {novaFmt.format(novaOut)}{" "}
                <span className="text-base text-cyan">$NOVA</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted">
                <span>1 NOVA = {NOVA_PRICE_IN_USDC} USDC</span>
                {asset === "EGLD" && (
                  <span className="text-purple">
                    EGLD ≈ {usdFmt.format(price)}
                    {egldPrice === null ? " (est.)" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 font-mono text-[11px] text-muted">
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
                    ? `${formatTokenAmount(account.balance || "0", EGLD_DECIMALS, 4)} EGLD`
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
                  {asset === "USDC" ? USDC_TOKEN_ID : "EGLD (native)"}
                </span>
              </p>
            </div>

            {belowMinimum && (
              <p className="mb-3 rounded-xl border border-magenta/30 bg-magenta/10 px-3 py-2 font-mono text-[11px] text-magenta">
                Minimum purchase is {MIN_PURCHASE_USDC} USDC
                {asset === "EGLD" ? ` (≈ ${trimNumber(minAmount, 6)} EGLD)` : ""}.
              </p>
            )}

            {error && !belowMinimum && (
              <p className="mb-3 rounded-xl border border-magenta/30 bg-magenta/10 px-3 py-2 font-mono text-[11px] text-magenta">
                {error}
              </p>
            )}

            {status === "delivering" && (
              <p className="mb-3 rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-2 font-mono text-[11px] text-cyan">
                Payment confirmed. Sending $NOVA from the treasury to your wallet…
              </p>
            )}

            {status === "success" && (
              <p className="mb-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2 font-mono text-[11px] text-green">
                $NOVA delivered to your wallet.
                {fulfillTxHash
                  ? ` Delivery tx: ${fulfillTxHash.slice(0, 10)}…`
                  : ""}
              </p>
            )}

            <GlowButton
              variant="cyan"
              fullWidth
              onClick={handleBuy}
              className={
                isLoggedIn && !canSubmit ? "opacity-60 pointer-events-none" : ""
              }
            >
              {payLabel}
            </GlowButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
