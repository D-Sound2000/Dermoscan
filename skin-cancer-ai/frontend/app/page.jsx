'use client';

import { useState, useRef, useCallback } from 'react';
import s from './page.module.css';

const API_URL = 'http://localhost:8000/predict';

export default function Home() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
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

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const isMalignant = result?.predicted_class === 'Malignant';

  return (
    <main className={s.main}>

      {/* ── Header ── */}
      <header className={s.header}>
        <div className={s.logoRing}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="9" cy="9" r="2.5" fill="currentColor"/>
            <line x1="9" y1="1.5" x2="9" y2="4"   stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="9" y1="14" x2="9" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="1.5" y1="9" x2="4"   y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="14"  y1="9" x2="16.5" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className={s.title}>DermoScan</h1>
        <p className={s.subtitle}>AI-Assisted Lesion Analysis</p>
      </header>

      {/* ── Upload card ── */}
      {!result && (
        <section className={s.card}>
          <div className={s.sectionLabel}>01 — Upload</div>

          {!preview ? (
            <div
              className={`${s.dropzone} ${dragging ? s.dragging : ''}`}
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              aria-label="Upload lesion image"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className={s.hiddenInput}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div className={s.uploadIconWrap}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                  <rect x="3" y="7" width="22" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="9.5" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3 19.5l5.5-5 4 3.5 5-5.5 7.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                  <path d="M14 1.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M11.5 4.5L14 1.5l2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
              </div>
              <p className={s.dropPrimary}>Drop image here</p>
              <p className={s.dropSecondary}>
                or <span className={s.browse}>click to browse</span> — JPEG / PNG
              </p>
            </div>
          ) : (
            <div className={s.previewWrap}>
              <img src={preview} alt="Selected lesion" className={s.previewImg} />
              <p className={s.fileName}>{file?.name}</p>
            </div>
          )}

          {error && <div className={s.errorBox}>{error}</div>}

          {preview && (
            <div className={s.actions}>
              <button className={s.btnGhost} onClick={reset}>
                Clear
              </button>
              <button
                className={s.btnPrimary}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <span className={s.loadingRow}>
                    <span className={s.spinner} aria-hidden />
                    Analysing…
                  </span>
                ) : (
                  'Analyse Lesion'
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Result card ── */}
      {result && (
        <section className={s.card} key="result">

          {/* Thumbnail */}
          <div className={s.thumb}>
            <img src={preview} alt="Analysed lesion" />
          </div>

          {/* Verdict banner */}
          <div className={`${s.verdict} ${isMalignant ? s.verdictMal : s.verdictBen}`}>
            <span className={s.verdictIcon} aria-hidden>
              {isMalignant ? '⚠' : '✓'}
            </span>
            <span className={s.verdictWord}>{result.predicted_class}</span>
          </div>

          {/* Probability bars */}
          <div className={s.sectionLabel}>Confidence</div>
          <div className={s.bars}>
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
                  <div className={`${s.barFill} ${cls}`} style={{ width: `${value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className={s.sectionLabel}>Recommendation</div>
          <div className={`${s.rec} ${isMalignant ? s.recMal : s.recBen}`}>
            <p className={s.recText}>{result.recommendation}</p>
          </div>

          {/* Disclaimer */}
          <p className={s.disclaimer}>
            For informational purposes only. This does not constitute medical advice.
            Always consult a qualified dermatologist.
          </p>

          <button className={s.btnPrimary} onClick={reset} style={{ width: '100%' }}>
            Analyse Another Image
          </button>
        </section>
      )}

      <footer className={s.footer}>
        DermoScan · DenseNet121 · Binary Classifier
      </footer>
    </main>
  );
}
