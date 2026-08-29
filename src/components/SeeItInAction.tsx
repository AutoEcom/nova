"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlowButton } from "./ui/GlowButton";
import { GlassCard } from "./ui/GlassCard";

export function SeeItInAction() {
  return (
    <section
      id="live-preview"
      className="relative scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <GlassCard strong delay={0.05} className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            aria-hidden
          >
            <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-cyan/15 blur-[70px]" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-purple/12 blur-[60px]" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="max-w-2xl"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan">
                See it in action
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-foreground sm:text-3xl md:text-4xl">
                Don&apos;t take our word for it. Watch the agents.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Real-time strategy telemetry, signals, decisions and execution
                data.
              </p>
            </motion.div>

            <Link href="/dashboard/agents" className="shrink-0">
              <GlowButton variant="cyan">Open Live Terminal →</GlowButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
