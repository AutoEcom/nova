"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { ExchangeApiModal } from "@/components/agents/ExchangeApiModal";
import type { AgentDefinition } from "@/config/agents";

type AgentTerminalModalProps = {
  open: boolean;
  agent: AgentDefinition | null;
  expiresAt?: string | null;
  onClose: () => void;
};

type ChartPeriod = "7D" | "14D" | "30D" | "90D" | "1Y";

type LogKind = "exec" | "telemetry" | "risk" | "system" | "warn";

type LogEntry = {
  id: string;
  time: string;
  kind: LogKind;
  message: string;
};

type TradeRow = {
  id: string;
  pair: string;
  side: "Long" | "Short";
  entry: string;
  size: string;
  pnl: number;
  status: "Open" | "Filled" | "Partial" | "Closed";
};

const PERIODS: ChartPeriod[] = ["7D", "14D", "30D", "90D", "1Y"];

const PERIOD_POINTS: Record<ChartPeriod, number> = {
  "7D": 28,
  "14D": 36,
  "30D": 48,
  "90D": 60,
  "1Y": 72,
};

const LOG_EVENTS: Array<{ kind: LogKind; message: string }> = [
  { kind: "exec", message: "ORDER FILLED · EGLD/USDC · size 1.25 · venue MX" },
  { kind: "exec", message: "ORDER ROUTED · NOVA/USDC · limit resting" },
  { kind: "telemetry", message: "FEED sync · book depth refreshed · 48ms" },
  { kind: "telemetry", message: "HEARTBEAT · agent loop healthy · tick ok" },
  { kind: "risk", message: "RISK CHECK · inventory within band · pass" },
  { kind: "risk", message: "DRAWDOWN guard · 2.1% · under threshold" },
  { kind: "system", message: "SIGNAL · mean-reversion edge confirmed" },
  { kind: "warn", message: "FILTER · noise rejected · conviction low" },
  { kind: "exec", message: "SPREAD CAPTURE · +0.18% micro-edge booked" },
  { kind: "telemetry", message: "LATENCY probe · p95 41ms · nominal" },
];

const LOG_TONE: Record<LogKind, string> = {
  exec: "text-green",
  telemetry: "text-cyan",
  risk: "text-amber-300",
  system: "text-foreground/80",
  warn: "text-amber-200/90",
};

const LOG_TAG: Record<LogKind, string> = {
  exec: "EXEC",
  telemetry: "TEL",
  risk: "RISK",
  system: "SYS",
  warn: "WARN",
};

const BASE_TRADES: TradeRow[] = [
  {
    id: "t1",
    pair: "EGLD/USDC",
    side: "Long",
    entry: "18.42",
    size: "1.250",
    pnl: 2.84,
    status: "Open",
  },
  {
    id: "t2",
    pair: "NOVA/USDC",
    side: "Long",
    entry: "0.0102",
    size: "48,500",
    pnl: 1.36,
    status: "Open",
  },
  {
    id: "t3",
    pair: "USDC/WEGLD",
    side: "Short",
    entry: "0.0541",
    size: "920",
    pnl: -0.42,
    status: "Partial",
  },
  {
    id: "t4",
    pair: "EGLD/USDC",
    side: "Short",
    entry: "19.08",
    size: "0.800",
    pnl: 3.12,
    status: "Filled",
  },
  {
    id: "t5",
    pair: "NOVA/EGLD",
    side: "Long",
    entry: "0.00054",
    size: "12,200",
    pnl: 0.67,
    status: "Closed",
  },
];

function seriesForPeriod(
  agent: AgentDefinition,
  period: ChartPeriod,
): number[] {
  const n = PERIOD_POINTS[period];
  const seed = agent.winRate + agent.pnlPercent;
  const drift = agent.pnlPercent / n;
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(seed / 10 + i / 4.2) * (3 + seed / 40);
    const noise = Math.cos(i * 0.7 + seed) * 1.4;
    return Math.max(0.5, 8 + i * drift + wave + noise);
  });
}

function buildPath(values: number[], width = 640, height = 160): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.01, max - min);
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - 8 - ((v - min) / span) * (height - 20);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildArea(values: number[], width = 640, height = 160): string {
  const line = buildPath(values, width, height);
  if (!line) return "";
  return `${line} L${width},${height} L0,${height} Z`;
}

