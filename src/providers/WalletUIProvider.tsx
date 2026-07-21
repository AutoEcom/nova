"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { UnlockPanelManager } from "@multiversx/sdk-dapp/out/managers/UnlockPanelManager";
import { ProviderTypeEnum } from "@multiversx/sdk-dapp/out/providers/types/providerFactory.types";
import { useMxReady } from "./MultiversXProvider";

type WalletUIContextValue = {
  isBuyOpen: boolean;
  openBuyModal: () => void;
  closeBuyModal: () => void;
  openConnect: () => void;
};

const WalletUIContext = createContext<WalletUIContextValue | null>(null);

/**
 * Full standard MultiversX login line-up — always shown so options never
 * disappear. Availability of a specific wallet (e.g. the browser extension) is
 * handled at login time, not by hiding the option.
 */
const ALLOWED_PROVIDERS: string[] = [
  ProviderTypeEnum.extension, // MultiversX DeFi Wallet (browser extension)
  ProviderTypeEnum.walletConnect, // xPortal
  ProviderTypeEnum.crossWindow, // Web Wallet
  ProviderTypeEnum.ledger, // Ledger
  ProviderTypeEnum.passkey, // Passkey
];

export function WalletUIProvider({ children }: { children: ReactNode }) {
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const openBuyAfterLoginRef = useRef(false);
  const { ready } = useMxReady();

  const openUnlockPanel = useCallback(() => {
    if (!ready) return;

    const unlockPanelManager = UnlockPanelManager.init({
      // IMPORTANT: this MUST be a zero-argument callback.
      //
      // sdk-dapp inspects the handler's arity (`fn.length`). A zero-arg
      // callback is treated as a "simple" handler: sdk-dapp performs
      // `ProviderFactory.create()` + `await provider.login()` itself and keeps
      // the unlock panel mounted — so QR flows (xPortal / WalletConnect) stay
      // open until the user completes or cancels. It only runs this callback
      // (and then closes) AFTER login resolves.
      //
      // A handler that declares args (e.g. `({ type, anchor }) => …`) is
      // treated as "advanced": sdk-dapp calls it WITHOUT awaiting and closes
      // the panel immediately, which tears the QR down the instant it appears.
      // Provider errors (extension missing, user cancel) are caught internally
      // by sdk-dapp and surfaced as a cancel, so options never disappear.
      loginHandler: () => {
        if (openBuyAfterLoginRef.current) {
          setIsBuyOpen(true);
          openBuyAfterLoginRef.current = false;
        }
      },
      onClose: async () => {
        openBuyAfterLoginRef.current = false;
      },
      allowedProviders: ALLOWED_PROVIDERS,
    });
    unlockPanelManager.openUnlockPanel();
  }, [ready]);

  const openConnect = useCallback(() => {
    openBuyAfterLoginRef.current = false;
    openUnlockPanel();
  }, [openUnlockPanel]);

  const openBuyModal = useCallback(() => {
    // Open the calculator immediately (even when not connected). The modal's
    // pay action handles connecting the wallet when the user commits, so
    // pricing is always visible up-front.
    setIsBuyOpen(true);
  }, []);

  const closeBuyModal = useCallback(() => setIsBuyOpen(false), []);

  const value = useMemo(
    () => ({
      isBuyOpen,
      openBuyModal,
      closeBuyModal,
      openConnect,
    }),
    [isBuyOpen, openBuyModal, closeBuyModal, openConnect],
  );

  return (
    <WalletUIContext.Provider value={value}>
      {children}
    </WalletUIContext.Provider>
  );
}

export function useWalletUI() {
  const ctx = useContext(WalletUIContext);
  if (!ctx) {
    throw new Error("useWalletUI must be used within WalletUIProvider");
  }
  return ctx;
}
