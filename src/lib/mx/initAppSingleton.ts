import type { InitAppType } from "@multiversx/sdk-dapp/out/methods/initApp/initApp.types";
import { initApp } from "@multiversx/sdk-dapp/out/methods/initApp/initApp";

let initialized = false;

export async function initAppSingleton(config: InitAppType) {
  if (initialized) return;
  await initApp(config);
  initialized = true;
}
