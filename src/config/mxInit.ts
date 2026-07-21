import type { InitAppType } from "@multiversx/sdk-dapp/out/methods/initApp/initApp.types";
import { ThemesEnum } from "@multiversx/sdk-dapp/out/types/theme.types";
import {
  ENVIRONMENT,
  WALLET_CONNECT_PROJECT_ID,
} from "@/config/network";

const DEFAULT_TOAST_LIFETIME = 5000;

export const mxInitConfig: InitAppType = {
  storage: {
    getStorageCallback: () =>
      typeof window !== "undefined" ? sessionStorage : ({} as Storage),
  },
  dAppConfig: {
    nativeAuth: true,
    environment: ENVIRONMENT,
    providers: {
      walletConnect: {
        walletConnectV2ProjectId: WALLET_CONNECT_PROJECT_ID,
      },
    },
    transactionTracking: {
      successfulToastLifetime: DEFAULT_TOAST_LIFETIME,
    },
    theme: ThemesEnum.dark,
  },
};
