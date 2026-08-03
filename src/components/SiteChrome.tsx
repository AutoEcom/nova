"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

/**
 * Global site chrome — Evolgo navbar + footer on every route.
 * Mounted once from the root layout inside MultiversXProvider.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex min-h-full flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
