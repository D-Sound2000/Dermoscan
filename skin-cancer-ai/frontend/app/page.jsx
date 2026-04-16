'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import s from './page.module.css';

const API_URL = 'http://localhost:8000/predict-with-heatmap';

// SVG confidence ring constants
const RING_R    = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function Home() {
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [ringReady, setRingReady]     = useState(false);
  const inputRef = useRef(null);

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

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

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

  // Trigger ring fill animation after result renders
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

  const isMalignant = result?.predicted_class === 'Malignant';
  const malProb     = result?.malignant_probability ?? 0;
  const ringOffset  = ringReady ? RING_CIRC * (1 - malProb) : RING_CIRC;
  const ringStroke  = isMalignant ? 'var(--malignant)' : 'var(--benign)';

  return (
    <div className={s.root}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className={s.nav}>
        <div className={s.navLeft}>
          <div className={s.logoMark} aria-hidden>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="6.5" cy="6.5" r="1.6" fill="currentColor"/>
              <line x1="6.5" y1="1"  x2="6.5" y2="3"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="6.5" y1="10" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="1"   y1="6.5" x2="3"   y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="10"  y1="6.5" x2="12"  y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={s.navBrand}>DermoScan</span>
        </div>
        <div className={s.navRight}>
          <span className={s.navTag}>DenseNet121</span>
          <span className={s.navTag}>AUC&nbsp;0.9869</span>
          <div className={s.liveChip}>
            <span className={s.liveDot} aria-hidden />
            <span>Live</span>
          </div>
        </div>
      </nav>

      <main className={s.main}>

        {/* ── Upload state ──────────────────────────────────────── */}
        {!result && (
          <>
            <header className={s.hero}>
              <div className={s.heroEyebrow}>AI-Assisted Dermatology</div>
              <h1 className={s.heroTitle}>Skin Lesion Analysis</h1>
              <p className={s.heroPara}>
                Upload a dermoscopy image for instant malignancy screening.
                DenseNet121 trained on ISIC data — binary classification with Grad-CAM visualisation.
              </p>
            </header>

            <section className={s.panel} aria-label="Image upload">
              <div className={s.panelHead}>
                <span className={s.stepNum}>01</span>
                <span className={s.stepLabel}>Upload Image</span>
              </div>

              <div className={s.panelBody}>
                {/* Scan animation during inference */}
                {loading && (
                  <div className={s.scanWrap} aria-live="polite" aria-label="Analysing image">
                    <img src={preview} alt="" className={s.scanImg} aria-hidden />
                    <div className={s.scanLine} aria-hidden />
                    <div className={s.scanVignette} aria-hidden />
                    <div className={s.scanCaption}>
                      <span className={s.scanDot} aria-hidden />
                      Analysing lesion…
                    </div>
                  </div>
                )}

                {/* Empty dropzone */}
                {!loading && !preview && (
                  <div
                    className={`${s.dropzone} ${dragging ? s.dragging : ''}`}
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
                      className={s.hiddenInput}
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                    <div className={s.dzIcon} aria-hidden>
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                        <rect x="2" y="6" width="26" height="20" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                        <circle cx="9.5" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M2 20.5l6.5-5.5 4.5 4 5.5-6L26 20.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                        <path d="M15 1.5v7M12.5 4L15 1.5 17.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className={s.dzTitle}>Drop image here</p>
                    <p className={s.dzSub}>or <span className={s.dzLink}>choose file</span></p>
                    <div className={s.dzBadges} aria-label="Accepted formats">
                      <span>JPEG</span>
                      <span>PNG</span>
                    </div>
                  </div>
                )}

                {/* Image preview after selection */}
                {!loading && preview && (
                  <div className={s.previewBox}>
                    <img src={preview} alt="Selected lesion image" className={s.previewImg} />
                    <div className={s.previewMeta}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                        <rect x="1" y="0.5" width="9" height="10" rx="1" stroke="currentColor" strokeWidth="0.9"/>
                        <line x1="3" y1="3.5" x2="8" y2="3.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
                        <line x1="3" y1="5.5" x2="8" y2="5.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
                        <line x1="3" y1="7.5" x2="6" y2="7.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
                      </svg>
                      <span>{file?.name}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={s.errBox} role="alert">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
                      <line x1="6.5" y1="3.5" x2="6.5" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                      <circle cx="6.5" cy="9" r="0.7" fill="currentColor"/>
                    </svg>
                    {error}
                  </div>
                )}

                {preview && !loading && (
                  <div className={s.actions}>
                    <button className={s.btnGhost} onClick={reset}>Clear</button>
                    <button className={s.btnPrimary} onClick={handleSubmit}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
                        <path d="M4 6.5L6 8.5L9.5 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Run Analysis
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── Result state ──────────────────────────────────────── */}
        {result && (
          <div className={s.resultGrid}>

            {/* Left — image panel */}
            <div className={s.imgPanel}>
              <div className={s.panelHead}>
                <span className={s.stepNum}>01</span>
                <span className={s.stepLabel}>Input Image</span>
                <button
                  className={`${s.toggleBtn} ${showHeatmap ? s.toggleActive : ''}`}
                  onClick={() => setShowHeatmap(v => !v)}
                  aria-pressed={showHeatmap}
                >
                  {showHeatmap ? 'Original' : 'Grad-CAM'}
                </button>
              </div>

              <div className={s.imgFrame}>
                <img
                  src={showHeatmap ? result.heatmap_image : preview}
                  alt={showHeatmap ? 'Grad-CAM activation heatmap' : 'Input lesion image'}
                  className={s.frameImg}
                />
                <span className={`${s.corner} ${s.cTL}`} aria-hidden />
                <span className={`${s.corner} ${s.cTR}`} aria-hidden />
                <span className={`${s.corner} ${s.cBL}`} aria-hidden />
                <span className={`${s.corner} ${s.cBR}`} aria-hidden />
              </div>

              <p className={s.imgCaption}>
                {showHeatmap
                  ? 'Activation map — highlighted regions drove the prediction'
                  : file?.name}
              </p>
            </div>

            {/* Right — analysis report */}
            <div className={s.reportPanel}>
              <div className={s.panelHead}>
                <span className={s.stepNum}>02</span>
                <span className={s.stepLabel}>Analysis Report</span>
              </div>

              {/* Verdict + confidence ring */}
              <div className={`${s.verdict} ${isMalignant ? s.verdictMal : s.verdictBen}`}>
                <div className={s.verdictInfo}>
                  <div className={s.verdictSub}>Classification</div>
                  <div className={s.verdictClass}>{result.predicted_class}</div>
                  <div className={s.verdictThresh}>
                    Threshold&nbsp;{(result.threshold_used * 100).toFixed(1)}%
                  </div>
                </div>
                <div className={s.ringWrap}>
                  <svg
                    width="120" height="120" viewBox="0 0 120 120"
                    role="img"
                    aria-label={`Malignant probability ${(malProb * 100).toFixed(1)} percent`}
                  >
                    <circle cx="60" cy="60" r={RING_R} fill="none"
                      stroke="currentColor" strokeWidth="7" opacity="0.1" />
                    <circle cx="60" cy="60" r={RING_R} fill="none"
                      stroke={ringStroke} strokeWidth="7"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={ringOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                    <text x="60" y="54" textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: '17px', fontWeight: '600', fontFamily: 'var(--font-sans)', fill: 'var(--text)' }}>
                      {(malProb * 100).toFixed(1)}%
                    </text>
                    <text x="60" y="71" textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: '7.5px', fontWeight: '500', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}>
                      MALIGNANT
                    </text>
                  </svg>
                </div>
              </div>

              {/* Probability bars */}
              <div className={s.barsWrap}>
                <div className={s.barsTitle}>Confidence Breakdown</div>
                {[
                  { label: 'Benign',    value: result.benign_probability,    cls: s.barBen },
                  { label: 'Malignant', value: result.malignant_probability, cls: s.barMal },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={s.barRow}>
                    <div className={s.barMeta}>
                      <span className={s.barLabel}>{label}</span>
                      <span className={s.barPct}>{(value * 100).toFixed(1)}%</span>
                    </div>
                    <div className={s.barTrack}>
                      <div className={`${s.barFill} ${cls}`} style={{ '--w': `${value * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Model provenance */}
              <div className={s.modelMeta}>
                <span>DenseNet121</span>
                <span className={s.mdot}>·</span>
                <span>Epoch 13</span>
                <span className={s.mdot}>·</span>
                <span>Val AUC 0.9869</span>
                <span className={s.mdot}>·</span>
                <span>T&nbsp;=&nbsp;{(result.threshold_used * 100).toFixed(1)}%</span>
              </div>

              {/* Recommendation */}
              <div className={`${s.rec} ${isMalignant ? s.recMal : s.recBen}`}>
                <div className={s.recIcon} aria-hidden>
                  {isMalignant ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1.5L13.5 13H0.5L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      <line x1="7" y1="6" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="7" cy="11.2" r="0.7" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <p className={s.recText}>{result.recommendation}</p>
              </div>

              <p className={s.disclaimer}>
                For informational purposes only — not a substitute for professional clinical
                evaluation. Always consult a qualified dermatologist.
              </p>

              <button className={s.btnPrimaryFull} onClick={reset}>
                New Analysis
              </button>
            </div>

          </div>
        )}

      </main>

      <footer className={s.footer}>
        <span>DermoScan</span>
        <span className={s.ftDot}>·</span>
        <span>DenseNet121 Binary Classifier</span>
        <span className={s.ftDot}>·</span>
        <span>For Research Use Only</span>
      </footer>

    </div>
  );
}
