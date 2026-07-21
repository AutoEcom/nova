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
import { ProviderFactory } from "@multiversx/sdk-dapp/out/providers/ProviderFactory";
import { ProviderTypeEnum } from "@multiversx/sdk-dapp/out/providers/types/providerFactory.types";
import type { IProviderFactory } from "@multiversx/sdk-dapp/out/providers/types/providerFactory.types";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
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
  const isLoggedIn = useGetIsLoggedIn();

  const openUnlockPanel = useCallback(() => {
    if (!ready) return;

    const unlockPanelManager = UnlockPanelManager.init({
      // Advanced handler: we own provider creation + login so a missing
      // provider (e.g. extension not installed) fails gracefully instead of
      // crashing the panel. `ProviderFactory.create` awaits the provider's
      // async `init()` before we call `login()`.
      loginHandler: async ({ type, anchor }: IProviderFactory) => {
        try {
          const provider = await ProviderFactory.create({ type, anchor });
          if (!provider) {
            throw new Error(`Unable to create provider "${type}"`);
          }
          await provider.login();

          if (openBuyAfterLoginRef.current) {
            setIsBuyOpen(true);
            openBuyAfterLoginRef.current = false;
          }
        } catch (err) {
          // Keep the unlock panel and all its options intact.
          console.warn(`[NOVA] Login with "${type}" failed`, err);
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
    if (!isLoggedIn) {
      openBuyAfterLoginRef.current = true;
      openUnlockPanel();
      return;
    }
    setIsBuyOpen(true);
  }, [isLoggedIn, openUnlockPanel]);

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
