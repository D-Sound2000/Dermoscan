"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  FileScan,
  Microscope,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const navItems = [
  { label: "Trust Layer", href: "#trust" },
  { label: "Model Signals", href: "#trust" },
  { label: "Review Flow", href: "#trust" },
];

const signalCards = [
  { label: "Validation AUC", value: "0.9869", icon: BarChart3 },
  { label: "Inference Model", value: "DenseNet", icon: Microscope },
  { label: "Explainability", value: "Grad-CAM", icon: FileScan },
  { label: "Use Case", value: "Review", icon: ShieldCheck },
];

const particlePoints = [
  { left: "24%", top: "28%", delay: 0 },
  { left: "38%", top: "18%", delay: 0.22 },
  { left: "58%", top: "31%", delay: 0.44 },
  { left: "72%", top: "20%", delay: 0.66 },
  { left: "44%", top: "52%", delay: 0.88 },
  { left: "68%", top: "58%", delay: 1.1 },
];

export default function ShaderShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => setIsActive(true);
    const handleMouseLeave = () => setIsActive(false);

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden bg-black text-white">
      <svg className="absolute inset-0 h-0 w-0" aria-hidden>
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
              result="tint"
            />
          </filter>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
          <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={reduceMotion ? 0 : isActive ? 0.45 : 0.25}
        distortion={0.78}
        swirl={0.36}
        grainMixer={0.18}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-[0.45]"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={reduceMotion ? 0 : 0.18}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(236,254,255,.18),transparent_33%),linear-gradient(90deg,rgba(2,6,23,.86),rgba(2,6,23,.42)_48%,rgba(2,6,23,.74))]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

      <header className="relative z-20 flex items-center justify-between gap-4 p-5 md:p-6">
        <motion.div
          className="group relative flex cursor-pointer items-center gap-3"
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <motion.div
            className="grid size-11 place-items-center rounded-full border border-cyan-200/20 bg-white/10 text-cyan-100 backdrop-blur-xl"
            style={{ filter: "url(#logo-glow)" }}
            whileHover={{ rotate: [0, -2, 2, 0] }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
          >
            <ScanLine className="size-5" />
          </motion.div>
          <div>
            <div className="text-sm font-semibold tracking-normal text-white">DermoScan</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/60">AI lesion review</div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {particlePoints.map((point) => (
              <motion.div
                key={`${point.left}-${point.top}`}
                className="absolute h-1 w-1 rounded-full bg-cyan-100/70"
                style={{ left: point.left, top: point.top }}
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [-8, -18, -8], opacity: [0, 1, 0], scale: [0, 1, 0] }
                }
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: point.delay, ease: "easeInOut" }}
              />
            ))}
          </div>
        </motion.div>

        <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-1.5 backdrop-blur-xl md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-xs font-medium text-white/75 no-underline transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div id="gooey-btn" className="relative flex items-center group" style={{ filter: "url(#gooey-filter)" }}>
          <Link
            href="#trust"
            aria-label="Explore DermoScan trust layer"
            className="absolute right-0 z-0 flex h-9 -translate-x-10 items-center justify-center rounded-full bg-white px-2.5 py-2 text-xs font-medium text-black no-underline transition-all duration-300 hover:bg-white/90 group-hover:-translate-x-20"
          >
            <ArrowRight className="size-3" />
          </Link>
          <Link
            href="#trust"
            className="z-10 flex h-9 items-center rounded-full bg-white px-6 py-2 text-xs font-medium text-black no-underline transition-all duration-300 hover:bg-white/90"
          >
            Explore
          </Link>
        </div>
      </header>

      <main className="relative z-20 grid min-h-[calc(100vh-92px)] items-end px-6 pb-8 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end">
          <div className="max-w-4xl text-left">
            <motion.div
              className="relative mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm"
              style={{ filter: "url(#glass-effect)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className="absolute left-1 right-1 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
              <span className="relative z-10 flex items-center gap-2 text-sm font-medium tracking-wide text-white/90">
                <Sparkles className="size-4 text-cyan-200" />
                AI dermatology support with visual evidence
              </span>
            </motion.div>

            <motion.h1
              className="mb-6 text-5xl font-bold leading-none tracking-normal text-white md:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.32 }}
            >
              <span className="block text-4xl font-light tracking-wide text-cyan-100/90 md:text-5xl lg:text-6xl">
                Review skin lesions
              </span>
              <span className="block font-black drop-shadow-2xl">with AI</span>
              <span className="block text-white/80 italic">and explainable heatmaps</span>
            </motion.h1>

            <motion.p
              className="mb-8 max-w-2xl text-lg font-light leading-relaxed text-white/72"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.68 }}
            >
              A polished AI lesion-review interface built around transparent scoring, Grad-CAM evidence, and a calmer
              way to understand what the model is seeing.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.86 }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="#trust"
                  className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-9 py-4 text-sm font-semibold text-white no-underline shadow-lg shadow-cyan-950/40 transition-all duration-300 hover:from-cyan-400 hover:to-orange-400"
                >
                  Explore trust layer
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="#trust"
                  className="inline-flex rounded-full border-2 border-white/25 bg-transparent px-9 py-4 text-sm font-medium text-white no-underline backdrop-blur-sm transition-all duration-300 hover:border-cyan-300/50 hover:bg-white/10 hover:text-cyan-50"
                >
                  See model signals
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <motion.aside
            className="relative hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:block"
            initial={{ opacity: 0, x: 32, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/60">Live model context</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Transparent triage</h2>
              </div>
              <Activity className="size-6 text-cyan-200" />
            </div>
            <div className="grid gap-3">
              {signalCards.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="grid size-10 place-items-center rounded-full bg-cyan-200/10 text-cyan-100">
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <strong className="block text-lg leading-none text-white">{item.value}</strong>
                    <span className="mt-1 block text-xs text-white/55">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </main>

      <div className="absolute bottom-8 right-8 z-30 hidden h-20 w-20 items-center justify-center md:flex">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <PulsingBorder
            colors={["#06b6d4", "#0891b2", "#f97316", "#00ff88", "#ffffff"]}
            colorBack="#00000000"
            speed={reduceMotion ? 0 : 1.5}
            roundness={1}
            thickness={0.1}
            softness={0.2}
            intensity={5}
            bloom={0.7}
            spots={5}
            spotSize={0.1}
            pulse={0.1}
            smoke={0.5}
            smokeSize={0.55}
            scale={0.65}
            rotation={0}
            frame={9161408.251009725}
            style={{ width: "60px", height: "60px", borderRadius: "50%" }}
          />

          <motion.svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            style={{ transform: "scale(1.6)" }}
          >
            <defs>
              <path id="dermoscan-circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <text className="fill-white/80 text-[8px] font-medium">
              <textPath href="#dermoscan-circle" startOffset="0%">
                DermoScan • AI support • Grad-CAM heatmaps • clinical review •
              </textPath>
            </text>
          </motion.svg>
        </div>
      </div>
    </section>
  );
}
