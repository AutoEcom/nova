"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "cyan" | "purple" | "ghost";

type GlowButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit";
};

const variantClasses: Record<Variant, string> = {
  cyan: "bg-cyan/15 text-cyan btn-glow-cyan hover:bg-cyan/25 active:scale-[0.98]",
  purple:
    "bg-purple/15 text-purple btn-glow-purple hover:bg-purple/25 active:scale-[0.98]",
  ghost:
    "bg-white/5 text-foreground border border-white/15 hover:border-cyan/40 hover:bg-white/10 active:scale-[0.98]",
};

export function GlowButton({
  children,
  href,
  onClick,
  variant = "cyan",
  className = "",
  fullWidth = false,
  type = "button",
}: GlowButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-display text-sm font-semibold tracking-wide transition-all duration-200 touch-manipulation ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        whileTap={{ scale: 0.97 }}
        className={classes}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
