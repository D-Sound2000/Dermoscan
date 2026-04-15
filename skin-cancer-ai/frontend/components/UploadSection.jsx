'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const API_URL = 'http://localhost:8000/predict-with-heatmap';
const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function UploadSection() {
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [ringReady, setRingReady]     = useState(false);
  const inputRef = useRef(null);

  /* ── Handlers ──────────────────────────────────────────── */

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setError('Please upload a JPEG or PNG image.');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setShowHeatmap(false);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(API_URL, { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message || 'Could not reach the analysis server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setRingReady(true), 80);
      return () => clearTimeout(t);
    }
    setRingReady(false);
  }, [result]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowHeatmap(false);
    setRingReady(false);
  };

  /* ── Derived state ─────────────────────────────────────── */

  const isMalignant = result?.predicted_class === 'Malignant';
  const malProb     = result?.malignant_probability ?? 0;
  const ringOffset  = ringReady ? RING_CIRC * (1 - malProb) : RING_CIRC;
  const ringStroke  = isMalignant ? 'var(--malignant)' : 'var(--benign)';

  /* ── Render ────────────────────────────────────────────── */

  return (
    <section id="upload" className="bg-[#0A0A0F] text-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">

        {/* Section header — only when no result */}
        {!result && (
          <div className="text-center mb-10 animate-fade-up">
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-violet-accent">
              Try It Now
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3">
              Analyze a Skin Lesion
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">
              Upload a dermoscopy image for instant malignancy screening with
              Grad-CAM visualisation.
            </p>
          </div>
        )}

        {/* ── Upload card ─────────────────────────────── */}
        {!result && (
          <div className="w-full max-w-lg bg-dark-surface border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 animate-fade-up">
            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-dark-surface-2">
              <span className="font-mono text-[0.6rem] tracking-wider text-violet-accent bg-violet-dim border border-violet-accent/20 rounded px-2 py-0.5">
                01
              </span>
              <span className="text-sm font-medium">Upload Image</span>
            </div>

            <div className="flex flex-col gap-4 p-5">
              {/* Scan animation */}
              {loading && (
                <div className="relative rounded-lg overflow-hidden bg-black border border-white/[0.06] aspect-[4/3]">
                  <img src={preview} alt="" className="w-full h-full object-contain opacity-60 grayscale-[20%]" aria-hidden />
                  <div
                    className="absolute left-0 right-0 h-[2px] pointer-events-none animate-scan-down"
                    style={{
                      background: 'linear-gradient(90deg,transparent 5%,var(--accent) 30%,var(--accent) 70%,transparent 95%)',
                      boxShadow: '0 0 18px 6px var(--accent-glow)',
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,0.45) 0%, transparent 18%, transparent 82%, rgba(10,10,15,0.45) 100%)' }} />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-dark-bg/85 backdrop-blur-md border border-white/[0.08] rounded-full px-4 py-1.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-accent animate-pulse-dot" />
                    Analysing lesion…
                  </div>
                </div>
              )}

              {/* Dropzone */}
              {!loading && !preview && (
                <div
                  className={`border-[1.5px] border-dashed rounded-lg p-10 flex flex-col items-center gap-2.5 cursor-pointer transition-colors outline-none text-center ${
                    dragging
                      ? 'border-violet-accent bg-violet-dim'
                      : 'border-white/[0.12] hover:border-violet-accent hover:bg-violet-dim'
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                  aria-label="Upload dermoscopy image"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  <div className="w-14 h-14 rounded-full bg-dark-surface-2 border border-white/[0.08] flex items-center justify-center text-gray-400 transition-all group-hover:text-violet-accent mb-1">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                      <rect x="2" y="5" width="24" height="19" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M2 19l6-5 4 3.5 5-5.5 9 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                      <path d="M14 1v6M11.5 3.5L14 1l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white">Drop image here</p>
                  <p className="text-xs text-gray-400">or <span className="text-violet-accent underline underline-offset-2">choose file</span></p>
                  <div className="flex gap-2 mt-1">
                    <span className="font-mono text-[0.6rem] tracking-wider text-gray-500 bg-dark-surface-2 border border-white/[0.06] rounded px-2 py-0.5">JPEG</span>
                    <span className="font-mono text-[0.6rem] tracking-wider text-gray-500 bg-dark-surface-2 border border-white/[0.06] rounded px-2 py-0.5">PNG</span>
                  </div>
                </div>
              )}

              {/* Preview */}
              {!loading && preview && (
                <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-black">
                  <img src={preview} alt="Selected lesion" className="w-full max-h-72 object-contain" />
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.06] font-mono text-[0.6rem] text-gray-500">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <rect x="1" y="0.5" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="0.8" />
                      <line x1="2.5" y1="3" x2="7.5" y2="3" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
                      <line x1="2.5" y1="5" x2="7.5" y2="5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
                      <line x1="2.5" y1="7" x2="5.5" y2="7" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
                    </svg>
                    {file?.name}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.22)] rounded-lg px-4 py-3 text-sm text-malignant" role="alert">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.1" />
                    <line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <circle cx="7" cy="9.5" r="0.7" fill="currentColor" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Actions */}
              {preview && !loading && (
                <div className="flex gap-3">
                  <button onClick={reset} className="px-4 py-2.5 border border-white/[0.1] rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:border-white/20 hover:bg-dark-surface-2 transition-colors">
                    Clear
                  </button>
                  <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 bg-violet-accent text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 hover:-translate-y-px transition-all shadow-lg shadow-violet-accent/20">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M4 6.5L6 8.5L9.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Run Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Results ────────────────────────────────── */}
        {result && (
          <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up">

            {/* Image panel */}
            <div className="bg-dark-surface border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-dark-surface-2">
                <span className="font-mono text-[0.6rem] tracking-wider text-violet-accent bg-violet-dim border border-violet-accent/20 rounded px-2 py-0.5">01</span>
                <span className="text-sm font-medium">Input Image</span>
                <button
                  onClick={() => setShowHeatmap((v) => !v)}
                  className={`ml-auto font-mono text-[0.6rem] tracking-wider border rounded px-2.5 py-1 transition-colors ${
                    showHeatmap
                      ? 'text-violet-accent border-violet-accent/30 bg-violet-dim'
                      : 'text-gray-400 border-white/[0.08] hover:text-white hover:border-white/20'
                  }`}
                  aria-pressed={showHeatmap}
                >
                  {showHeatmap ? 'Original' : 'Grad-CAM'}
                </button>
              </div>

              <div className="relative bg-black min-h-[220px] flex items-center justify-center">
                <img
                  src={showHeatmap ? result.heatmap_image : preview}
                  alt={showHeatmap ? 'Grad-CAM activation heatmap' : 'Input lesion image'}
                  className="w-full max-h-[360px] object-contain"
                />
                {/* Corner brackets */}
                <span className="absolute top-2.5 left-2.5 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-violet-accent/50" aria-hidden />
                <span className="absolute top-2.5 right-2.5 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-violet-accent/50" aria-hidden />
                <span className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-violet-accent/50" aria-hidden />
                <span className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-violet-accent/50" aria-hidden />
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.06] bg-dark-surface-2 font-mono text-[0.6rem] text-gray-500 truncate">
                {showHeatmap ? 'Activation map — highlighted regions drove the prediction' : file?.name}
              </div>
            </div>

            {/* Report panel */}
            <div className="bg-dark-surface border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-dark-surface-2">
                <span className="font-mono text-[0.6rem] tracking-wider text-violet-accent bg-violet-dim border border-violet-accent/20 rounded px-2 py-0.5">02</span>
                <span className="text-sm font-medium">Analysis Report</span>
              </div>

              <div className="flex flex-col gap-5 p-5">
                {/* Verdict + ring */}
                <div className={`flex items-center justify-between rounded-xl p-5 gap-3 ${
                  isMalignant
                    ? 'bg-[rgba(248,113,113,0.07)] border border-[rgba(248,113,113,0.2)]'
                    : 'bg-[rgba(45,212,165,0.07)] border border-[rgba(45,212,165,0.2)]'
                }`}>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-gray-400">Classification</span>
                    <span className={`font-display text-3xl font-semibold ${isMalignant ? 'text-malignant' : 'text-benign'}`}>
                      {result.predicted_class}
                    </span>
                    <span className="font-mono text-[0.6rem] text-gray-500">
                      Threshold&nbsp;{(result.threshold_used * 100).toFixed(1)}%
                    </span>
                  </div>

                  <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Malignant probability ${(malProb * 100).toFixed(1)}%`} className="flex-shrink-0">
                    <circle cx="60" cy="60" r={RING_R} fill="none" stroke="currentColor" strokeWidth="7" opacity="0.1" />
                    <circle
                      cx="60" cy="60" r={RING_R} fill="none"
                      stroke={ringStroke} strokeWidth="7"
                      strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset}
                      strokeLinecap="round" transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                    <text x="60" y="54" textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: '17px', fontWeight: '600', fontFamily: 'var(--font-sans)', fill: '#E2E8F0' }}>
                      {(malProb * 100).toFixed(1)}%
                    </text>
                    <text x="60" y="71" textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: '7.5px', fontWeight: '500', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', fill: '#7C93B8' }}>
                      MALIGNANT
                    </text>
                  </svg>
                </div>

                {/* Bars */}
                <div className="flex flex-col gap-3">
                  <span className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-gray-400">Confidence Breakdown</span>
                  {[
                    { label: 'Benign',    value: result.benign_probability,    color: 'bg-benign' },
                    { label: 'Malignant', value: result.malignant_probability, color: 'bg-malignant' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="font-mono text-sm font-medium">{(value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-[5px] bg-dark-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full animate-bar-grow ${color}`}
                          style={{ '--w': `${value * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Model meta */}
                <div className="flex flex-wrap gap-1.5 font-mono text-[0.6rem] text-gray-500">
                  <span>DenseNet121</span><span className="text-gray-700">·</span>
                  <span>Epoch 13</span><span className="text-gray-700">·</span>
                  <span>Val AUC 0.9869</span><span className="text-gray-700">·</span>
                  <span>T&nbsp;=&nbsp;{(result.threshold_used * 100).toFixed(1)}%</span>
                </div>

                {/* Recommendation */}
                <div className={`flex gap-3 items-start rounded-lg p-4 ${
                  isMalignant
                    ? 'bg-[rgba(248,113,113,0.07)] border-l-[3px] border-malignant'
                    : 'bg-[rgba(45,212,165,0.07)] border-l-[3px] border-benign'
                }`}>
                  <div className={`flex-shrink-0 mt-0.5 ${isMalignant ? 'text-malignant' : 'text-benign'}`}>
                    {isMalignant ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L13.5 13H0.5L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><line x1="7" y1="6" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="11.2" r="0.7" fill="currentColor" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{result.recommendation}</p>
                </div>

                {/* Disclaimer */}
                <p className="text-[0.7rem] text-gray-500 text-center leading-relaxed">
                  For informational purposes only — not a substitute for professional
                  clinical evaluation. Always consult a qualified dermatologist.
                </p>

                {/* New Analysis */}
                <button onClick={reset} className="w-full flex items-center justify-center gap-2 bg-violet-accent text-white rounded-lg px-5 py-3 text-sm font-medium hover:opacity-90 hover:-translate-y-px transition-all shadow-lg shadow-violet-accent/20">
                  New Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
