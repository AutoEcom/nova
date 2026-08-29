"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "./ui/SectionHeading";

const phases = [
  {
    quarter: "Now",
    title: "Live on Mainnet",
    items: [
      "Agents Beta · Staking · Referrals · Live Terminal",
    ],
    status: "done" as const,
  },
  {
    quarter: "Next",
    title: "Expand the stack",
    items: [
      "More agents · expanded strategy library · advanced execution",
    ],
    status: "active" as const,
  },
  {
    quarter: "Later",
    title: "Scale the network",
    items: [
      "Cloud fleet · autonomous deployment · expanded agent network",
    ],
    status: "next" as const,
  },
];

const statusStyles = {
  done: {
    node: "bg-green shadow-[0_0_16px_rgba(57,255,138,0.6)]",
    badge: "text-green border-green/30 bg-green/10",
    label: "Live",
  },
  active: {
    node: "bg-cyan shadow-[0_0_18px_rgba(0,240,255,0.7)] animate-pulse-glow",
    badge: "text-cyan border-cyan/30 bg-cyan/10",
    label: "Building",
  },
  next: {
    node: "bg-purple/80 shadow-[0_0_14px_rgba(179,71,255,0.45)]",
    badge: "text-purple border-purple/30 bg-purple/10",
    label: "Horizon",
  },
};

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Roadmap"
          title="Expansion Roadmap"
          description="From live command layer to a broader autonomous agent network — EVOLGO powered by $NOVA on MultiversX."
        />

        <div className="relative">
          <div
            className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-green via-cyan to-purple/40 sm:left-1/2 sm:-translate-x-px"
            aria-hidden
          />

          <ol className="space-y-8 sm:space-y-12">
            {phases.map((phase, index) => {
              const styles = statusStyles[phase.status];
              const isLeft = index % 2 === 0;

              return (
                <motion.li
                  key={phase.quarter}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[1fr_40px_1fr] sm:gap-0"
                >
                  <div className="relative z-10 flex justify-center sm:col-start-2 sm:row-start-1">
                    <div
                      className={`mt-1 h-4 w-4 rounded-full ring-4 ring-void ${styles.node}`}
                    />
                  </div>

                  <div
                    className={`glass rounded-2xl p-5 sm:p-6 ${
                      isLeft
                        ? "sm:col-start-1 sm:row-start-1 sm:mr-8 sm:text-right"
                        : "sm:col-start-3 sm:row-start-1 sm:ml-8"
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center gap-2 ${isLeft ? "sm:justify-end" : ""}`}
                    >
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                        {phase.quarter}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles.badge}`}
                      >
                        {styles.label}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold tracking-wide sm:text-xl">
                      {phase.title}
                    </h3>
                    <ul
                      className={`mt-3 space-y-1.5 text-sm text-muted ${isLeft ? "sm:ml-auto" : ""}`}
                    >
                      {phase.items.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
