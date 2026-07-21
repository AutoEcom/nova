"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children">;

export function GlassCard({
  children,
  className = "",
  strong = false,
  delay = 0,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${strong ? "glass-strong" : "glass"} rounded-2xl p-5 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
