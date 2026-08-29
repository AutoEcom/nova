"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { ExchangeApiModal } from "@/components/agents/ExchangeApiModal";
import type { AgentDefinition } from "@/config/agents";
import {
  DEFAULT_STRATEGY_ID,
  STRATEGY_CATALOG,
  getStrategyById,
} from "@/config/strategies";
import {
  fetchTerminalMetrics,
  postAgentBacktest,
  postAgentStart,
  postAgentStop,
  type TerminalMetrics,
  type TerminalPosition,
  type TerminalStatus,
} from "@/lib/agents/terminalApi";

type AgentTerminalModalProps = {
  open: boolean;
  agent: AgentDefinition | null;
  expiresAt?: string | null;
  onClose: () => void;
  /** When true, highlight / scroll to the Run Backtest control on open. */
  focusBacktest?: boolean;
};

type ChartPeriod = "7D" | "14D" | "30D" | "90D" | "1Y";

type LogKind = "exec" | "telemetry" | "risk" | "system" | "warn";

type LogEntry = {
  id: string;
  time: string;
  kind: LogKind;
  message: string;
};

const PERIODS: ChartPeriod[] = ["7D", "14D", "30D", "90D", "1Y"];

const PERIOD_POINTS: Record<ChartPeriod, number> = {
  "7D": 28,
  "14D": 36,
  "30D": 48,
  "90D": 60,
  "1Y": 72,
};

const POLL_MS = 5000;

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

