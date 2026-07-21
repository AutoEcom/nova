"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "./ui/GlowButton";
import { ConnectWalletButton } from "./wallet/ConnectWalletButton";
import { useWalletUI } from "@/providers/WalletUIProvider";

const links = [
  { href: "#tokenomics", label: "Tokenomics" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#community", label: "Community" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { openBuyModal } = useWalletUI();

  const closeMenu = () => setOpen(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[55]">
      <div className="pointer-events-auto glass-strong mx-3 mt-3 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:mx-4 md:mx-auto md:max-w-6xl">
        <nav className="flex items-center justify-between px-4 py-3 sm:px-5">
          <a href="#hero" className="group flex items-center gap-2" onClick={closeMenu}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 font-display text-sm font-bold text-cyan btn-glow-cyan">
              N
            </span>
            <span className="font-display text-base font-bold tracking-[0.2em] text-foreground transition-colors group-hover:text-cyan">
              NOVA
            </span>
          </a>

          {/* Desktop / tablet */}
          <div className="hidden items-center gap-5 md:flex lg:gap-6">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-cyan"
              >
                {link.label}
              </a>
            ))}
            <GlowButton
              variant="cyan"
              className="!px-4 !py-2.5 !text-xs"
              onClick={openBuyModal}
            >
              Buy $NOVA
            </GlowButton>
            <ConnectWalletButton
              variant="ghost"
              compact
              className="!px-4 !py-2.5 !text-xs"
            />
          </div>

          {/* Mobile */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground touch-manipulation md:hidden"
          >
            <span className="sr-only">Menu</span>
            <div className="flex w-5 flex-col gap-1.5">
              <span
                className={`h-0.5 w-full bg-cyan transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-cyan transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-cyan transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </div>
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden border-t border-cyan/15 md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="rounded-xl px-3 py-3 font-mono text-sm uppercase tracking-wider text-muted transition-colors hover:bg-white/5 hover:text-cyan"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <GlowButton
                    variant="cyan"
                    fullWidth
                    onClick={() => {
                      closeMenu();
                      openBuyModal();
                    }}
                  >
                    Buy $NOVA
                  </GlowButton>
                  <ConnectWalletButton variant="ghost" fullWidth compact />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
