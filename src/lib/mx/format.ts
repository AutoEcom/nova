export function formatAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatTokenAmount(
  raw: string | number | bigint,
  decimals: number,
  displayDigits = 4,
): string {
  try {
    const value = BigInt(raw.toString());
    const base = BigInt(10) ** BigInt(decimals);
    const whole = value / base;
    const fraction = value % base;
    const fractionStr = fraction
      .toString()
      .padStart(decimals, "0")
      .slice(0, displayDigits)
      .replace(/0+$/, "");
    return fractionStr.length > 0
      ? `${whole.toString()}.${fractionStr}`
      : whole.toString();
  } catch {
    return "0";
  }
}

export function parseAmountToAtomic(
  amount: string,
  decimals: number,
): bigint {
  const trimmed = amount.trim();
  if (!trimmed || Number.isNaN(Number(trimmed))) {
    throw new Error("Enter a valid amount");
  }
  if (Number(trimmed) <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  if (fractionPart.length > decimals) {
    throw new Error(`Maximum ${decimals} decimal places allowed`);
  }

  const paddedFraction = fractionPart.padEnd(decimals, "0");
  const atomic = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return BigInt(atomic || "0");
}