function seriesForPeriod(
  agent: AgentDefinition,
  period: ChartPeriod,
  livePnl: number,
): number[] {
  const n = PERIOD_POINTS[period];
  const seed = agent.winRate + agent.pnlPercent;
  const target = livePnl > 0 ? livePnl : agent.pnlPercent * 0.2;
  const drift = target / n;
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

function nowTime() {
  return new Date().toLocaleTimeString();
}

export function AgentTerminalModal({
  open,
  agent,
  expiresAt,
  onClose,
  focusBacktest = false,
}: AgentTerminalModalProps) {
  const [period, setPeriod] = useState<ChartPeriod>("30D");
  const [strategyId, setStrategyId] = useState(DEFAULT_STRATEGY_ID);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [metrics, setMetrics] = useState<TerminalMetrics | null>(null);
  const [actionBusy, setActionBusy] = useState<"start" | "stop" | null>(null);
  const [backtestBusy, setBacktestBusy] = useState(false);
  const [backtestHighlight, setBacktestHighlight] = useState(false);
  const [toast, setToast] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const pollFailRef = useRef(0);
  const logIdRef = useRef(0);
  const backtestFocusRef = useRef<HTMLDivElement | null>(null);

  const selectedStrategy = getStrategyById(strategyId);

  const pushLog = useCallback((kind: LogKind, message: string) => {
    logIdRef.current += 1;
    setLogs((prev) =>
      [
        ...prev,
        {
          id: `log-${logIdRef.current}`,
          time: nowTime(),
          kind,
          message,
        },
      ].slice(-48),
    );
  }, []);

  const applyMetrics = useCallback((next: TerminalMetrics) => {
    setMetrics(next);
  }, []);

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
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!open || !focusBacktest) {
      setBacktestHighlight(false);
      return;
    }
    setBacktestHighlight(true);
    const scrollId = window.setTimeout(() => {
      backtestFocusRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 280);
    const clearId = window.setTimeout(() => setBacktestHighlight(false), 4200);
    return () => {
      window.clearTimeout(scrollId);
      window.clearTimeout(clearId);
    };
  }, [open, focusBacktest]);

  useEffect(() => {
    if (!open || !agent) return;
    setPeriod("30D");
    setStrategyId(DEFAULT_STRATEGY_ID);
    setMetrics(null);
    pollFailRef.current = 0;
    setLogs([
      {
        id: "boot-1",
        time: nowTime(),
        kind: "system",
        message: `${agent.name.toUpperCase()} COMMAND CENTER ONLINE`,
      },
      {
        id: "boot-2",
        time: nowTime(),
        kind: "telemetry",
        message: `METRICS STREAM · strategy ${DEFAULT_STRATEGY_ID} · poll 5s`,
      },
      {
        id: "boot-3",
        time: nowTime(),
        kind: "risk",
        message: "RISK ENGINE ARMED · kill-switch standby",
      },
      {
        id: "boot-4",
        time: nowTime(),
        kind: agent.freeAccess ? "exec" : "system",
        message: agent.freeAccess
          ? "PUBLIC ACCESS GRANTED · production sandbox live"
          : "CLEARANCE VERIFIED · terminal unlocked",
      },
    ]);
  }, [open, agent]);

  useEffect(() => {
    if (!open || !agent) return;

    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      const next = await fetchTerminalMetrics(
        agent.id,
        strategyId,
        controller.signal,
      );
      if (cancelled) return;
      if (next) {
        pollFailRef.current = 0;
        applyMetrics(next);
        return;
      }
      pollFailRef.current += 1;
      if (pollFailRef.current === 1 || pollFailRef.current % 3 === 0) {
        pushLog(
          "warn",
          "METRICS FEED DEGRADED · retrying · UI holding last snapshot",
        );
      }
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, [open, agent, strategyId, applyMetrics, pushLog]);

  const runStatus: TerminalStatus = metrics?.status ?? "stopped";
  const livePnl = metrics?.cumulative_pnl_pct ?? 0;
  const positions: TerminalPosition[] = metrics?.active_positions ?? [];
  const latencyMs = metrics?.latency_ms ?? 0;
  const execSpeed = metrics?.exec_speed ?? 0;
  const tick = metrics?.tick ?? 0;

  const series = useMemo(
    () => (agent ? seriesForPeriod(agent, period, livePnl) : []),
    [agent, period, livePnl],
  );
  const path = useMemo(() => buildPath(series), [series]);
  const area = useMemo(() => buildArea(series), [series]);
  const regime =
    agent?.risk === "Aggressive"
      ? "Momentum Burst"
      : agent?.risk === "Conservative"
        ? "Capital Preserve"
        : "Mean Revert";

  const handleStart = async () => {
    if (!agent || actionBusy) return;
    setActionBusy("start");
    try {
      const next = await postAgentStart(agent.id, strategyId);
      applyMetrics(next);
      pushLog(
        "exec",
        `AGENT START · ${selectedStrategy?.name ?? strategyId} · venues hot`,
      );
      setToast({ tone: "ok", text: "Agent started" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Start failed";
      pushLog("warn", `AGENT START FAILED · ${msg}`);
      setToast({ tone: "err", text: msg });
    } finally {
      setActionBusy(null);
    }
  };

  const handleStop = async () => {
    if (!agent || actionBusy) return;
    setActionBusy("stop");
    try {
      const next = await postAgentStop(agent.id, strategyId);
      applyMetrics(next);
      pushLog(
        "system",
        `AGENT STOP · ${selectedStrategy?.name ?? strategyId} · inventory held`,
      );
      setToast({ tone: "ok", text: "Agent stopped" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stop failed";
      pushLog("warn", `AGENT STOP FAILED · ${msg}`);
      setToast({ tone: "err", text: msg });
    } finally {
      setActionBusy(null);
    }
  };

  const handleBacktest = async () => {
    if (!agent || backtestBusy) return;
    setBacktestBusy(true);
    pushLog(
      "telemetry",
      `BACKTEST QUEUED · ${selectedStrategy?.name ?? strategyId} · window ${period}`,
    );
    try {
      const { result } = await postAgentBacktest(
        agent.id,
        strategyId,
        period,
      );
      pushLog(
        "exec",
        `BACKTEST OK · ${result.trades} trades · win ${result.win_rate_pct}% · PnL ${result.pnl_pct >= 0 ? "+" : ""}${result.pnl_pct}% · DD ${result.max_drawdown_pct}% · Sharpe ${result.sharpe}`,
      );
      setToast({
        tone: "ok",
        text: `Backtest complete · ${result.pnl_pct >= 0 ? "+" : ""}${result.pnl_pct}% PnL`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backtest failed";
      pushLog("warn", `BACKTEST FAILED · ${msg}`);
      setToast({ tone: "err", text: msg });
    } finally {
      setBacktestBusy(false);
    }
  };

  const handleStrategyChange = (nextId: string) => {
    if (nextId === strategyId) return;
    setStrategyId(nextId);
    setMetrics(null);
    const next = getStrategyById(nextId);
    pushLog(
      "system",
      `STRATEGY SWITCH · ${next?.name ?? nextId} · reloading isolated telemetry`,
    );
  };

  if (!agent) return null;

  const isLive = runStatus === "live";
  const pnlDisplay = metrics
    ? `${livePnl >= 0 ? "+" : ""}${livePnl.toFixed(2)}%`
    : "—";

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
              <header className="shrink-0 border-b border-white/10 bg-black/40">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan">
                        Evolgo Command Center
                      </p>
                      <StatusBadge status={runStatus} />
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
                    <TelemetryChip
                      label="Latency"
                      value={metrics ? `${latencyMs}ms` : "—"}
                    />
                    <TelemetryChip
                      label="Exec Speed"
                      value={metrics ? `${execSpeed} ops/m` : "—"}
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

              {/* Actions strip */}
              <div
                ref={backtestFocusRef}
                className={`shrink-0 border-b px-4 py-2.5 sm:px-5 transition-[border-color,box-shadow,background-color] duration-500 ${
                  backtestHighlight
                    ? "border-cyan/45 bg-cyan/[0.07] shadow-[inset_0_0_28px_rgba(0,240,255,0.1)]"
                    : "border-white/10 bg-black/30"
                }`}
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1 sm:max-w-sm">
                      <label
                        htmlFor="strategy-selector"
                        className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted"
                      >
                        Strategy Selector
                      </label>
                      <select
                        id="strategy-selector"
                        value={strategyId}
                        onChange={(e) => handleStrategyChange(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-cyan/25 bg-void/80 px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-cyan/50"
                      >
                        {STRATEGY_CATALOG.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.status === "beta" ? " · beta" : ""}
                          </option>
                        ))}
                      </select>
                      {selectedStrategy && (
                        <p className="mt-1 truncate font-mono text-[9px] text-muted">
                          {selectedStrategy.blurb}
                        </p>
                      )}
                    </div>
                    <div className="pb-0.5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Actions
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        Isolated runtime · stub
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AgentRunToggle
                      isLive={isLive}
                      busy={actionBusy !== null}
                      onStart={() => void handleStart()}
                      onStop={() => void handleStop()}
                    />
                    <GlowButton
                      variant={backtestHighlight ? "cyan" : "ghost"}
                      className={`!px-3 !py-2 !text-[11px] ${
                        backtestBusy ? "pointer-events-none opacity-60" : ""
                      } ${
                        backtestHighlight
                          ? "ring-2 ring-cyan/50 ring-offset-2 ring-offset-[#070a12]"
                          : ""
                      }`}
                      onClick={() => void handleBacktest()}
                    >
                      {backtestBusy ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner />
                          Running…
                        </span>
                      ) : (
                        "Run Backtest"
                      )}
                    </GlowButton>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.55fr_0.9fr]">
                <div className="min-h-0 space-y-3 overflow-y-auto border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r">
                  <section className="rounded-xl border border-white/10 bg-black/35 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                          Cumulative PnL
                        </p>
                        <p
                          className={`mt-1 font-display text-2xl font-semibold sm:text-3xl ${
                            livePnl >= 0 ? "text-cyan" : "text-magenta"
                          }`}
                        >
                          {pnlDisplay}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">
                          Live feed · {selectedStrategy?.name ?? strategyId} ·{" "}
                          {period} · {agent.tagline}
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
                        <linearGradient
                          id="pnlFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
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
                        Active Positions
                      </p>
                      <p className="font-mono text-[9px] text-cyan">
                        {positions.filter((t) => t.status === "Open").length}{" "}
                        open
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
                          {positions.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-3 py-5 font-mono text-[11px] text-muted sm:px-4"
                              >
                                {isLive
                                  ? "No open positions yet."
                                  : "Agent stopped — start the agent to open positions."}
                              </td>
                            </tr>
                          )}
                          {positions.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-white/[0.04] font-mono text-[11px] last:border-b-0"
                            >
                              <td className="px-3 py-2.5 text-foreground sm:px-4">
                                {row.pair}
                              </td>
                              <td
                                className={`px-3 py-2.5 font-semibold ${
                                  row.side === "Long"
                                    ? "text-green"
                                    : "text-magenta"
                                }`}
                              >
                                {row.side}
                              </td>
                              <td className="px-3 py-2.5 text-muted">
                                {row.entry}
                              </td>
                              <td className="px-3 py-2.5 text-muted">
                                {row.size}
                              </td>
                              <td
                                className={`px-3 py-2.5 font-semibold ${
                                  row.pnl_pct >= 0
                                    ? "text-green"
                                    : "text-magenta"
                                }`}
                              >
                                {row.pnl_pct >= 0 ? "+" : ""}
                                {row.pnl_pct.toFixed(2)}%
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                                    row.status === "Open"
                                      ? "bg-cyan/15 text-cyan"
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

                <aside className="flex min-h-0 flex-col bg-black/25">
                  <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Execution Log
                    </p>
                    <p className="font-mono text-[9px] text-muted">
                      stream · {isLive ? "live" : "idle"}
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
                    <Stat
                      label="Runtime"
                      value={isLive ? "Live" : "Stopped"}
                    />
                  </div>
                </aside>
              </div>

              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={`pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-xl border px-4 py-2.5 font-mono text-[11px] shadow-[0_0_28px_rgba(0,0,0,0.45)] ${
                      toast.tone === "ok"
                        ? "border-green/35 bg-deep/95 text-green"
                        : "border-magenta/40 bg-deep/95 text-magenta"
                    }`}
                  >
                    {toast.text}
                  </motion.div>
                )}
              </AnimatePresence>
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

function StatusBadge({ status }: { status: TerminalStatus }) {
  const live = status === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
        live
          ? "border-green/40 bg-green/12 text-green"
          : "border-white/15 bg-white/[0.04] text-muted"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live
            ? "animate-pulse bg-green shadow-[0_0_8px_rgba(57,255,138,0.7)]"
            : "bg-muted"
        }`}
      />
      {live ? "Live" : "Stopped"}
    </span>
  );
}

function AgentRunToggle({
  isLive,
  busy,
  onStart,
  onStop,
}: {
  isLive: boolean;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-white/12 bg-void/60">
      <button
        type="button"
        disabled={busy || isLive}
        onClick={onStart}
        className={`px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition ${
          isLive
            ? "bg-green/15 text-green"
            : "text-muted hover:bg-white/5 hover:text-cyan"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy && !isLive ? "…" : "Start Agent"}
      </button>
      <button
        type="button"
        disabled={busy || !isLive}
        onClick={onStop}
        className={`border-l border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition ${
          !isLive
            ? "bg-white/[0.03] text-muted"
            : "text-muted hover:bg-magenta/10 hover:text-magenta"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy && isLive ? "…" : "Stop Agent"}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border border-cyan/30 border-t-cyan"
      aria-hidden
    />
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
