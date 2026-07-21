"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { mxInitConfig } from "@/config/mxInit";
import { initAppSingleton } from "@/lib/mx/initAppSingleton";
import { WalletUIProvider } from "./WalletUIProvider";
import { BuyNovaModal } from "@/components/wallet/BuyNovaModal";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";

type MxReadyState = {
  /** True once the sdk-dapp store + providers are initialized */
  ready: boolean;
  error: string | null;
};

const MxReadyContext = createContext<MxReadyState>({
  ready: false,
  error: null,
});

export const useMxReady = () => useContext(MxReadyContext);

/** Shared across StrictMode double-invokes / remounts */
let bootPromise: Promise<void> | null = null;

export function MultiversXProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!bootPromise) {
      bootPromise = initAppSingleton(mxInitConfig);
    }

    bootPromise
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.error("[NOVA] MultiversX init failed", err);
        // Allow retry on a later mount
        bootPromise = null;
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Wallet SDK failed to initialize",
          );
          // Never trap the UI: wallet features stay disabled, page still works.
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MxReadyContext.Provider value={{ ready, error }}>
      <WalletUIProvider>
        {children}
        <ClientErrorBoundary label="BuyNovaModal">
          <BuyNovaModal />
        </ClientErrorBoundary>
        {error && (
          <div className="fixed bottom-24 left-3 right-3 z-[45] rounded-xl border border-magenta/40 bg-void/90 px-4 py-2 text-center font-mono text-[11px] text-magenta backdrop-blur sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-md">
            Wallet SDK warning: {error}
          </div>
        )}
      </WalletUIProvider>
    </MxReadyContext.Provider>
  );
}
