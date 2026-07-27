"use client";

import { motion } from "framer-motion";

const socials = [
  {
    name: "X",
    href: "https://x.com/evolgoapp",
    label: "Follow EVOLGO on X",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="block h-5 w-5 shrink-0 fill-current"
        aria-hidden
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.839L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/evolgoapp",
    label: "Join EVOLGO on Telegram",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="block h-5 w-5 shrink-0 fill-current"
        aria-hidden
      >
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.458.02.889-.15 1.562-.788 5.36-.788 5.36s-.062.246-.288.255c-.143.006-.33-.056-.33-.056l-1.86-1.22-1.01.97a.35.35 0 0 1-.26.107l.14-1.98 3.62-3.27c.16-.14-.035-.217-.247-.08l-4.47 2.81-1.93-.6s-.3-.094-.31-.3c-.01-.17.16-.26.16-.26l7.52-2.9z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer id="community" className="relative scroll-mt-24 border-t border-white/10 px-4 pb-28 pt-14 sm:px-6 sm:pb-16 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <p className="font-display text-2xl font-bold tracking-[0.25em] text-glow-cyan">
            EVOLGO
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
            Powered by $NOVA
          </p>
          <p className="mt-3 max-w-md text-sm text-muted">
            Join the operators shaping AI-native trading on MultiversX.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-foreground transition-all hover:border-cyan/40 hover:text-cyan touch-manipulation"
              >
                {s.icon}
                <span className="font-mono text-xs uppercase tracking-wider">
                  {s.name}
                </span>
              </a>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="font-mono text-[11px] text-muted">
            © {new Date().getFullYear()} EVOLGO. Powered by $NOVA · MultiversX.
          </p>
          <p className="font-mono text-[11px] text-muted">
            Utility token · Not financial advice
          </p>
        </div>
      </div>
    </footer>
  );
}
