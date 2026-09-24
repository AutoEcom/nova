"use client";

/**
 * ============================================================================
 * AGENT TERMINAL — architectural UX (implemented)
 * ============================================================================
 * Modes: Dry Run (default on open) | Live | Backtest (separate action)
 * Live switch → confirm + exchange API keys gate → Exchange / API modal if missing
 * Capital allocation always user-selected (min $100)
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetIsLoggedIn } from "@multiversx/sdk-dapp/out/react/account/useGetIsLoggedIn";
import { GlowButton } from "@/components/ui/GlowButton";
import { ExchangeApiModal } from "@/components/agents/ExchangeApiModal";
import {
  agentSubscriptionNovaAmount,
  clampLeverage,
  FALLBACK_DEFAULT_LEVERAGE,
  formatMaxDrawdown,
  formatRiskScore,
  MAX_LEVERAGE,
  MIN_CAPITAL_ALLOCATION_USD,
  MIN_LEVERAGE,
  resolveDefaultLeverage,
  type AgentDefinition,
} from "@/config/agents";
import {
  BINANCE_TOP10_FUTURES,
  getStrategyById,
} from "@/config/strategies";
import {
  agentEventsUrl,
  fetchActiveAgentSession,
  fetchAgentPositions,
  fetchTerminalMetrics,
  postAgentBacktest,
  postAgentStart,
  postAgentStop,
  type TerminalMetrics,
  type TerminalPosition,
  type TerminalStatus,
} from "@/lib/agents/terminalApi";
import { useWalletUI } from "@/providers/WalletUIProvider";

type AgentTerminalModalProps = {
  open: boolean;
  agent: AgentDefinition | null;
  expiresAt?: string | null;
  onClose: () => void;
  /** When true, highlight / scroll to the Run Backtest control on open. */
  focusBacktest?: boolean;
};

type ExecutionMode = "dry_run" | "live";
type ChartPeriod = "7D" | "14D" | "30D" | "90D" | "1Y";

type LogKind = "exec" | "telemetry" | "risk" | "system" | "warn";

type LogEntry = {
  id: string;
  time: string;
  kind: LogKind;
  message: string;
};