export function AgentTerminalModal({
  open,
  agent,
  expiresAt,
  onClose,
}: AgentTerminalModalProps) {
  const [period, setPeriod] = useState<ChartPeriod>("30D");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>(BASE_TRADES);
  const [tick, setTick] = useState(0);
  const [latencyMs, setLatencyMs] = useState(38);
  const [execSpeed, setExecSpeed] = useState(124);
  const [exchangeOpen, setExchangeOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setExchangeOpen(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !agent) return;
    setPeriod("30D");
    setTick(0);
    setTrades(BASE_TRADES);
    setLogs([
      {
        id: "boot-1",
        time: new Date().toLocaleTimeString(),
        kind: "system",
        message: `${agent.name.toUpperCase()} COMMAND CENTER ONLINE`,
      },
      {
        id: "boot-2",
        time: new Date().toLocaleTimeString(),
        kind: "telemetry",
        message: "MULTIVERSX MAINNET FEED ATTACHED · streams hot",
      },
      {
        id: "boot-3",
        time: new Date().toLocaleTimeString(),
        kind: "risk",
        message: "RISK ENGINE ARMED · kill-switch standby",
      },
      {
        id: "boot-4",
        time: new Date().toLocaleTimeString(),
        kind: agent.freeAccess ? "exec" : "system",
        message: agent.freeAccess
          ? "PUBLIC ACCESS GRANTED · production sandbox live"
          : "CLEARANCE VERIFIED · terminal unlocked",
      },
    ]);
  }, [open, agent]);

  useEffect(() => {
    if (!open || !agent) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setLatencyMs(32 + Math.floor(Math.random() * 28));
      setExecSpeed(96 + Math.floor(Math.random() * 80));

      const event = LOG_EVENTS[Math.floor(Math.random() * LOG_EVENTS.length)]!;
      setLogs((prev) =>
        [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            time: new Date().toLocaleTimeString(),
            kind: event.kind,
            message: event.message,
          },
        ].slice(-40),
      );

      setTrades((prev) =>
        prev.map((row, idx) => {
          if (row.status === "Closed" || row.status === "Filled") return row;
          const delta = (Math.random() - 0.45) * (idx % 2 === 0 ? 0.35 : 0.55);
          return { ...row, pnl: Number((row.pnl + delta).toFixed(2)) };
        }),
      );
    }, 1600);
    return () => window.clearInterval(id);
  }, [open, agent]);

  const series = useMemo(
    () => (agent ? seriesForPeriod(agent, period) : []),
    [agent, period],
  );
  const path = useMemo(() => buildPath(series), [series]);
  const area = useMemo(() => buildArea(series), [series]);
  const livePnl = series[series.length - 1] ?? 0;
  const regime =
    agent?.risk === "Aggressive"
      ? "Momentum Burst"
      : agent?.risk === "Conservative"
        ? "Capital Preserve"
        : "Mean Revert";

  if (!agent) return null;

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-stretch justify-center bg-void/90 p-0 backdrop-blur-md sm:p-3 md:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="agent-terminal-title"
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full w-full max-w-[1400px] flex-col overflow-hidden border border-cyan/20 bg-[#070a12] shadow-[0_0_80px_rgba(0,240,255,0.1)] sm:rounded-2xl"
          >
            {/* Top command bar */}
            <header className="shrink-0 border-b border-white/10 bg-black/40">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan">
                      Evolgo Command Center
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green/40 bg-green/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green shadow-[0_0_8px_rgba(57,255,138,0.7)]" />
                      Live
                    </span>
                  </div>
                  <h2
                    id="agent-terminal-title"
                    className="mt-1 font-display text-base font-semibold tracking-wide text-foreground sm:text-lg"
                  >
                    {agent.name}
                  </h2>
                  {expiresAt && (
                    <p className="mt-0.5 font-mono text-[9px] text-muted">
                      Clearance until {new Date(expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <TelemetryChip label="Latency" value={`${latencyMs}ms`} />
                  <TelemetryChip
                    label="Exec Speed"
                    value={`${execSpeed} ops/m`}
                  />
                  <TelemetryChip label="Regime" value={regime} accent />
                  <TelemetryChip label="Tick" value={`#${tick}`} />
                  <GlowButton
                    variant="purple"
                    className="!px-3 !py-2 !text-[11px]"
                    onClick={() => setExchangeOpen(true)}
                  >
                    Exchange / API
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    className="!px-3 !py-2 !text-[11px]"
                    onClick={onClose}
                  >
                    Close
                  </GlowButton>
                </div>
              </div>
            </header>

            {/* Body */}
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.55fr_0.9fr]">
              {/* Left: chart + trades */}
              <div className="min-h-0 space-y-3 overflow-y-auto border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r">
                <section className="rounded-xl border border-white/10 bg-black/35 p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Cumulative PnL
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold text-cyan sm:text-3xl">
                        +{livePnl.toFixed(2)}%
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        Window {period} · {agent.tagline}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PERIODS.map((p) => {
                        const active = period === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                              active
                                ? "border-cyan/55 bg-cyan/20 text-cyan shadow-[0_0_14px_rgba(0,240,255,0.18)]"
                                : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <svg
                    viewBox="0 0 640 160"
                    className="h-40 w-full sm:h-48"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="rgba(0,240,255,0.28)"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgba(0,240,255,0)"
                        />
                      </linearGradient>
                    </defs>
                    {[40, 80, 120].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        x2="640"
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.05)"
                      />
                    ))}
                    <path d={area} fill="url(#pnlFill)" />
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(0,240,255,0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </section>

                <section className="rounded-xl border border-white/10 bg-black/35">
                  <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Active Positions / Recent Trades
                    </p>
                    <p className="font-mono text-[9px] text-cyan">
                      {trades.filter((t) => t.status === "Open").length} open
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/8 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                          <th className="px-3 py-2.5 font-medium sm:px-4">
                            Pair / Asset
                          </th>
                          <th className="px-3 py-2.5 font-medium">Type</th>
                          <th className="px-3 py-2.5 font-medium">Entry</th>
                          <th className="px-3 py-2.5 font-medium">Size</th>
                          <th className="px-3 py-2.5 font-medium">PnL %</th>
                          <th className="px-3 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-white/[0.04] font-mono text-[11px] last:border-b-0"
                          >
                            <td className="px-3 py-2.5 text-foreground sm:px-4">
                              {row.pair}
                            </td>
                            <td
                              className={`px-3 py-2.5 font-semibold ${
                                row.side === "Long" ? "text-green" : "text-magenta"
                              }`}
                            >
                              {row.side}
                            </td>
                            <td className="px-3 py-2.5 text-muted">{row.entry}</td>
                            <td className="px-3 py-2.5 text-muted">{row.size}</td>
                            <td
                              className={`px-3 py-2.5 font-semibold ${
                                row.pnl >= 0 ? "text-green" : "text-magenta"
                              }`}
                            >
                              {row.pnl >= 0 ? "+" : ""}
                              {row.pnl.toFixed(2)}%
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                                  row.status === "Open"
                                    ? "bg-cyan/15 text-cyan"
                                    : row.status === "Filled"
                                      ? "bg-green/15 text-green"
                                      : row.status === "Partial"
                                        ? "bg-amber-300/15 text-amber-200"
                                        : "bg-white/5 text-muted"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Right: execution log */}
              <aside className="flex min-h-0 flex-col bg-black/25">
                <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    Execution Log
                  </p>
                  <p className="font-mono text-[9px] text-muted">
                    stream · live
                  </p>
                </div>
                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-4">
                  {logs.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 font-mono text-[9px]">
                        <span className="text-muted/80">{entry.time}</span>
                        <span
                          className={`rounded px-1 py-px tracking-wider ${LOG_TONE[entry.kind]} bg-white/[0.03]`}
                        >
                          {LOG_TAG[entry.kind]}
                        </span>
                      </div>
                      <p
                        className={`mt-0.5 font-mono text-[11px] leading-relaxed ${LOG_TONE[entry.kind]}`}
                      >
                        {entry.message}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-white/8 p-3 sm:p-4">
                  <Stat label="Win Rate" value={`${agent.winRate}%`} />
                  <Stat label="Risk" value={agent.risk} />
                  <Stat label="Status" value={agent.status} />
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <ExchangeApiModal
      open={exchangeOpen && open}
      onClose={() => setExchangeOpen(false)}
    />
    </>
  );
}

function TelemetryChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 ${
        accent
          ? "border-cyan/35 bg-cyan/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono text-[11px] font-medium ${
          accent ? "text-cyan" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-2">
      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
