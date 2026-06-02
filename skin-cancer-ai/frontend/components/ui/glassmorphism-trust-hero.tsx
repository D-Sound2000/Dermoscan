"use client";

import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Crown,
  Cpu,
  FileScan,
  Gem,
  Layers,
  Microscope,
  Play,
  ScanLine,
  ShieldCheck,
  Star,
  Target,
} from "lucide-react";

const CLIENTS = [
  { name: "DenseNet-121", icon: Cpu },
  { name: "Grad-CAM", icon: Layers },
  { name: "Privacy Review", icon: ShieldCheck },
  { name: "Clinical Context", icon: Microscope },
  { name: "Image Intake", icon: FileScan },
  { name: "Risk Triage", icon: BrainCircuit },
];

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
    <span className="text-xl font-bold text-white sm:text-2xl">{value}</span>
    <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-100/45 sm:text-xs">{label}</span>
  </div>
);

export default function GlassmorphismTrustHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="trust" className="relative w-full overflow-hidden bg-zinc-950 text-white">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .dermo-fade-in {
          animation: fadeSlideIn 0.8s ease-out forwards;
          opacity: 0;
        }
        .dermo-marquee {
          animation: marquee 40s linear infinite;
        }
        .dermo-delay-100 { animation-delay: 0.1s; }
        .dermo-delay-200 { animation-delay: 0.2s; }
        .dermo-delay-300 { animation-delay: 0.3s; }
        .dermo-delay-400 { animation-delay: 0.4s; }
        .dermo-delay-500 { animation-delay: 0.5s; }
        @media (prefers-reduced-motion: reduce) {
          .dermo-fade-in,
          .dermo-marquee {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={reduceMotion ? 0 : 0.2}
        distortion={0.6}
        swirl={0.26}
        grainMixer={0.14}
        grainOverlay={0.06}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-[0.56]"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={reduceMotion ? 0 : 0.12}
        distortion={0.36}
        swirl={0.16}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(236,254,255,.3),transparent_30%),linear-gradient(180deg,rgba(2,6,23,.52),rgba(2,6,23,.28)_42%,rgba(2,6,23,.72))]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgba(26,26,26,0.7)] to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col justify-center space-y-8 pt-8 lg:col-span-7">
            <div className="dermo-fade-in dermo-delay-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-white/15">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-50/80 sm:text-xs">
                  DermoScan trust layer
                  <Star className="h-3.5 w-3.5 fill-cyan-200 text-cyan-200" />
                </span>
              </div>
            </div>

            <h2 className="dermo-fade-in dermo-delay-200 text-5xl font-medium leading-[0.92] tracking-normal sm:text-6xl lg:text-7xl xl:text-8xl">
              AI Skin Review
              <br />
              <span className="text-cyan-100 drop-shadow-[0_0_24px_rgba(34,211,238,0.28)]">
                With Visual Evidence
              </span>
              <br />
              Built for Care
            </h2>

            <p className="dermo-fade-in dermo-delay-300 max-w-xl text-lg leading-relaxed text-white/68">
              DermoScan pairs probability scoring with explainable heatmaps, helping patients and reviewers understand
              what the model saw while keeping medical judgment firmly in human hands.
            </p>

            <div className="dermo-fade-in dermo-delay-400 flex flex-col gap-4 sm:flex-row">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 no-underline transition-all hover:scale-[1.02] hover:bg-cyan-50 active:scale-[0.98]"
              >
                Open DermoScan
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="#trust"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-8 py-4 text-sm font-semibold text-white no-underline backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/15"
              >
                <Play className="h-4 w-4 fill-current" />
                Review model evidence
              </a>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5 lg:mt-12">
            <div className="dermo-fade-in dermo-delay-500 relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
              <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-100/10 blur-3xl" />

              <div className="relative z-10">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                    <Target className="h-6 w-6 text-cyan-100" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold tracking-normal text-white">0.9869</div>
                    <div className="text-sm text-white/55">Validation AUC</div>
                  </div>
                </div>

                <div className="mb-8 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/55">Explainability coverage</span>
                    <span className="font-medium text-white">100%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-950/45">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-100 via-white to-orange-200" />
                  </div>
                </div>

                <div className="mb-6 h-px w-full bg-white/10" />

                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 text-center">
                  <StatItem value="2" label="Classes" />
                  <div className="mx-auto h-full w-px bg-white/10" />
                  <StatItem value="121" label="Layers" />
                  <div className="mx-auto h-full w-px bg-white/10" />
                  <StatItem value="CAM" label="Evidence" />
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-medium tracking-wide text-cyan-50/80">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    ACTIVE
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-medium tracking-wide text-cyan-50/80">
                    <Crown className="h-3 w-3 text-orange-300" />
                    REVIEW FIRST
                  </div>
                </div>
              </div>
            </div>

            <div className="dermo-fade-in dermo-delay-500 relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 py-8 backdrop-blur-xl">
              <h3 className="mb-6 px-8 text-sm font-medium text-white/58">Trusted by transparent AI signals</h3>

              <div
                className="relative flex overflow-hidden"
                style={{
                  maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                }}
              >
                <div className="dermo-marquee flex gap-12 whitespace-nowrap px-4">
                  {[...CLIENTS, ...CLIENTS, ...CLIENTS].map((client, i) => (
                    <div
                      key={`${client.name}-${i}`}
                      className="flex cursor-default items-center gap-2 opacity-55 transition-all hover:scale-105 hover:opacity-100"
                    >
                      <client.icon className="h-6 w-6 text-white" />
                      <span className="text-lg font-bold tracking-normal text-white">{client.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dermo-fade-in dermo-delay-500 grid grid-cols-2 gap-3">
              {[
                { label: "AI support", icon: Activity },
                { label: "Visual evidence", icon: ScanLine },
                { label: "Secure review", icon: ShieldCheck },
                { label: "Premium clarity", icon: Gem },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                  <item.icon className="h-5 w-5 text-cyan-100" />
                  <span className="text-sm font-medium text-white/78">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
