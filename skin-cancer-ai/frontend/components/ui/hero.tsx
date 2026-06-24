"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookmarkPlus,
  Camera,
  Check,
  Eye,
  FileScan,
  Flame,
  ImagePlus,
  Loader2,
  MessageCircle,
  Microscope,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { Header } from "@/components/ui/header-2";
import { createClient } from "@/lib/supabase";

const signalCards = [
  { label: "Validation AUC", value: "93%", icon: BarChart3 },
  { label: "Inference Model", value: "DenseNet", icon: Microscope },
  { label: "Explainability", value: "Grad-CAM", icon: FileScan },
  { label: "Use Case", value: "Review", icon: ShieldCheck },
];

type Prediction = {
  report_id: string;
  predicted_class: string;
  malignant_probability: number;
  benign_probability: number;
  threshold_used: number;
  recommendation: string;
};

type HeatmapPrediction = Prediction & {
  heatmap_image: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_DERMOSCAN_API_URL ?? "http://localhost:8000";

const formatProbability = (value: number) => `${Math.round(value * 100)}%`;

export default function ShaderShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [heatmapImage, setHeatmapImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
  const reduceMotion = useReducedMotion();
  const supabaseRef = useRef(createClient());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [moleInput, setMoleInput] = useState("");
  const [existingMoles, setExistingMoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMole, setSavedMole] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const chooseFile = (file: File | undefined) => {
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setUploadError("Please upload a JPEG or PNG dermoscopy image.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setHeatmapImage(null);
    setUploadError(null);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrediction(null);
    setHeatmapImage(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const requestPrediction = async <T extends Prediction>(endpoint: "predict" | "predict-with-heatmap") => {
    if (!selectedFile) throw new Error("Choose a JPEG or PNG image first.");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof payload?.detail === "string" ? payload.detail : "The Python model did not return a prediction.";
      throw new Error(detail);
    }

    return payload as T;
  };

  const rememberReport = (payload: Prediction) => {
    window.localStorage.setItem("dermoscan.latestReportId", payload.report_id);
  };

  const analyzeFile = async () => {
    if (!selectedFile) {
      inputRef.current?.click();
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    setPrediction(null);
    setHeatmapImage(null);
    setSavedMole(null);

    try {
      const payload = await requestPrediction("predict");
      setPrediction(payload);
      rememberReport(payload);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not reach the DermoScan backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewHeatmap = async () => {
    if (!selectedFile) return;

    setIsHeatmapLoading(true);
    setUploadError(null);
    setSavedMole(null);

    try {
      const payload = await requestPrediction<HeatmapPrediction>("predict-with-heatmap");
      setPrediction(payload);
      rememberReport(payload);
      setHeatmapImage(payload.heatmap_image);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not load the Grad-CAM heatmap.");
    } finally {
      setIsHeatmapLoading(false);
    }
  };

  const openSaveModal = async () => {
    const { data: { user } } = await supabaseRef.current.auth.getUser();
    if (!user) return;
    const { data } = await supabaseRef.current
      .from("scans")
      .select("mole_label")
      .eq("user_id", user.id);
    const allLabels = (data ?? []).map((r: { mole_label: string }) => r.mole_label);
    const labels = allLabels.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    setExistingMoles(labels);
    setMoleInput("");
    setShowSaveModal(true);
  };

  const handleSave = async () => {
    if (!prediction || !moleInput.trim()) return;
    const { data: { user } } = await supabaseRef.current.auth.getUser();
    if (!user) return;
    setIsSaving(true);
    await supabaseRef.current.from("scans").insert({
      user_id: user.id,
      mole_label: moleInput.trim(),
      malignant_probability: prediction.malignant_probability,
      benign_probability: prediction.benign_probability,
      predicted_class: prediction.predicted_class,
      report_id: prediction.report_id,
    });
    setIsSaving(false);
    setSavedMole(moleInput.trim());
    setShowSaveModal(false);
  };

  const riskValue = prediction ? Math.round(prediction.malignant_probability * 100) : 0;
  const benignValue = prediction ? Math.round(prediction.benign_probability * 100) : 0;
  const isMalignant = prediction?.predicted_class.toLowerCase() === "malignant";

  return (
    <section id="overview" ref={containerRef} className="relative min-h-screen scroll-mt-32 overflow-hidden bg-black text-white">
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
        className="absolute inset-0 h-full w-full opacity-[0.62]"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={reduceMotion ? 0 : 0.18}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(236,254,255,.28),transparent_33%),linear-gradient(90deg,rgba(2,6,23,.66),rgba(2,6,23,.24)_48%,rgba(2,6,23,.56))]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

      <Header />

      <main className="relative z-20 grid min-h-screen items-end px-6 pb-8 pt-28 md:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-8">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              className="relative mx-auto mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm"
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
              <span className="block text-4xl font-black text-cyan-100/90 md:text-5xl lg:text-6xl">
                Review skin lesions
              </span>
              <span className="block drop-shadow-2xl">with AI</span>
              <span className="block font-black text-white/80">and explainable heatmaps</span>
            </motion.h1>

            <motion.p
              className="mx-auto mb-8 max-w-2xl text-lg font-light leading-relaxed text-white/72"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.68 }}
            >
              Upload a lesion. Get a score, a heatmap, and the reasoning behind both.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.86 }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="#scan"
                  className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-9 py-4 text-sm font-semibold text-white no-underline shadow-lg shadow-cyan-950/40 transition-all duration-300 hover:from-cyan-400 hover:to-orange-400"
                >
                  Start scan
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="#signals"
                  className="inline-flex rounded-full border-2 border-white/25 bg-transparent px-9 py-4 text-sm font-medium text-white no-underline backdrop-blur-sm transition-all duration-300 hover:border-cyan-300/50 hover:bg-white/10 hover:text-cyan-50"
                >
                  See model signals
                </Link>
              </motion.div>
            </motion.div>

            <motion.section
              id="scan"
              className="mx-auto mt-6 grid w-full max-w-4xl scroll-mt-32 gap-3 rounded-[2rem] border border-white/[0.08] bg-white/10 p-3 text-left shadow-2xl shadow-cyan-950/25 backdrop-blur-2xl lg:grid-cols-[minmax(18rem,0.86fr)_minmax(0,1fr)]"
              style={{ filter: "url(#glass-effect)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.02 }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  chooseFile(event.dataTransfer.files?.[0]);
                }}
                className={`group relative overflow-hidden rounded-[1.45rem] border border-dashed p-4 transition-all duration-300 ${
                  isDragging
                    ? "border-cyan-200/80 bg-cyan-100/15 shadow-[0_0_42px_rgba(34,211,238,0.22)]"
                    : "border-white/[0.08] bg-black/25 hover:border-cyan-200/45 hover:bg-white/10"
                }`}
              >
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
                <div className="grid min-h-[19rem] gap-4">
                  <button
                    type="button"
                    aria-label="Upload a JPEG or PNG lesion image"
                    onClick={() => inputRef.current?.click()}
                    className="grid aspect-square min-h-0 place-items-center overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-white/10 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  >
                    <span className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt={selectedFile?.name ?? "Selected lesion image"} className="h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-16 text-left">
                            <span className="block truncate text-sm font-semibold text-white">{selectedFile?.name}</span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">Ready to scan</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="mb-4 grid size-16 place-items-center rounded-full border border-cyan-100/20 bg-cyan-100/10 text-cyan-100 transition group-hover:scale-105">
                            <ImagePlus className="size-8" />
                          </span>
                          <span className="max-w-56 text-balance text-xl font-semibold text-white">Drop image here</span>
                          <span className="mt-2 max-w-60 text-sm leading-6 text-white/68">Drop a dermoscopy image, or click to browse</span>
                        </>
                      )}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/65">Python model upload</p>
                      <p className="mt-1 truncate text-sm text-white/60">{selectedFile ? selectedFile.name : "No image selected"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white/85 transition hover:bg-white/20"
                      >
                        <Camera className="size-4" />
                        Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white/85 transition hover:bg-white/20"
                      >
                        <UploadCloud className="size-4" />
                        Upload
                      </button>
                      {selectedFile ? (
                        <button
                          type="button"
                          aria-label="Clear selected image"
                          onClick={clearSelection}
                          className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div id="results" className="scroll-mt-32 rounded-[1.45rem] border border-white/[0.08] bg-black/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/65">Scan result</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {prediction ? prediction.predicted_class : isSubmitting ? "Analyzing image" : "Awaiting scan"}
                    </h2>
                  </div>
                  <div className={`grid size-14 place-items-center rounded-full border ${
                    prediction
                      ? isMalignant
                        ? "border-orange-200/35 bg-orange-400/15 text-orange-100"
                        : "border-emerald-200/35 bg-emerald-400/15 text-emerald-100"
                      : "border-white/15 bg-white/10 text-cyan-100"
                  }`}>
                    {isSubmitting ? <Loader2 className="size-6 animate-spin" /> : prediction ? <ThermometerSun className="size-6" /> : <FileScan className="size-6" />}
                  </div>
                </div>

                <div aria-live="polite" className="mt-4 min-h-12 rounded-[1rem] border border-white/[0.08] bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white/68">
                  {uploadError ? (
                    <span className="text-orange-100">{uploadError}</span>
                  ) : prediction ? (
                    <span>{prediction.recommendation}</span>
                  ) : (
                    <span>{selectedFile ? "Image loaded. Run scan to receive probabilities and heatmap access." : "Upload a lesion image to call the backend model."}</span>
                  )}
                </div>

                <div className="mt-4 rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                    <span className="text-emerald-100/80">Benign {prediction ? formatProbability(prediction.benign_probability) : <span className="text-white/30">—</span>}</span>
                    <span className="text-orange-100/80">Malignant {prediction ? formatProbability(prediction.malignant_probability) : <span className="text-white/30">—</span>}</span>
                  </div>
                  <div className="relative mt-3 h-5 overflow-hidden rounded-full border border-white/[0.08] bg-white/10">
                    {prediction ? (
                      <>
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-300 to-cyan-200 transition-[width] duration-700" style={{ width: `${benignValue}%` }} />
                        <div className="absolute inset-y-0 right-0 bg-gradient-to-r from-orange-300 to-red-400 transition-[width] duration-700" style={{ width: `${riskValue}%` }} />
                        <div className="absolute inset-y-0 w-px bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-[left] duration-700" style={{ left: `${benignValue}%` }} />
                      </>
                    ) : (
                      <div className="absolute inset-y-0 left-0 w-1/2 bg-white/[0.16]" />
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-emerald-300/10 p-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-100/65">Benign</span>
                      <strong className="mt-2 block text-3xl text-emerald-100">{prediction ? formatProbability(prediction.benign_probability) : <span className="text-white/30">—</span>}</strong>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-orange-300/10 p-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-100/65">Malignant</span>
                      <strong className="mt-2 block text-3xl text-orange-100">{prediction ? formatProbability(prediction.malignant_probability) : <span className="text-white/30">—</span>}</strong>
                    </div>
                  </div>
                </div>

                {heatmapImage ? (
                  <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-black/30">
                    <img src={heatmapImage} alt="Grad-CAM heatmap for selected lesion" className="h-56 w-full object-cover" />
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-cyan-50/75">
                      <Flame className="size-4 text-orange-200" />
                      Grad-CAM heatmap generated from the malignant-class activation.
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <motion.button
                    type="button"
                    onClick={analyzeFile}
                    disabled={isSubmitting || isHeatmapLoading}
                    whileHover={isSubmitting || isHeatmapLoading ? undefined : { scale: 1.03 }}
                    whileTap={isSubmitting || isHeatmapLoading ? undefined : { scale: 0.97 }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-950/35 transition hover:from-cyan-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <FileScan className="size-4" />}
                    {selectedFile ? "Run scan" : "Choose image"}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={viewHeatmap}
                    disabled={!prediction || isSubmitting || isHeatmapLoading}
                    whileHover={!prediction || isSubmitting || isHeatmapLoading ? undefined : { scale: 1.03 }}
                    whileTap={!prediction || isSubmitting || isHeatmapLoading ? undefined : { scale: 0.97 }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white/85 transition hover:border-cyan-200/45 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isHeatmapLoading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                    {heatmapImage ? "Refresh heatmap" : "View heatmap"}
                  </motion.button>
                  <Link
                    href={prediction ? `/chat?reportId=${prediction.report_id}` : "/chat"}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white/85 no-underline transition hover:border-cyan-200/45 hover:bg-white/20 ${
                      prediction ? "" : "pointer-events-none opacity-45"
                    }`}
                    aria-disabled={!prediction}
                  >
                    <MessageCircle className="size-4" />
                    Ask report
                  </Link>
                </div>

                {prediction && !savedMole && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/40 bg-[#071e2c]/80 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
                        <TrendingUp className="size-3.5 shrink-0" />
                        Track evolution
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-white/60">
                        Save to mole history to chart risk over time
                      </p>
                    </div>
                    <button
                      onClick={openSaveModal}
                      className="shrink-0 rounded-full border border-cyan-400/60 bg-cyan-500/25 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/40 hover:text-white"
                    >
                      Save scan
                    </button>
                  </motion.div>
                )}

                {prediction && savedMole && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/20">
                      <Check className="size-3 text-emerald-300" />
                    </span>
                    <p className="text-xs text-emerald-200/75">
                      Saved to{" "}
                      <span className="font-semibold text-emerald-200">"{savedMole}"</span>
                      {" · "}
                      <a
                        href="/my-moles"
                        className="underline underline-offset-2 transition-colors hover:text-emerald-100"
                      >
                        View history →
                      </a>
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.section>
          </div>

            <motion.aside
              id="signals"
              className="relative mx-auto w-full max-w-4xl scroll-mt-32 rounded-[2rem] border border-white/[0.08] bg-white/10 p-5 text-left shadow-2xl shadow-black/30 backdrop-blur-2xl"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/60">Model Intelligence</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Transparent triage</h2>
                </div>
                <Activity className="size-6 text-cyan-200" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {showSaveModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm rounded-[1.5rem] border border-white/20 bg-[#0c1e28] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl border border-cyan-400/35 bg-cyan-400/15">
                <BookmarkPlus className="size-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Save scan</h3>
                <p className="text-[11px] text-white/55">Track this mole&apos;s risk over time</p>
              </div>
            </div>

            {existingMoles.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-white/45">
                  Your moles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {existingMoles.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMoleInput(m)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition ${
                        moleInput === m
                          ? "border-cyan-400/60 bg-cyan-400/25 text-cyan-200"
                          : "border-white/20 bg-white/8 text-white/70 hover:border-white/35 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">
                {existingMoles.length ? "Mole name" : "Name this mole"}
              </label>
              <input
                type="text"
                value={moleInput}
                onChange={(e) => setMoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder={
                  existingMoles.length
                    ? "Select above or type a new name"
                    : 'e.g. "Left shoulder", "Back of neck"'
                }
                className="w-full rounded-xl border border-white/20 bg-[#071318] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/60 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-full border border-white/20 bg-white/8 py-2.5 text-sm text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!moleInput.trim() || isSaving}
                className="flex-1 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
