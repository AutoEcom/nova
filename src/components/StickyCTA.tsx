"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { GlowButton } from "./ui/GlowButton";
import { ConnectWalletButton } from "./wallet/ConnectWalletButton";
import { useWalletUI } from "@/providers/WalletUIProvider";

export function StickyCTA() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const { openBuyModal } = useWalletUI();

  useMotionValueEvent(scrollY, "change", (y) => {
    setVisible(y > 320);
  });

  return (
    <motion.div
      initial={false}
      animate={{
        y: visible ? 0 : 100,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
      aria-hidden={!visible}
    >
      <div className="glass-strong pointer-events-auto mx-auto flex max-w-lg gap-2 rounded-2xl p-2 shadow-[0_-8px_40px_rgba(0,0,0,0.55)]">
        <GlowButton
          variant="cyan"
          fullWidth
          className="!py-3 !text-xs"
          onClick={openBuyModal}
        >
          Buy $NOVA
        </GlowButton>
        <ConnectWalletButton
          variant="purple"
          fullWidth
          className="!py-3 !text-xs"
          showAccount={false}
          connectLabel="Connect"
        />
      </div>
    </motion.div>
  );
}
