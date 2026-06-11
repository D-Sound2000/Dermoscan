"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";
import {
  Activity,
  ArrowLeft,
  Minus,
  ScanLine,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient, type Scan } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeId(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function riskTextColor(v: number) {
  if (v > 0.6) return "text-orange-300";
  if (v > 0.3) return "text-yellow-300";
  return "text-emerald-300";
}

function riskBadgeStyle(v: number) {
  if (v > 0.6) return "bg-orange-400/10 border-orange-400/25 text-orange-300";
  if (v > 0.3) return "bg-yellow-400/10 border-yellow-400/25 text-yellow-300";
  return "bg-emerald-400/10 border-emerald-400/25 text-emerald-300";
}

function riskLabel(v: number) {
  if (v > 0.6) return "High risk";
  if (v > 0.3) return "Moderate";
  return "Low risk";
}

// ─── Chart component ──────────────────────────────────────────────────────────

function RiskSparkline({
  scans,
  chartId,
}: {
  scans: Scan[];
  chartId: string;
}) {
  const VW = 400;
  const VH = 162;
  const PAD = { t: 28, r: 16, b: 32, l: 40 };

  const cw = VW - PAD.l - PAD.r;
  const ch = VH - PAD.t - PAD.b;

  const sorted = [...scans].sort(
    (a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );
  const n = sorted.length;
  if (n === 0) return null;

  const toX = (i: number) =>
    PAD.l + (n === 1 ? cw / 2 : (i / (n - 1)) * cw);
  const toY = (v: number) => PAD.t + (1 - v) * ch;

  const pts = sorted.map((s, i) => ({
    x: toX(i),
    y: toY(s.malignant_probability),
    v: s.malignant_probability,
    date: new Date(s.scanned_at),
  }));

  const linePath =
    n === 1
      ? `M ${pts[0].x} ${pts[0].y}`
      : pts.reduce((acc, p, i) => {
          if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          const prev = pts[i - 1];
          const cpX = ((prev.x + p.x) / 2).toFixed(1);
          return `${acc} C ${cpX} ${prev.y.toFixed(1)} ${cpX} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }, "");

  const areaPath =
    n > 1
      ? `${linePath} L ${pts[n - 1].x.toFixed(1)} ${(PAD.t + ch).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.t + ch).toFixed(1)} Z`
      : "";

  const latest = sorted[n - 1].malignant_probability;
  const color = latest > 0.5 ? "#fb923c" : "#22d3ee";
  const gradId = `rg-${toSafeId(chartId)}`;

  const xLabelIdxs: number[] =
    n === 1 ? [0] : n === 2 ? [0, 1] : [0, n - 1];

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD.l}
          y1={toY(t)}
          x2={PAD.l + cw}
          y2={toY(t)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {[0, 0.5, 1].map((t) => (
        <text
          key={t}
          x={PAD.l - 6}
          y={toY(t) + 4}
          textAnchor="end"
          fill="rgba(255,255,255,0.28)"
          fontSize="10"
        >
          {Math.round(t * 100)}%
        </text>
      ))}

      {/* Area fill */}
      {n > 1 && <path d={areaPath} fill={`url(#${gradId})`} />}

      {/* Single-point dashed baseline */}
      {n === 1 && (
        <line
          x1={PAD.l}
          y1={pts[0].y}
          x2={PAD.l + cw}
          y2={pts[0].y}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.35"
        />
      )}

      {/* Line */}
      {n > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points + value labels */}
      {pts.map((p, i) => {
        const pColor = p.v > 0.5 ? "#fb923c" : "#22d3ee";
        const labelY = Math.max(PAD.t - 4, p.y - 12);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill={pColor} opacity="0.18" />
            <circle cx={p.x} cy={p.y} r="3.5" fill={pColor} />
            <circle cx={p.x} cy={p.y} r="1.5" fill="#071316" />
            <text
              x={p.x}
              y={labelY}
              textAnchor="middle"
              fill={pColor}
              fontSize="11"
              fontWeight="600"
            >
              {Math.round(p.v * 100)}%
            </text>
          </g>
        );
      })}

      {/* X-axis date labels */}
      {xLabelIdxs.map((idx) => {
        const p = pts[idx];
        return (
          <text
            key={idx}
            x={p.x}
            y={PAD.t + ch + 20}
            textAnchor={idx === 0 ? "start" : idx === n - 1 ? "end" : "middle"}
            fill="rgba(255,255,255,0.28)"
            fontSize="9"
          >
            {p.date.toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Mole card ────────────────────────────────────────────────────────────────

function MoleCard({ mole, index }: { mole: MoleGroup; index: number }) {
  const trendPct = Math.round(Math.abs(mole.trend) * 100);
  const isUp = mole.trend > 0.02;
  const isDown = mole.trend < -0.02;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl overflow-hidden"
      style={{ filter: "url(#glass-effect)" }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-white/30 mb-1">
              Mole
            </p>
            <h3 className="text-base font-semibold text-white truncate">{mole.label}</h3>
            <p className="mt-1 text-[11px] text-white/40">
              {mole.scanCount} scan{mole.scanCount !== 1 ? "s" : ""}
              {" · "}
              Last:{" "}
              {mole.lastScan.toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadgeStyle(mole.latestRisk)}`}
            >
              {Math.round(mole.latestRisk * 100)}%
            </span>
            <span className={`text-[10px] font-medium ${riskTextColor(mole.latestRisk)}`}>
              {riskLabel(mole.latestRisk)}
            </span>
          </div>
        </div>

        {/* Trend indicator */}
        {mole.scanCount > 1 && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isUp
                ? "bg-orange-400/10 text-orange-300"
                : isDown
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-white/5 text-white/45"
            }`}
          >
            {isUp ? (
              <TrendingUp className="size-3" />
            ) : isDown ? (
              <TrendingDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {isUp
              ? `+${trendPct}% since last scan`
              : isDown
              ? `-${trendPct}% since last scan`
              : "Stable since last scan"}
          </div>
        )}

        {mole.scanCount === 1 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/35">
            <Activity className="size-3" />
            First scan — scan again to see evolution
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-4 pb-1 border-t border-white/[0.05] pt-3">
        <RiskSparkline scans={mole.scans} chartId={mole.label} />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.05]">
        <Link
          href="/#scan"
          className="text-xs text-cyan-300/60 hover:text-cyan-300 transition-colors"
        >
          Scan again →
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/8 bg-white/5">
        <Activity className="size-7 text-cyan-300/50" />
      </div>
      <h2 className="text-lg font-semibold text-white">No moles tracked yet</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">
        Run a scan on the home page, then hit{" "}
        <span className="text-cyan-300/80 font-medium">Save scan</span> to start
        tracking a mole&apos;s risk over time.
      </p>
      <Link
        href="/#scan"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white no-underline transition hover:from-cyan-400 hover:to-orange-400"
      >
        <ScanLine className="size-4" />
        Start scanning
      </Link>
    </motion.div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MoleGroup = {
  label: string;
  scans: Scan[];
  latestRisk: number;
  trend: number;
  scanCount: number;
  lastScan: Date;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyMolesPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [moles, setMoles] = useState<MoleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/onboarding");
        return;
      }

      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("scanned_at", { ascending: true });

      if (!data) {
        setLoading(false);
        return;
      }

      const grouped: Record<string, Scan[]> = {};
      for (const scan of data as Scan[]) {
        if (!grouped[scan.mole_label]) grouped[scan.mole_label] = [];
        grouped[scan.mole_label].push(scan);
      }

      const moleList: MoleGroup[] = Object.entries(grouped).map(
        ([label, scans]) => {
          const sorted = [...scans].sort(
            (a, b) =>
              new Date(a.scanned_at).getTime() -
              new Date(b.scanned_at).getTime()
          );
          const latest = sorted[sorted.length - 1];
          const prev =
            sorted.length > 1 ? sorted[sorted.length - 2] : null;
          return {
            label,
            scans: sorted,
            latestRisk: latest.malignant_probability,
            trend: prev
              ? latest.malignant_probability - prev.malignant_probability
              : 0,
            scanCount: sorted.length,
            lastScan: new Date(latest.scanned_at),
          };
        }
      );

      moleList.sort((a, b) => b.lastScan.getTime() - a.lastScan.getTime());
      setMoles(moleList);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#020617] overflow-hidden">
      {/* SVG filters */}
      <svg className="absolute inset-0 h-0 w-0" aria-hidden>
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02  0 1 0 0 0.02  0 0 1 0 0.05  0 0 0 0.9 0"
              result="tint"
            />
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={0.2}
        distortion={0.78}
        swirl={0.36}
        grainMixer={0.18}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-50"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={0.14}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(236,254,255,.15),transparent_40%),linear-gradient(180deg,rgba(2,6,23,.55),rgba(2,6,23,.25)_50%,rgba(2,6,23,.75))]" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Back to app
        </button>
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan-300/70" />
          <span className="text-sm font-medium text-white/60">
            Evolution Tracker
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 mx-auto w-full max-w-4xl px-6 pt-10 pb-16">
        {loading ? (
          <div className="flex items-center justify-center mt-20">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        ) : moles.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl font-bold text-white">My Moles</h1>
              <p className="mt-1 text-sm text-white/40">
                {moles.length} mole{moles.length !== 1 ? "s" : ""} tracked ·
                each scan is a new data point on the evolution chart
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {moles.map((mole, i) => (
                <MoleCard key={mole.label} mole={mole} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
