"use client";

import Image from "next/image";

type MarkProps = {
  className?: string;
  size?: number;
};

/** Official Binance logo (Wikimedia Commons: Binance_Logo.svg). */
export function BinanceMark({ className = "", size = 32 }: MarkProps) {
  return (
    <Image
      src="/exchanges/binance.svg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      aria-hidden
    />
  );
}

/** Official OKX logo (Wikimedia Commons: OKX_Logo.svg). */
export function OkxMark({ className = "", size = 32 }: MarkProps) {
  return (
    <Image
      src="/exchanges/okx.svg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-md object-contain ${className}`}
      aria-hidden
    />
  );
}

export function ExchangeMark({
  exchangeId,
  className = "",
  size = 32,
}: {
  exchangeId: string;
  className?: string;
  size?: number;
}) {
  if (exchangeId === "okx-futures") {
    return <OkxMark className={className} size={size} />;
  }
  return <BinanceMark className={className} size={size} />;
}
