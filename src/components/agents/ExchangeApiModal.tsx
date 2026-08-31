"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { GlowButton } from "@/components/ui/GlowButton";
import { EXCHANGE_CATALOG, getExchangeById } from "@/config/exchanges";
import { useWalletUI } from "@/providers/WalletUIProvider";

type Connection = {
  id: string;
  exchangeId: string;
  exchangeName: string;
  apiKeyHint: string;
  status: string;
  lastTestedAt: string | null;
};

type ExchangeApiModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ExchangeApiModal({ open, onClose }: ExchangeApiModalProps) {
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();

  const [exchangeId, setExchangeId] = useState(EXCHANGE_CATALOG[0]!.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const selectedExchange = getExchangeById(exchangeId) ?? EXCHANGE_CATALOG[0]!;

  const loadConnections = useCallback(async (address: string) => {
    try {
      const res = await fetch(
        `/api/exchanges/keys?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        connections?: Connection[];
      };
      if (res.ok) setConnections(json.connections ?? []);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setPickerOpen(false);
      return;
    }
    if (isLoggedIn && account.address) {
      void loadConnections(account.address);
    } else {
      setConnections([]);
    }
  }, [open, isLoggedIn, account.address, loadConnections]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const handleSave = async () => {
    if (!isLoggedIn || !account.address) {
      openConnect();
      return;
    }
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/exchanges/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          exchangeId,
          apiKey,
          apiSecret,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      setFlash("Connected — credentials encrypted and saved");
      setApiKey("");
      setApiSecret("");
      await loadConnections(account.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (connectionId: string) => {
    if (!account.address) return;
    setBusy(true);
    try {
      await fetch("/api/exchanges/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          connectionId,
        }),
      });
      await loadConnections(account.address);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close exchange settings"
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="exchange-api-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-purple/30 bg-deep/95 shadow-[0_0_48px_rgba(179,71,255,0.14)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-purple">
                  Exchange Integration
                </p>
                <h2
                  id="exchange-api-title"
                  className="mt-1 font-display text-lg font-semibold tracking-wide"
                >
                  API Settings
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-muted">
                  Connect a futures venue for agent execution. Keys are
                  encrypted at rest — secrets never leave the server in clear
                  text.
                </p>
              </div>
              <GlowButton
                variant="ghost"
                className="!px-3 !py-2 !text-xs"
                onClick={onClose}
              >
                Close
              </GlowButton>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div ref={pickerRef} className="relative block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Exchange
                </span>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((v) => !v)}
                  className="mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl border border-white/12 bg-void/70 px-3 py-2.5 text-left outline-none transition-colors hover:border-cyan/30 focus:border-cyan/40"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-semibold text-foreground">
                      {selectedExchange.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
                      {selectedExchange.blurb}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-cyan transition-transform ${
                      pickerOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>

                <AnimatePresence>
                  {pickerOpen && (
                    <motion.ul
                      role="listbox"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-cyan/25 bg-deep/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
                    >
                      {EXCHANGE_CATALOG.map((ex) => {
                        const active = ex.id === exchangeId;
                        return (
                          <li key={ex.id} role="option" aria-selected={active}>
                            <button
                              type="button"
                              onClick={() => {
                                setExchangeId(ex.id);
                                setPickerOpen(false);
                              }}
                              className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors ${
                                active
                                  ? "bg-cyan/15 text-cyan"
                                  : "text-foreground hover:bg-white/[0.05]"
                              }`}
                            >
                              <span className="font-display text-sm font-semibold">
                                {ex.name}
                              </span>
                              <span
                                className={`mt-0.5 font-mono text-[10px] ${
                                  active ? "text-cyan/80" : "text-muted"
                                }`}
                              >
                                {ex.blurb}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  API Key
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1.5 w-full rounded-xl border border-white/12 bg-void/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-cyan/40"
                />
              </label>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  API Secret
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type={showSecret ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="••••••••••••"
                    className="min-w-0 flex-1 rounded-xl border border-white/12 bg-void/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-cyan/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="shrink-0 rounded-xl border border-white/12 px-3 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-cyan"
                  >
                    {showSecret ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {error && (
                <p className="font-mono text-[11px] text-magenta">{error}</p>
              )}
              {flash && (
                <p className="font-mono text-[11px] text-green">{flash}</p>
              )}

              <GlowButton
                variant="purple"
                fullWidth
                onClick={() => void handleSave()}
                className={busy ? "pointer-events-none opacity-50" : ""}
              >
                {busy ? "Testing…" : "Save & Test Connection"}
              </GlowButton>

              <section>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Saved connections
                </h3>
                <div className="mt-2 space-y-2">
                  {connections.length === 0 && (
                    <p className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 font-mono text-[11px] text-muted">
                      No venues connected yet.
                    </p>
                  )}
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-void/40 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-display text-sm font-semibold">
                          {c.exchangeName}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">
                          {c.apiKeyHint} ·{" "}
                          <span className="text-green">
                            {c.status === "connected" ? "Connected" : c.status}
                          </span>
                        </p>
                      </div>
                      <GlowButton
                        variant="ghost"
                        className="!px-3 !py-1.5 !text-[10px]"
                        onClick={() => void handleRevoke(c.id)}
                      >
                        Revoke
                      </GlowButton>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