type OrchestratorSseEvent = {
  type?: string;
  message?: string;
  level?: string;
  ts?: string;
  sessionId?: string;
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
const POSITIONS_POLL_MS = 6000;
const DEFAULT_CAPITAL = "1000";

const LOG_TONE: Record<LogKind, string> = {
  exec: "text-profit",
  telemetry: "text-cyan",
  risk: "text-amber-300",
  system: "text-foreground/85",
  warn: "text-loss",
};

function mapSseTypeToLogKind(type: string | undefined): LogKind {
  switch ((type ?? "").toLowerCase()) {
    case "signal":
      return "exec";
    case "status":
      return "telemetry";
    case "info":
      return "system";
    case "warning":
    case "error":
      return "warn";
    default:
      return "system";
  }
}

function formatSseLogTime(ts: string | undefined): string {
  if (!ts) return nowTime();
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return nowTime();
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const LOG_TAG: Record<LogKind, string> = {
  exec: "EXEC",
  telemetry: "TEL",
  risk: "RISK",
  system: "SYS",
  warn: "WARN",
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultBacktestRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

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

function parseCapital(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export function AgentTerminalModal({
  open,
  agent,
  expiresAt,
  onClose,
  focusBacktest = false,
}: AgentTerminalModalProps) {
  const strategyId = agent?.strategyId ?? "evolgo-consensus";
  const boundStrategy = getStrategyById(strategyId);
  const isLoggedIn = useGetIsLoggedIn();
  const account = useGetAccount();
  const { openConnect } = useWalletUI();
  const priceNova = agent
    ? agent.freeAccess
      ? null
      : agentSubscriptionNovaAmount(agent)
    : null;

  const [executionMode, setExecutionMode] = useState<ExecutionMode>("dry_run");
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);
  const [keysGateOpen, setKeysGateOpen] = useState(false);
  const [checkingKeys, setCheckingKeys] = useState(false);
  const [period, setPeriod] = useState<ChartPeriod>("30D");
  const [backtestFrom, setBacktestFrom] = useState(
    () => defaultBacktestRange().from,
  );
  const [backtestTo, setBacktestTo] = useState(() => defaultBacktestRange().to);
  const [capitalInput, setCapitalInput] = useState(DEFAULT_CAPITAL);
  const [capitalError, setCapitalError] = useState<string | null>(null);
  const [leverageInput, setLeverageInput] = useState(
    String(FALLBACK_DEFAULT_LEVERAGE),
  );
  const [leverageError, setLeverageError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [metrics, setMetrics] = useState<TerminalMetrics | null>(null);
  const [livePositions, setLivePositions] = useState<TerminalPosition[] | null>(
    null,
  );
  const [actionBusy, setActionBusy] = useState<"start" | "stop" | null>(null);
  const [backtestBusy, setBacktestBusy] = useState(false);
  const [backtestHighlight, setBacktestHighlight] = useState(false);
  /** Mobile-only: full control grid collapsed by default to free chart / log space. */
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [toast, setToast] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const pollFailRef = useRef(0);
  const logIdRef = useRef(0);
  const backtestFocusRef = useRef<HTMLDivElement | null>(null);
  const logStreamRef = useRef<HTMLDivElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const sseActiveRef = useRef(false);
  const sseWarnOnceRef = useRef(false);
  /** Prevents empty serverless runtimeStore metrics from demoting a Live session. */
  const liveSessionGuardRef = useRef<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const pushLog = useCallback(
    (kind: LogKind, message: string, time?: string) => {
      logIdRef.current += 1;
      setLogs((prev) =>
        [
          ...prev,
          {
            id: `log-${logIdRef.current}`,
            time: time ?? nowTime(),
            kind,
            message,
          },
        ].slice(-48),
      );
    },
    [],
  );

  const closeLiveEvents = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    sseActiveRef.current = false;
    sseWarnOnceRef.current = false;
  }, []);

  const openLiveEvents = useCallback(
    (sessionId: string) => {
      closeLiveEvents();
      const id = sessionId.trim();
      if (!id || typeof window === "undefined") return;

      try {
        const es = new EventSource(agentEventsUrl(id));
        sseRef.current = es;
        sseActiveRef.current = true;
        sseWarnOnceRef.current = false;
        pushLog("telemetry", `SSE · subscribed · session ${id}`);

        es.onmessage = (ev) => {
          if (!ev.data || ev.data === ":keepalive" || ev.data.startsWith(":")) {
            return;
          }
          try {
            const parsed = JSON.parse(ev.data) as OrchestratorSseEvent;
            const kind = mapSseTypeToLogKind(parsed.type);
            const label = (parsed.type ?? "event").toUpperCase();
            const msg =
              typeof parsed.message === "string" && parsed.message.trim()
                ? parsed.message.trim()
                : "(empty)";
            pushLog(kind, `${label} · ${msg}`, formatSseLogTime(parsed.ts));
          } catch {
            pushLog("system", `SSE · ${ev.data}`);
          }
        };

        es.onerror = () => {
          // EventSource reconnects automatically; surface one warning max per stream.
          if (!sseWarnOnceRef.current) {
            sseWarnOnceRef.current = true;
            pushLog(
              "warn",
              "SSE · stream interrupted · retrying · terminal continues",
            );
          }
          if (es.readyState === EventSource.CLOSED) {
            sseActiveRef.current = false;
            sseRef.current = null;
            pushLog(
              "warn",
              "SSE · connection closed · Live events unavailable",
            );
          }
        };
      } catch (err) {
        sseActiveRef.current = false;
        const detail = err instanceof Error ? err.message : "unknown error";
        pushLog("warn", `SSE · failed to subscribe · ${detail}`);
      }
    },
    [closeLiveEvents, pushLog],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 47.99rem)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /** Mobile shows a short tail; desktop keeps the full stream. */
  const visibleLogs = isMobileViewport ? logs.slice(-4) : logs;

  useEffect(() => {
    const el = logStreamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleLogs]);

  const applyMetrics = useCallback((next: TerminalMetrics) => {
    setMetrics(next);
  }, []);

  const validateCapital = useCallback((): number | null => {
    const amount = parseCapital(capitalInput);
    if (amount === null) {
      setCapitalError("Enter a valid allocation amount");
      return null;
    }
    if (amount < MIN_CAPITAL_ALLOCATION_USD) {
      setCapitalError(
        `Minimum allocation is $${MIN_CAPITAL_ALLOCATION_USD.toLocaleString()}`,
      );
      return null;
    }
    setCapitalError(null);
    return amount;
  }, [capitalInput]);

  const validateLeverage = useCallback((): number | null => {
    const raw = Number(leverageInput);
    if (
      !Number.isFinite(raw) ||
      raw < MIN_LEVERAGE ||
      raw > MAX_LEVERAGE
    ) {
      setLeverageError(`Leverage must be ${MIN_LEVERAGE}–${MAX_LEVERAGE}x`);
      return null;
    }
    setLeverageError(null);
    return clampLeverage(raw);
  }, [leverageInput]);

  useEffect(() => {
    if (!open) {
      setExchangeOpen(false);
      setLiveConfirmOpen(false);
      setKeysGateOpen(false);
      closeLiveEvents();
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, closeLiveEvents]);

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
    setMobileControlsOpen(true);
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
    const range = defaultBacktestRange();
    setExecutionMode("dry_run");
    setLiveConfirmOpen(false);
    setKeysGateOpen(false);
    setMobileControlsOpen(false);
    setPeriod("30D");
    setBacktestFrom(range.from);
    setBacktestTo(range.to);
    setCapitalInput(DEFAULT_CAPITAL);
    setCapitalError(null);
    setLeverageInput(
      String(
        resolveDefaultLeverage(agent, boundStrategy?.defaultLeverage ?? null),
      ),
    );
    setLeverageError(null);
    setMetrics(null);
    setLivePositions(null);
    closeLiveEvents();
    pollFailRef.current = 0;
    liveSessionGuardRef.current = null;
    const priceNote =
      !agent.freeAccess && priceNova != null
        ? ` · ${priceNova.toLocaleString()} $NOVA / mo orchestration`
        : "";
    setLogs([
      {
        id: "boot-1",
        time: nowTime(),
        kind: "system",
        message: `${agent.name.toUpperCase()} WORKSPACE ONLINE`,
      },
      {
        id: "boot-2",
        time: nowTime(),
        kind: "telemetry",
        message: `DEDICATED STRATEGY · ${boundStrategy?.name ?? strategyId} · Binance Futures top-10`,
      },
      {
        id: "boot-3",
        time: nowTime(),
        kind: "risk",
        message: `RISK · MDD ${formatMaxDrawdown(agent.maxDrawdownPct)} · score ${formatRiskScore(agent.riskScore, agent.riskBand)}`,
      },
      {
        id: "boot-4",
        time: nowTime(),
        kind: "system",
        message: `MODE · DRY RUN (default)${priceNote}`,
      },
      {
        id: "boot-5",
        time: nowTime(),
        kind: agent.freeAccess ? "exec" : "system",
        message: agent.freeAccess
          ? "PUBLIC ACCESS GRANTED · capital allocation required before start"
          : "CLEARANCE VERIFIED · capital allocation required before start",
      },
    ]);
  }, [open, agent, boundStrategy?.name, boundStrategy?.defaultLeverage, strategyId, priceNova, closeLiveEvents]);

  // Recover Live session from orchestrator when Terminal re-opens (serverless store may be empty).
  useEffect(() => {
    if (!open || !agent) return;
    // Skip if this mount already has a Live session (start or prior recover).
    if (liveSessionGuardRef.current) return;

    let cancelled = false;
    const controller = new AbortController();

    const recover = async () => {
      const result = await fetchActiveAgentSession(
        agent.id,
        strategyId,
        controller.signal,
      );
      if (cancelled || !result) return;

      // Soft-fail / no session → keep Dry Run default from boot effect.
      if (!result.recovered || !result.session?.sessionId) return;

      const sessionId = result.session.sessionId;
      liveSessionGuardRef.current = sessionId;
      setExecutionMode("live");
      if (
        typeof result.session.capitalUsd === "number" &&
        Number.isFinite(result.session.capitalUsd)
      ) {
        setCapitalInput(String(result.session.capitalUsd));
      }
      applyMetrics({
        ok: true,
        agentId: result.agentId ?? agent.id,
        strategy: result.strategy ?? result.strategy_id ?? strategyId,
        strategy_id: result.strategy_id ?? result.strategy ?? strategyId,
        status: "live",
        mode: "live",
        session_id: sessionId,
        sessionId,
        capital_usd:
          result.capital_usd ??
          (typeof result.session.capitalUsd === "number"
            ? result.session.capitalUsd
            : null),
        leverage: result.leverage ?? null,
        cumulative_pnl_pct: result.cumulative_pnl_pct ?? 0,
        active_positions: [],
        latency_ms: result.latency_ms ?? 0,
        exec_speed: result.exec_speed ?? 0,
        tick: result.tick ?? 0,
        updated_at: result.updated_at,
      });
      setLivePositions([]);
      openLiveEvents(sessionId);
      pushLog(
        "telemetry",
        `SESSION RECOVERED · ${sessionId} · Live runner still active`,
      );
      setToast({
        tone: "ok",
        text: `Live session recovered · ${sessionId}`,
      });
    };

    void recover();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    open,
    agent,
    strategyId,
    applyMetrics,
    openLiveEvents,
    pushLog,
  ]);

  const hasConnectedExchangeKeys = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn || !account.address) return false;
    try {
      const res = await fetch(
        `/api/exchanges/keys?address=${encodeURIComponent(account.address)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        connections?: Array<{ status?: string }>;
      };
      if (!res.ok || !json.ok) return false;
      return (json.connections ?? []).some((c) => c.status === "connected");
    } catch {
      return false;
    }
  }, [isLoggedIn, account.address]);

  const requestLiveMode = useCallback(async () => {
    if (executionMode === "live") return;
    if (!isLoggedIn || !account.address) {
      openConnect();
      setToast({
        tone: "err",
        text: "Connect wallet before enabling Live mode",
      });
      return;
    }
    setCheckingKeys(true);
    try {
      const ok = await hasConnectedExchangeKeys();
      if (!ok) {
        setKeysGateOpen(true);
        pushLog(
          "warn",
          "LIVE BLOCKED · no verified exchange API keys · connect a venue first",
        );
        return;
      }
      setLiveConfirmOpen(true);
    } finally {
      setCheckingKeys(false);
    }
  }, [
    executionMode,
    isLoggedIn,
    account.address,
    openConnect,
    hasConnectedExchangeKeys,
    pushLog,
  ]);

  const confirmLiveMode = useCallback(() => {
    setExecutionMode("live");
    setLiveConfirmOpen(false);
    pushLog(
      "exec",
      "MODE · LIVE ARMED · real order routing enabled when agent is started",
    );
    setToast({ tone: "ok", text: "Live mode armed" });
  }, [pushLog]);

  const switchToDryRun = useCallback(() => {
    if (executionMode === "dry_run") return;
    setExecutionMode("dry_run");
    pushLog("system", "MODE · DRY RUN · simulation only · no real orders");
  }, [executionMode, pushLog]);

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
        const guard = liveSessionGuardRef.current;
        const nextSession = next.sessionId ?? next.session_id ?? null;
        // Empty serverless store must not demote an active Live/recovered session.
        if (
          guard &&
          (next.status === "stopped" || !nextSession || nextSession !== guard)
        ) {
          return;
        }
        pollFailRef.current = 0;
        if (next.status === "live" && nextSession) {
          liveSessionGuardRef.current = nextSession;
        }
        applyMetrics(next);
        return;
      }
      pollFailRef.current += 1;
      // While Live SSE is feeding the log, skip stub metrics degradation spam.
      if (sseActiveRef.current) return;
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
  const liveSessionId = metrics?.sessionId ?? metrics?.session_id ?? null;

  // Live positions from orchestrator (Dry Run keeps stub metrics rows).
  useEffect(() => {
    if (
      !open ||
      !agent ||
      executionMode !== "live" ||
      runStatus !== "live" ||
      !liveSessionId
    ) {
      if (executionMode !== "live" || runStatus !== "live" || !liveSessionId) {
        setLivePositions(null);
      }
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      const next = await fetchAgentPositions(liveSessionId, controller.signal);
      if (cancelled || next == null) return;
      setLivePositions(next);
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, POSITIONS_POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, [open, agent, executionMode, runStatus, liveSessionId]);

  const livePnl = metrics?.cumulative_pnl_pct ?? 0;
  const positions: TerminalPosition[] =
    executionMode === "live" && liveSessionId && livePositions != null
      ? livePositions
      : (metrics?.active_positions ?? []);
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
    agent?.riskBand === "Elevated" || agent?.riskBand === "High"
      ? "Momentum Burst"
      : agent?.riskBand === "Low"
        ? "Capital Preserve"
        : "Mean Revert";

  const handleStart = async () => {
    if (!agent || actionBusy) return;
    const capital = validateCapital();
    if (capital === null) {
      setMobileControlsOpen(true);
      pushLog(
        "warn",
        `CAPITAL REJECTED · minimum $${MIN_CAPITAL_ALLOCATION_USD} USD required`,
      );
      setToast({
        tone: "err",
        text: `Minimum allocation $${MIN_CAPITAL_ALLOCATION_USD}`,
      });
      return;
    }
    const leverage = validateLeverage();
    if (leverage === null) {
      setMobileControlsOpen(true);
      pushLog(
        "warn",
        `LEVERAGE REJECTED · must be ${MIN_LEVERAGE}–${MAX_LEVERAGE}x`,
      );
      setToast({
        tone: "err",
        text: `Leverage must be ${MIN_LEVERAGE}–${MAX_LEVERAGE}x`,
      });
      return;
    }
    if (executionMode === "live") {
      const ok = await hasConnectedExchangeKeys();
      if (!ok) {
        setKeysGateOpen(true);
        pushLog(
          "warn",
          "LIVE START BLOCKED · connect & verify exchange API keys first",
        );
        setToast({ tone: "err", text: "Exchange API keys required for Live" });
        return;
      }
    }
    setActionBusy("start");
    try {
      const next = await postAgentStart(agent.id, strategyId, {
        mode: executionMode,
        capitalUsd: capital,
        walletAddress: account.address || null,
        leverage,
      });
      applyMetrics(next);
      const sessionId = next.sessionId ?? next.session_id ?? null;
      const modeLabel =
        executionMode === "live"
          ? sessionId
            ? `LIVE · session ${sessionId} · ${leverage}x`
            : `LIVE · ${leverage}x`
          : `DRY RUN · simulated fills · ${leverage}x`;
      pushLog(
        "exec",
        `AGENT START · ${boundStrategy?.name ?? strategyId} · capital $${capital.toLocaleString()} · ${modeLabel}`,
      );
      if (executionMode === "live" && sessionId) {
        liveSessionGuardRef.current = sessionId;
        setLivePositions([]);
        openLiveEvents(sessionId);
      } else {
        liveSessionGuardRef.current = null;
        setLivePositions(null);
        closeLiveEvents();
      }
      setMobileControlsOpen(false);
      setToast({
        tone: "ok",
        text:
          executionMode === "live"
            ? sessionId
              ? `Live session registered · ${sessionId}`
              : "Agent started in Live mode"
            : "Agent started in Dry Run",
      });
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
      const sessionId = metrics?.sessionId ?? metrics?.session_id ?? null;
      const next = await postAgentStop(agent.id, strategyId, {
        mode: executionMode,
        sessionId,
      });
      closeLiveEvents();
      setLivePositions(null);
      liveSessionGuardRef.current = null;
      applyMetrics(next);
      if (next.warning) {
        pushLog(
          "warn",
          `AGENT STOP · local stub halted · ${next.warning}`,
        );
        setToast({
          tone: "err",
          text: next.warning,
        });
      } else {
        pushLog(
          "system",
          next.orchestratorStopped
            ? `AGENT STOP · ${boundStrategy?.name ?? strategyId} · LIVE · orchestrator halted · session ${sessionId ?? "—"}`
            : `AGENT STOP · ${boundStrategy?.name ?? strategyId} · inventory held · mode ${executionMode === "live" ? "LIVE" : "DRY RUN"}`,
        );
        setToast({ tone: "ok", text: "Agent stopped" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stop failed";
      closeLiveEvents();
      pushLog("warn", `AGENT STOP FAILED · ${msg}`);
      setToast({ tone: "err", text: msg });
    } finally {
      setActionBusy(null);
    }
  };

  const handleBacktest = async () => {
    if (!agent || backtestBusy) return;
    const capital = validateCapital();
    if (capital === null) {
      setMobileControlsOpen(true);
      pushLog(
        "warn",
        `BACKTEST BLOCKED · allocate at least $${MIN_CAPITAL_ALLOCATION_USD} USD`,
      );
      setToast({
        tone: "err",
        text: `Minimum allocation $${MIN_CAPITAL_ALLOCATION_USD}`,
      });
      return;
    }
    if (!backtestFrom || !backtestTo || backtestFrom > backtestTo) {
      setMobileControlsOpen(true);
      pushLog("warn", "BACKTEST BLOCKED · invalid date range (from ≤ to)");
      setToast({ tone: "err", text: "Pick a valid backtest date range" });
      return;
    }
    setBacktestBusy(true);
    pushLog(
      "telemetry",
      `BACKTEST QUEUED · ${boundStrategy?.name ?? strategyId} · capital $${capital.toLocaleString()} · ${backtestFrom} → ${backtestTo}`,
    );
    try {
      const { result } = await postAgentBacktest(agent.id, strategyId, {
        from: backtestFrom,
        to: backtestTo,
        capitalUsd: capital,
        mode: "dry_run",
      });
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
            className="fixed inset-0 z-[90] flex h-[100dvh] w-screen items-stretch justify-center bg-void"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby="agent-terminal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="agent-terminal relative flex h-full w-full flex-col overflow-hidden border-0 bg-[#070a12]"
            >
              <header className="shrink-0 border-b border-white/10 bg-black/50">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="terminal-header-meta flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan">
                        Evolgo Command Center · Fullscreen
                      </p>
                      <StatusBadge status={runStatus} />
                      <ModeBadge mode={executionMode} />
                      {priceNova != null && (
                        <span className="inline-flex rounded-md border border-purple/40 bg-purple/12 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-purple">
                          {priceNova.toLocaleString()} NOVA / mo
                        </span>
                      )}
                    </div>
                    <h2
                      id="agent-terminal-title"
                      className="mt-1 font-display text-base font-semibold tracking-wide text-foreground sm:text-lg"
                    >
                      {agent.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[9px] text-muted">
                      {boundStrategy?.name ?? strategyId}
                      {expiresAt
                        ? ` · Clearance until ${new Date(expiresAt).toLocaleString()}`
                        : ""}
                      {executionMode === "dry_run"
                        ? " · Simulation feeds"
                        : " · Live routing armed"}
                    </p>
                  </div>

                  <div className="terminal-header-chips flex flex-wrap items-center gap-2">
                    <TelemetryChip
                      label="Latency"
                      value={metrics ? `${latencyMs}ms` : "—"}
                    />
                    <TelemetryChip
                      label="Exec Speed"
                      value={metrics ? `${execSpeed} ops/m` : "—"}
                    />
                    <TelemetryChip label="Regime" value={regime} accent />
                    <TelemetryChip
                      label="MDD"
                      value={formatMaxDrawdown(agent.maxDrawdownPct)}
                    />
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

                  {/* Mobile: essential actions only — frees vertical space */}
                  <div className="terminal-mobile-header-actions flex w-full items-center gap-2">
                    <GlowButton
                      variant="purple"
                      className="!flex-1 !px-3 !py-2.5 !text-[11px]"
                      onClick={() => setExchangeOpen(true)}
                    >
                      Exchange / API
                    </GlowButton>
                    <GlowButton
                      variant="ghost"
                      className="!px-3 !py-2.5 !text-[11px]"
                      onClick={onClose}
                    >
                      Close
                    </GlowButton>
                  </div>
                </div>
              </header>

              {/* Actions strip — mobile compact toggle; desktop always expanded */}
              <div
                ref={backtestFocusRef}
                className={`shrink-0 border-b transition-[border-color,box-shadow,background-color] duration-500 ${
                  backtestHighlight
                    ? "border-cyan/45 bg-cyan/[0.07] shadow-[inset_0_0_28px_rgba(0,240,255,0.1)]"
                    : "border-white/10 bg-black/35"
                }`}
              >
                <div className="terminal-mobile-bar items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    aria-expanded={mobileControlsOpen}
                    aria-controls="terminal-controls-panel"
                    onClick={() => setMobileControlsOpen((v) => !v)}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-cyan/30 bg-cyan/10 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan touch-manipulation"
                  >
                    Settings
                    <span
                      className={`inline-flex transition-transform duration-200 ${
                        mobileControlsOpen ? "rotate-180" : ""
                      }`}
                    >
                      <DateChevron />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted">
                    <span
                      className={
                        executionMode === "live" ? "text-green" : "text-cyan"
                      }
                    >
                      {executionMode === "live" ? "Live" : "Dry Run"}
                    </span>
                    <span className="text-white/25"> · </span>
                    <span className="text-foreground/80">
                      ${capitalInput || "—"}
                    </span>
                    <span className="text-white/25"> · </span>
                    <span className="text-foreground/80">
                      {leverageInput || "—"}x
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <AgentRunToggle
                      isLive={isLive}
                      busy={actionBusy !== null}
                      mode={executionMode}
                      compact
                      onStart={() => void handleStart()}
                      onStop={() => void handleStop()}
                    />
                    <GlowButton
                      variant={backtestHighlight ? "cyan" : "ghost"}
                      className={`!h-9 !px-2.5 !py-0 !text-[10px] ${
                        backtestBusy ? "pointer-events-none opacity-60" : ""
                      }`}
                      onClick={() => {
                        if (!mobileControlsOpen) setMobileControlsOpen(true);
                        void handleBacktest();
                      }}
                    >
                      {backtestBusy ? <Spinner /> : "BT"}
                    </GlowButton>
                  </div>
                </div>

                <div
                  id="terminal-controls-panel"
                  className={`terminal-controls-panel px-3 pb-3 pt-2 sm:px-5 md:pt-3 ${
                    mobileControlsOpen ? "is-open" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      <div className="flex min-w-0 flex-col">
                        <p className="h-4 font-mono text-[9px] uppercase leading-4 tracking-[0.16em] text-muted">
                          Execution Mode
                        </p>
                        <div className="mt-1.5 inline-flex h-10 w-full overflow-hidden rounded-xl border border-cyan/30 bg-void/70 sm:w-auto">
                          <button
                            type="button"
                            disabled={isLive}
                            onClick={switchToDryRun}
                            className={`flex h-full flex-1 items-center justify-center px-4 font-mono text-[11px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none ${
                              executionMode === "dry_run"
                                ? "bg-cyan/20 text-cyan shadow-[inset_0_0_18px_rgba(0,240,255,0.12)]"
                                : "text-muted hover:bg-white/5 hover:text-foreground"
                            }`}
                          >
                            Dry Run
                          </button>
                          <button
                            type="button"
                            disabled={checkingKeys || isLive}
                            onClick={() => void requestLiveMode()}
                            className={`flex h-full flex-1 items-center justify-center border-l border-white/10 px-4 font-mono text-[11px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none ${
                              executionMode === "live"
                                ? "bg-green/20 text-green shadow-[inset_0_0_18px_rgba(14,203,129,0.14)]"
                                : "text-muted hover:bg-white/5 hover:text-foreground"
                            }`}
                          >
                            {checkingKeys ? "…" : "Live"}
                          </button>
                        </div>
                        <p className="mt-1 min-h-4 font-mono text-[9px] leading-4 text-muted">
                          {isLive ? "Stop agent to change mode" : "\u00a0"}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <label
                          htmlFor="capital-allocation"
                          className="h-4 font-mono text-[9px] uppercase leading-4 tracking-[0.16em] text-muted"
                        >
                          Capital Allocation (USD)
                        </label>
                        <div className="relative mt-1.5 h-10">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted">
                            $
                          </span>
                          <input
                            id="capital-allocation"
                            type="number"
                            min={MIN_CAPITAL_ALLOCATION_USD}
                            step="50"
                            inputMode="decimal"
                            value={capitalInput}
                            onChange={(e) => {
                              setCapitalInput(e.target.value);
                              setCapitalError(null);
                            }}
                            className="h-10 w-full rounded-xl border border-cyan/25 bg-void/80 py-0 pl-7 pr-3 font-mono text-[12px] leading-10 text-foreground outline-none focus:border-cyan/50"
                          />
                        </div>
                        <p
                          className={`mt-1 min-h-4 font-mono text-[9px] leading-4 ${
                            capitalError ? "text-magenta" : "text-muted"
                          }`}
                        >
                          {capitalError ??
                            `Min $${MIN_CAPITAL_ALLOCATION_USD.toLocaleString()} · Start & Backtest`}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <label
                          htmlFor="default-leverage"
                          className="h-4 font-mono text-[9px] uppercase leading-4 tracking-[0.16em] text-muted"
                        >
                          Default Leverage
                        </label>
                        <div className="relative mt-1.5 h-10">
                          <input
                            id="default-leverage"
                            type="number"
                            min={MIN_LEVERAGE}
                            max={MAX_LEVERAGE}
                            step="1"
                            inputMode="numeric"
                            disabled={isLive}
                            value={leverageInput}
                            onChange={(e) => {
                              setLeverageInput(e.target.value);
                              setLeverageError(null);
                            }}
                            className="h-10 w-full rounded-xl border border-cyan/25 bg-void/80 py-0 pl-3 pr-8 font-mono text-[12px] leading-10 text-foreground outline-none focus:border-cyan/50 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted">
                            x
                          </span>
                        </div>
                        <p
                          className={`mt-1 min-h-4 font-mono text-[9px] leading-4 ${
                            leverageError ? "text-magenta" : "text-muted"
                          }`}
                        >
                          {leverageError ??
                            `${MIN_LEVERAGE}–${MAX_LEVERAGE}x · agent default overridable`}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-col sm:col-span-2 lg:col-span-1">
                        <p className="h-4 font-mono text-[9px] uppercase leading-4 tracking-[0.16em] text-muted">
                          Backtest Period
                        </p>
                        <div className="mt-1.5 flex h-10 items-center gap-1.5 sm:gap-2">
                          <label className="sr-only" htmlFor="backtest-from">
                            From
                          </label>
                          <div className="terminal-date-wrap relative h-10 min-w-0 flex-1">
                            <input
                              id="backtest-from"
                              type="date"
                              value={backtestFrom}
                              onChange={(e) => setBacktestFrom(e.target.value)}
                              className="terminal-date-input h-10 w-full min-w-0 rounded-xl border border-white/12 bg-void/80 pl-2.5 pr-8 font-mono text-[11px] text-foreground outline-none focus:border-cyan/40"
                            />
                            <span
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cyan/80"
                              aria-hidden
                            >
                              <DateChevron />
                            </span>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] text-muted">
                            →
                          </span>
                          <label className="sr-only" htmlFor="backtest-to">
                            To
                          </label>
                          <div className="terminal-date-wrap relative h-10 min-w-0 flex-1">
                            <input
                              id="backtest-to"
                              type="date"
                              value={backtestTo}
                              onChange={(e) => setBacktestTo(e.target.value)}
                              className="terminal-date-input h-10 w-full min-w-0 rounded-xl border border-white/12 bg-void/80 pl-2.5 pr-8 font-mono text-[11px] text-foreground outline-none focus:border-cyan/40"
                            />
                            <span
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cyan/80"
                              aria-hidden
                            >
                              <DateChevron />
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 min-h-4 font-mono text-[9px] leading-4 text-muted">
                          From → to · historical simulation
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <p className="h-4 font-mono text-[9px] uppercase leading-4 tracking-[0.16em] text-muted">
                          Bound Strategy
                        </p>
                        <div className="mt-1.5 flex h-10 min-w-0 flex-col justify-center rounded-xl border border-white/10 bg-void/60 px-3">
                          <p className="truncate font-mono text-[11px] leading-tight text-cyan">
                            {boundStrategy?.name ?? strategyId}
                          </p>
                          <p className="truncate font-mono text-[9px] leading-tight text-muted">
                            {boundStrategy?.blurb ?? "Dedicated agent workspace"}
                          </p>
                        </div>
                        <p className="mt-1 min-h-4 font-mono text-[9px] leading-4 text-muted">
                          &nbsp;
                        </p>
                      </div>
                    </div>

                    <div className="terminal-controls-actions h-10 shrink-0 flex-wrap items-center gap-2 xl:mb-[1.25rem]">
                      <AgentRunToggle
                        isLive={isLive}
                        busy={actionBusy !== null}
                        mode={executionMode}
                        onStart={() => void handleStart()}
                        onStop={() => void handleStop()}
                      />
                      <GlowButton
                        variant={backtestHighlight ? "cyan" : "ghost"}
                        className={`!h-10 !px-3 !py-0 !text-[11px] ${
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
              </div>

              <div className="terminal-body grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[1.65fr_0.85fr]">
                <div className="terminal-main-col min-h-0 space-y-3 overflow-y-auto border-b border-white/10 p-3 sm:p-4 xl:border-b-0 xl:border-r">
                  <section className="rounded-xl border border-white/10 bg-black/35 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                          Cumulative PnL
                        </p>
                        <p
                          className={`mt-1 font-mono text-2xl font-medium tracking-tight sm:text-3xl ${
                            livePnl >= 0 ? "text-profit" : "text-loss"
                          }`}
                        >
                          {pnlDisplay}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">
                          {executionMode === "live" ? "Live" : "Dry Run"} feed ·{" "}
                          {boundStrategy?.name ?? strategyId} · {period} · Binance
                          Futures
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
                      className="h-44 w-full sm:h-52"
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

                  <section className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 sm:px-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Universe · Top 10 Binance Futures
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BINANCE_TOP10_FUTURES.map((pair) => (
                        <span
                          key={pair}
                          className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-muted"
                        >
                          {pair}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-black/35">
                    <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-4">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Active Positions
                      </p>
                      <p className="font-mono text-[9px] text-cyan">
                        {isLive
                          ? `${positions.filter((t) => t.status === "Open").length} open`
                          : "Offline"}
                      </p>
                    </div>
                    {!isLive ? (
                      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                          Stopped
                        </span>
                        <p className="font-mono text-[12px] text-foreground/80">
                          Agent offline — No active exposure
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          Disconnected from live books · start agent to resume
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-white/8 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                              <th className="px-3 py-2.5 font-medium sm:px-4">
                                Pair
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
                                  No open positions yet.
                                  {executionMode === "dry_run"
                                    ? " Start agent in Dry Run to simulate fills."
                                    : " Start agent in Live once venues are hot."}
                                </td>
                              </tr>
                            )}
                            {positions.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-white/[0.04] last:border-b-0"
                              >
                                <td className="px-3 py-2.5 font-mono text-[11px] font-medium text-foreground sm:px-4">
                                  {row.pair}
                                </td>
                                <td
                                  className={`px-3 py-2.5 font-mono text-[11px] font-medium ${
                                    row.side === "Long"
                                      ? "text-long"
                                      : "text-short"
                                  }`}
                                >
                                  {row.side}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[11px] font-medium text-muted">
                                  {row.entry}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[11px] font-medium text-muted">
                                  {row.size}
                                </td>
                                <td
                                  className={`px-3 py-2.5 font-mono text-[11px] font-medium ${
                                    row.pnl_pct >= 0
                                      ? "text-profit"
                                      : "text-loss"
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
                    )}
                  </section>
                </div>

                <aside className="terminal-log-aside flex min-h-0 flex-col bg-black/30">
                  <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 sm:px-4 sm:py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Execution Log
                    </p>
                    <p className="font-mono text-[9px] text-muted">
                      stream · {executionMode === "live" ? "live" : "dry"} ·{" "}
                      {isLive ? "running" : "idle"}
                      {isMobileViewport ? ` · last ${visibleLogs.length}` : ""}
                    </p>
                  </div>
                  <div
                    ref={logStreamRef}
                    className="terminal-log-stream min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-4"
                  >
                    {visibleLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="terminal-log-entry rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-1.5"
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
                  <div className="terminal-log-stats grid grid-cols-2 gap-2 border-t border-white/8 p-3 sm:grid-cols-4 sm:p-4">
                    <Stat label="Win Rate" value={`${agent.winRate}%`} />
                    <Stat
                      label="Max Drawdown"
                      value={formatMaxDrawdown(agent.maxDrawdownPct)}
                    />
                    <Stat
                      label="Risk Score"
                      value={formatRiskScore(agent.riskScore, agent.riskBand)}
                    />
                    <Stat
                      label="Runtime"
                      value={
                        isLive
                          ? executionMode === "live"
                            ? "Live"
                            : "Dry Run"
                          : "Stopped"
                      }
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
                    className={`pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-xl border px-4 py-2.5 font-mono text-[11px] font-medium shadow-[0_0_28px_rgba(0,0,0,0.45)] ${
                      toast.tone === "ok"
                        ? "border-profit/40 bg-deep/95 text-profit"
                        : "border-loss/45 bg-deep/95 text-loss"
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

      <AnimatePresence>
        {liveConfirmOpen && open && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Dismiss live confirmation"
              className="absolute inset-0 bg-void/75 backdrop-blur-sm"
              onClick={() => setLiveConfirmOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby="live-confirm-title"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-green/35 bg-deep/95 p-5 shadow-[0_0_40px_rgba(14,203,129,0.12)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
                Live Mode
              </p>
              <h3
                id="live-confirm-title"
                className="mt-2 font-display text-lg font-semibold tracking-wide"
              >
                Enable real order routing?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Live mode arms the terminal for exchange execution. Confirm only
                if you intend to place real futures orders with your connected
                API keys.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <GlowButton
                  variant="cyan"
                  className="!px-4 !py-2.5 !text-xs"
                  onClick={confirmLiveMode}
                >
                  Confirm Live
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  className="!px-4 !py-2.5 !text-xs"
                  onClick={() => setLiveConfirmOpen(false)}
                >
                  Stay on Dry Run
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {keysGateOpen && open && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Dismiss exchange keys gate"
              className="absolute inset-0 bg-void/75 backdrop-blur-sm"
              onClick={() => setKeysGateOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby="keys-gate-title"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-purple/35 bg-deep/95 p-5 shadow-[0_0_40px_rgba(179,71,255,0.12)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple">
                Exchange Required
              </p>
              <h3
                id="keys-gate-title"
                className="mt-2 font-display text-lg font-semibold tracking-wide"
              >
                No verified API keys found
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Live mode needs a connected futures venue (Binance / OKX). Save
                &amp; Test your keys, then retry enabling Live.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <GlowButton
                  variant="purple"
                  className="!px-4 !py-2.5 !text-xs"
                  onClick={() => {
                    setKeysGateOpen(false);
                    setExchangeOpen(true);
                  }}
                >
                  Connect Exchange
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  className="!px-4 !py-2.5 !text-xs"
                  onClick={() => setKeysGateOpen(false)}
                >
                  Cancel
                </GlowButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DateChevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M2.5 4.25 6 7.75l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModeBadge({ mode }: { mode: ExecutionMode }) {
  const live = mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
        live
          ? "border-green/40 bg-green/12 text-green"
          : "border-cyan/35 bg-cyan/12 text-cyan"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live
            ? "bg-green shadow-[0_0_8px_rgba(14,203,129,0.7)]"
            : "bg-cyan shadow-[0_0_8px_rgba(0,240,255,0.55)]"
        }`}
      />
      {live ? "Live Mode" : "Dry Run"}
    </span>
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
            ? "animate-pulse bg-green shadow-[0_0_8px_rgba(14,203,129,0.7)]"
            : "bg-muted"
        }`}
      />
      {live ? "Running" : "Stopped"}
    </span>
  );
}

function AgentRunToggle({
  isLive,
  busy,
  mode,
  compact = false,
  onStart,
  onStop,
}: {
  isLive: boolean;
  busy: boolean;
  mode: ExecutionMode;
  compact?: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl border border-white/12 bg-void/60 ${
        compact ? "h-9" : "h-10"
      }`}
    >
      <button
        type="button"
        disabled={busy || isLive}
        onClick={onStart}
        className={`flex h-full items-center font-mono uppercase tracking-wider transition ${
          compact ? "px-2 text-[10px]" : "px-3 text-[11px]"
        } ${
          isLive
            ? mode === "live"
              ? "bg-green/15 text-green"
              : "bg-cyan/15 text-cyan"
            : "text-muted hover:bg-white/5 hover:text-cyan"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy && !isLive
          ? "…"
          : compact
            ? isLive
              ? "Run"
              : mode === "live"
                ? "Live"
                : "Start"
            : mode === "live"
              ? "Start Live"
              : "Start Dry Run"}
      </button>
      <button
        type="button"
        disabled={busy || !isLive}
        onClick={onStop}
        className={`flex h-full items-center border-l border-white/10 font-mono uppercase tracking-wider transition ${
          compact ? "px-2 text-[10px]" : "px-3 text-[11px]"
        } ${
          !isLive
            ? "bg-white/[0.03] text-muted"
            : "text-muted hover:bg-magenta/10 hover:text-magenta"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy && isLive ? "…" : "Stop"}
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
        className={`mt-0.5 font-mono text-[12px] font-medium tabular-nums ${
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
      <p className="mt-0.5 truncate font-mono text-xs font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
