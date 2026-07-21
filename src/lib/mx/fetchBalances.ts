import { API_URL, NOVA_TOKEN_ID, USDC_TOKEN_ID } from "@/config/network";

type TokenResponse = {
  balance?: string;
  decimals?: number;
};

async function fetchTokenBalance(
  address: string,
  tokenId: string,
): Promise<{ balance: string; decimals: number }> {
  try {
    const res = await fetch(
      `${API_URL}/accounts/${address}/tokens/${tokenId}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return { balance: "0", decimals: tokenId === USDC_TOKEN_ID ? 6 : 18 };
    }
    const data = (await res.json()) as TokenResponse;
    return {
      balance: data.balance ?? "0",
      decimals: data.decimals ?? (tokenId === USDC_TOKEN_ID ? 6 : 18),
    };
  } catch {
    return { balance: "0", decimals: tokenId === USDC_TOKEN_ID ? 6 : 18 };
  }
}

export async function fetchWalletTokenBalances(address: string) {
  const [usdc, nova] = await Promise.all([
    fetchTokenBalance(address, USDC_TOKEN_ID),
    fetchTokenBalance(address, NOVA_TOKEN_ID),
  ]);
  return { usdc, nova };
}
