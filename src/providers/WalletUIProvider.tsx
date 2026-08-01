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
import { WalletConnectStateManager } from "@multiversx/sdk-dapp/out/managers/internal/WalletConnectStateManager";
import { useMxReady } from "./MultiversXProvider";

type OpenConnectOptions = {
  /** Re-open the Buy modal after a successful wallet login. */
  resumeBuy?: boolean;
};

type WalletUIContextValue = {
  isBuyOpen: boolean;
  openBuyModal: () => void;
  closeBuyModal: () => void;
  openConnect: (options?: OpenConnectOptions) => void;
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

/** Coarse mobile/tablet detection used to pick deep-link vs QR login flow. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /android|iphone|ipad|ipod|iemobile|blackberry|opera mini|mobile/i.test(
    ua,
  );
}

/**
 * Opens the xPortal universal/deep link so the mobile app launches directly.
 * The link (a Firebase dynamic link wrapping the WalletConnect pairing URI) is
 * produced by sdk-dapp during provider init and stored on the shared
 * WalletConnectStateManager. Navigation is preferred over `window.open` because
 * mobile browsers block popups opened after an `await`.
 */
function openXPortalDeepLink() {
  try {
    const { walletConnectDeepLink } =
      WalletConnectStateManager.getInstance().walletConnectData;
    if (!walletConnectDeepLink) return;
    const opened = window.open(walletConnectDeepLink, "_blank");
    if (!opened) window.location.href = walletConnectDeepLink;
  } catch (err) {
    console.warn("[NOVA] Unable to open xPortal deep link", err);
  }
}

export function WalletUIProvider({ children }: { children: ReactNode }) {
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const openBuyAfterLoginRef = useRef(false);
  const { ready } = useMxReady();

  const finishLogin = useCallback(() => {
    if (openBuyAfterLoginRef.current) {
      setIsBuyOpen(true);
      openBuyAfterLoginRef.current = false;
    }
  }, []);

  const openUnlockPanel = useCallback(() => {
    if (!ready) return;

    // On DESKTOP we use a zero-argument handler.
    //
    // sdk-dapp inspects the handler's arity (`fn.length`). A zero-arg callback
    // is treated as a "simple" handler: sdk-dapp performs
    // `ProviderFactory.create()` + `await provider.login()` itself and keeps the
    // unlock panel mounted — so the xPortal QR stays open until the user scans,
    // completes or cancels. It only runs this callback (and then closes) AFTER
    // login resolves.
    const desktopLoginHandler = () => {
      finishLogin();
    };

    // On MOBILE a scannable QR is useless (one phone can't scan itself), so we
    // opt into the "advanced" handler (arity > 0): sdk-dapp hands us the chosen
    // provider `type`/`anchor` and closes the panel immediately. We create the
    // provider ourselves — which makes sdk-dapp populate the WalletConnect deep
    // link — then launch the xPortal app via that universal link before
    // awaiting login. Non-WC providers (Web Wallet, Passkey, Ledger) just run
    // their normal create + login flow.
    const mobileLoginHandler = async ({ type, anchor }: IProviderFactory) => {
      try {
        const provider = await ProviderFactory.create({ type, anchor });
        if (!provider) throw new Error(`Unable to create provider "${type}".`);

        if (type === ProviderTypeEnum.walletConnect) {
          openXPortalDeepLink();
        }

        await provider.login();
        finishLogin();
      } catch (err) {
        console.warn(`[NOVA] Mobile login (${type}) did not complete`, err);
        openBuyAfterLoginRef.current = false;
      }
    };

    const unlockPanelManager = UnlockPanelManager.init({
      loginHandler: isMobileDevice() ? mobileLoginHandler : desktopLoginHandler,
      onClose: async () => {
        openBuyAfterLoginRef.current = false;
      },
      allowedProviders: ALLOWED_PROVIDERS,
    });
    unlockPanelManager.openUnlockPanel();
  }, [ready, finishLogin]);

  const openConnect = useCallback(
    (options?: OpenConnectOptions) => {
      // Always dismiss Buy first — the MultiversX unlock panel shares the same
      // overlay stack and would otherwise render underneath the purchase dialog.
      setIsBuyOpen(false);
      openBuyAfterLoginRef.current = Boolean(options?.resumeBuy);
      openUnlockPanel();
    },
    [openUnlockPanel],
  );

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
