'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import s from './page.module.css';

const API_URL = 'http://172.24.76.36:8000/predict-with-heatmap';

/* ── Theme ───────────────────────────────────────────────────── */
function useDarkMode() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('dermoscan-theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggle = useCallback(() => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem('dermoscan-theme', next ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return [isDark, toggle];
}

/* ── Parallax ────────────────────────────────────────────────── */
function useScrollParallax() {
  useEffect(() => {
    let ticking = false;
    const update = () => {
      document.documentElement.style.setProperty('--py', `${window.scrollY}px`);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}

/* ── Cursor glow ─────────────────────────────────────────────── */
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const move = (e) => {
      if (!ref.current) return;
      ref.current.style.left = e.clientX + 'px';
      ref.current.style.top  = e.clientY + 'px';
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return <div ref={ref} className={s.cglow} />;
}

/* ── Silk canvas ─────────────────────────────────────────────── */
function SilkCanvas() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const noise = (x, y) => {
      const G = 2.71828;
      return ((G * Math.sin(G * x)) * (G * Math.sin(G * y)) * (1 + x)) % 1;
    };

    const animate = () => {
      const { width, height } = canvas;
      const img = ctx.createImageData(width, height);
      const d   = img.data;
      const t   = time * 0.018;

      for (let x = 0; x < width; x += 2) {
        for (let y = 0; y < height; y += 2) {
          const u   = (x / width)  * 2.2;
          const v   = (y / height) * 2.2;
          const ty_ = v + 0.028 * Math.sin(7.0 * u - t);
          const pat = 0.5 + 0.5 * Math.sin(
            4.5 * (u + ty_ + Math.cos(2.8 * u + 4.5 * ty_) + 0.02 * t) +
            Math.sin(18 * (u + ty_ - 0.08 * t))
          );
          const rnd       = noise(x * 0.03, y * 0.03);
          const intensity = Math.max(0, pat - rnd / 18);
          const idx       = (y * width + x) * 4;
          if (idx < d.length - 4) {
            d[idx]   = Math.floor(55  * intensity + 8);
            d[idx+1] = Math.floor(30  * intensity + 4);
            d[idx+2] = Math.floor(170 * intensity + 20);
            d[idx+3] = 255;
            if (idx + 4 < d.length) {
              d[idx+4] = d[idx]; d[idx+5] = d[idx+1];
              d[idx+6] = d[idx+2]; d[idx+7] = 255;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      const ov = ctx.createRadialGradient(
        width/2, height/2, 0,
        width/2, height/2, Math.max(width, height) * 0.6
      );
      ov.addColorStop(0, 'rgba(5,5,16,0.1)');
      ov.addColorStop(1, 'rgba(5,5,16,0.72)');
      ctx.fillStyle = ov;
      ctx.fillRect(0, 0, width, height);

      time++;
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className={s.silkCanvas} />;
}

/* ── Theme toggle ────────────────────────────────────────────── */
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      className={s.themeToggle}
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

/* ── Animated counter ────────────────────────────────────────── */
function AnimCounter({ target, suffix = '', duration = 1600 }) {
  const [val, setVal]   = useState(0);
  const ref             = useRef(null);
  const started         = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick  = (now) => {
          const p    = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Tilt card ───────────────────────────────────────────────── */
function TiltCard({ children, className = '', style, intensity = 9 }) {
  const ref = useRef(null);
  const raf = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, gop: 0 });
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setEntered(true);
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const onMove = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left)  / r.width;
    const y = (e.clientY - r.top)   / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() =>
      setTilt({ rx: -(y - 0.5) * intensity, ry: (x - 0.5) * intensity, gx: x * 100, gy: y * 100, gop: 0.13 })
    );
  }, [intensity]);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() =>
      setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, gop: 0 })
    );
  }, []);

  const isResting = tilt.rx === 0 && tilt.ry === 0;

  return (
    <div
      ref={ref}
      className={`${s.tc} ${entered ? s.tcEntered : ''} ${className}`}
      style={{
        ...style,
        transform: entered
          ? `perspective(960px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
          : undefined,
        transition: isResting
          ? 'opacity 0.75s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1), border-color 0.3s'
          : 'transform 0.08s ease, border-color 0.3s',
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        className={s.tcGlare}
        style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${tilt.gop}), transparent 62%)` }}
      />
      <div className={s.tcInner}>{children}</div>
    </div>
  );
}

/* ── Radial accuracy ring ────────────────────────────────────── */
function Radial() {
  const circ = 2 * Math.PI * 46;
  const ref  = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && ref.current) {
        ref.current.style.strokeDashoffset = String(circ * (1 - 0.942));
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current.closest('.' + s.tc) || ref.current);
    return () => obs.disconnect();
  }, [circ]);

  return (
    <div className={s.radwrap}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="oklch(0.62 0.26 298)" />
            <stop offset="100%" stopColor="oklch(0.74 0.28 318)" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          ref={ref}
          cx="55" cy="55" r="46" fill="none"
          stroke="url(#rg)" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 0.3s' }}
        />
        <text x="55" y="50" textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '18px', fill: 'currentColor', fontWeight: 400 }}>
          94.2%
        </text>
        <text x="55" y="66" textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: 'var(--font-sans, system-ui)', fontSize: '8px', fill: 'var(--t3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          accuracy
        </text>
      </svg>
    </div>
  );
}

/* ── Premium scan loader ─────────────────────────────────────── */
function ScanLoader() {
  const [step, setStep] = useState(0);
  const steps = [
    'Preprocessing image',
    'Extracting dermoscopic features',
    'Running DenseNet-121 inference',
    'Applying Grad-CAM attribution',
    'Calibrating confidence score',
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(n => (n + 1) % steps.length), 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={s.sloader}>
      <div className={s.scanRingWrap}>
        <div className={s.scanRingOuter} />
        <div className={s.scanRingMid} />
        <div className={s.scanRingInner} />
        <div className={s.scanCenter}>
          <div className={s.scanCenterDot} />
        </div>
      </div>
      <div key={step} className={s.scanStepText}>{steps[step]}</div>
    </div>
  );
}

/* ── Bento grid ──────────────────────────────────────────────── */
function Bento({ onScan }) {
  return (
    <div className={s.bento}>

      {/* Hero card */}
      <TiltCard className={s.bHero} intensity={5}>
        <div style={{ position: 'absolute', right: 0, top: 0, width: '46%', height: '100%', overflow: 'hidden', borderRadius: '0 var(--rl) var(--rl) 0', zIndex: 0 }}>
          <img src="/wave-bg.avif" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, animation: 'wdrift 22s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, var(--bg) 0%, rgba(5,5,16,0) 100%)' }} />
        </div>
        <div className={s.bp} style={{ position: 'relative', zIndex: 1, width: '58%' }}>
          <div className={s.bk}>AI Dermatology</div>
          <div className={s.bt} style={{ fontSize: 'clamp(22px,2.2vw,30px)', flex: 1, lineHeight: 1.2 }}>
            Early detection<br />changes <em className={s.btEm}>everything.</em>
          </div>
          <div className={s.bb2} style={{ marginBottom: 20, fontSize: 11 }}>
            Melanoma caught in stage I: 98% survival. Stage IV: 23%. Our model closes that gap.
          </div>
          <button className={s.btnPSm} onClick={onScan}>Scan a mole now</button>
        </div>
      </TiltCard>

      {/* Accuracy */}
      <TiltCard className={s.bAcc} intensity={7}>
        <div className={s.bp} style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <div className={s.bk} style={{ marginBottom: 8 }}>Accuracy</div>
            <Radial />
            <div className={s.bsub} style={{ textAlign: 'center' }}>ISIC 2020</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, justifyContent: 'center' }}>
            <div className={s.bk} style={{ marginBottom: 14 }}>Val AUC 0.9869</div>
            {[
              { l: 'Melanoma', v: 96, c: 'var(--accent-hi)' },
              { l: 'BCC',      v: 93, c: 'var(--accent)'    },
              { l: 'SCC',      v: 91, c: 'oklch(0.5 0.22 280)' },
            ].map(m => (
              <div className={s.mrow} key={m.l} style={{ marginBottom: 10 }}>
                <div className={s.mlb}>{m.l}</div>
                <div className={s.mtrk}><div className={s.mfil} style={{ width: `${m.v}%`, background: m.c }} /></div>
                <div className={s.mval}>{m.v}%</div>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* ABCDE */}
      <TiltCard className={s.bAbcde} intensity={9}>
        <div className={s.bp}>
          <div className={s.bk}>Diagnostic Criteria</div>
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 15, fontWeight: 300, color: 'var(--t2)', marginBottom: 16 }}>ABCDE analysis</div>
          <ul className={s.abcde}>
            {[
              ['A', 'Asymmetry — shape irregularity'],
              ['B', 'Border — edge definition'],
              ['C', 'Color — pigmentation variation'],
              ['D', 'Diameter — size mapping'],
              ['E', 'Evolution — pattern tracking'],
            ].map(([tag, label]) => (
              <li key={tag}><span className={s.atag}>{tag}</span>{label}</li>
            ))}
          </ul>
        </div>
      </TiltCard>

      {/* Speed */}
      <TiltCard className={s.bSpd} intensity={9}>
        <div className={s.bp} style={{ justifyContent: 'space-between' }}>
          <div className={s.bk}>Analysis Speed</div>
          <div>
            <div className={s.bnum}>&lt;<AnimCounter target={10} suffix="s" /></div>
            <div className={s.bsub}>per scan</div>
          </div>
          <div className={s.bb2}>Real-time inference. No referrals, no waiting rooms.</div>
        </div>
      </TiltCard>

      {/* Privacy */}
      <TiltCard className={s.bPriv} intensity={11}>
        <div className={s.bp}>
          <div className={s.bk}>Privacy</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 3L31 9L31 20C31 27 18 33 18 33C18 33 5 27 5 20L5 9Z" stroke="var(--border-hi)" strokeWidth="1" />
              <path d="M12 18L16 22L24 14" stroke="var(--accent-hi)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={s.bb2} style={{ fontSize: 11 }}>Images never stored. Inference is ephemeral and private.</div>
        </div>
      </TiltCard>

      {/* CTA */}
      <TiltCard className={s.bCta} intensity={5}>
        <div className={s.ctaWave} />
        <div className={s.ctaOv} />
        <div className={s.bp} style={{ position: 'relative', zIndex: 2, justifyContent: 'space-between' }}>
          <div className={s.bk} style={{ color: 'var(--t3)' }}>Start Now — Free</div>
          <div className={s.bt}>
            Upload a photo.<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>Know your risk</em><br />
            in seconds.
          </div>
          <button className={s.btnPSm} onClick={onScan} style={{ alignSelf: 'flex-start' }}>Begin scan →</button>
        </div>
      </TiltCard>

      {/* Steps */}
      <TiltCard className={s.bSteps} intensity={8}>
        <div className={s.bp}>
          <div className={s.bk}>How It Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, flex: 1 }}>
            {[
              ['01', 'Capture',  'Clear close-up photo in good lighting'],
              ['02', 'Analyse',  'ABCDE criteria via DenseNet-121'],
              ['03', 'Report',   'Risk classification + recommendation'],
            ].map(([n, h, p]) => (
              <div className={s.sm} key={n}>
                <div className={s.smn}>{n}</div>
                <div className={s.smh}>{h}</div>
                <div className={s.smp}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>

    </div>
  );
}

/* ── Results panel ───────────────────────────────────────────── */
function Results({ result, loading, rawResult, onReset }) {
  const [ringReady, setRingReady] = useState(false);

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setRingReady(true), 80);
      return () => clearTimeout(t);
    }
    setRingReady(false);
  }, [result]);

  if (loading) {
    return (
      <div className={s.rc}>
        <div className={s.rh}>
          <div className={s.rlb}>Analysis</div>
          <span className={`${s.vbadge} ${s.vbS}`}>Scanning</span>
        </div>
        <ScanLoader />
      </div>
    );
  }

  if (!result) {
    return (
      <div className={s.rc}>
        <div className={s.rh}><div className={s.rlb}>Analysis Report</div></div>
        <div className={s.rempty}>
          <div className={s.reicon}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--t3)" strokeWidth="1.2">
              <circle cx="9" cy="9" r="7" />
              <path d="M9 6v4M9 12.5h.01" />
            </svg>
          </div>
          <div className={s.reh}>No scan yet</div>
          <div className={s.rep}>Upload a dermoscopy image to receive your AI-powered risk report.</div>
        </div>
      </div>
    );
  }

  const cls      = result.verdict.toLowerCase();
  const bc       = cls === 'benign' ? s.vbB : cls === 'malignant' ? s.vbM : s.vbU;
  const tcls     = cls === 'benign' ? s.vtitleB : cls === 'malignant' ? s.vtitleM : s.vtitleU;
  const vt       = cls === 'benign'
    ? 'Likely Benign'
    : cls === 'malignant'
    ? 'High Risk — See a Dermatologist'
    : 'Uncertain — Seek Professional Review';

  const malignantPct = rawResult ? Math.round(rawResult.malignant_probability * 100) : 0;
  const benignPct    = rawResult ? Math.round(rawResult.benign_probability    * 100) : 0;
  const RING_R       = 46;
  const RING_CIRC    = 2 * Math.PI * RING_R;
  const ringOffset   = ringReady ? RING_CIRC * (1 - (rawResult?.malignant_probability ?? 0)) : RING_CIRC;
  const ringStroke   = cls === 'malignant' ? '#ff6b6b' : '#4cd964';

  return (
    <div className={`${s.rc} ${s.rcResult}`}>
      <div className={s.rh}>
        <div className={s.rlb}>Analysis Report</div>
        <span className={`${s.vbadge} ${bc}`}>{result.verdict}</span>
      </div>
      <div className={s.rbody}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div className={`${s.vtitle} ${tcls}`}>{vt}</div>
            <div className={s.vconf}>Confidence: {result.confidence}</div>
          </div>
          {rawResult && (
            <svg width="96" height="96" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
              <circle cx="55" cy="55" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="55" cy="55" r={RING_R} fill="none"
                stroke={ringStroke} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
              />
              <text x="55" y="50" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '14px', fill: 'currentColor', fontWeight: 400 }}>
                {malignantPct}%
              </text>
              <text x="55" y="66" textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-sans, system-ui)', fontSize: '7px', fill: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                malignant
              </text>
            </svg>
          )}
        </div>

        <div className={s.rdiv} />
        <div className={s.rsum}>{result.summary}</div>

        {rawResult && (
          <>
            <div className={s.rdiv} />
            {[
              { label: 'Benign',    val: benignPct,    color: '#4cd964' },
              { label: 'Malignant', val: malignantPct, color: '#ff6b6b' },
            ].map(m => (
              <div className={s.mrow} key={m.label}>
                <div className={s.mlb}>{m.label}</div>
                <div className={s.mtrk}><div className={s.mfil} style={{ width: `${m.val}%`, background: m.color }} /></div>
                <div className={s.mval}>{m.val}%</div>
              </div>
            ))}
          </>
        )}

        <div className={s.disc}>
          <strong>Medical Disclaimer —</strong> For informational purposes only. Always consult a board-certified dermatologist for any skin concern.
        </div>

        {onReset && (
          <button className={s.rescanBtn} onClick={onReset}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.17" />
            </svg>
            Run another scan
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Scan section ────────────────────────────────────────────── */
function Scan() {
  const [img, setImg]         = useState(null);
  const [drag, setDrag]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [rawResult, setRaw]   = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const fref = useRef(null);

  const reset = useCallback(() => {
    setImg(null);
    setResult(null);
    setRaw(null);
    setShowHeatmap(false);
    setTimeout(() => fref.current?.focus(), 50);
  }, []);

  const proc = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImg({ url: URL.createObjectURL(file), name: file.name, file });
      setResult(null);
      setRaw(null);
      setShowHeatmap(false);
    };
    reader.readAsDataURL(file);
  };

  const analyse = async () => {
    if (!img) return;
    setLoading(true);
    setResult(null);
    setRaw(null);
    try {
      const form = new FormData();
      form.append('file', img.file);
      const res  = await fetch(API_URL, { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setRaw(data);
      const malignantPct = Math.round(data.malignant_probability * 100);
      const benignPct    = Math.round(data.benign_probability    * 100);
      setResult({
        verdict:    data.predicted_class,
        confidence: `${Math.max(malignantPct, benignPct)}%`,
        summary:    data.recommendation,
      });
    } catch (err) {
      setResult({
        verdict:    'Uncertain',
        confidence: 'N/A',
        summary:    err.message || 'Analysis failed. Please try again with a clearer image.',
      });
    }
    setLoading(false);
  };

  const displaySrc = rawResult && showHeatmap ? rawResult.heatmap_image : img?.url;

  return (
    <section id="scan" className={s.scanSection} data-section-label="03 Scan">
      <input ref={fref} type="file" accept="image/jpeg,image/jpg,image/png"
        style={{ display: 'none' }} onChange={e => proc(e.target.files[0])} />

      <span className={s.sKicker}>AI Scanner</span>
      <h2 className={s.sTitle}>Upload &amp; <em className={s.sTitleEm}>Analyse</em></h2>
      <p className={s.sSub}>A clear, close-up photo in good lighting gives the most accurate result. No account needed.</p>

      <div className={s.scanGrid}>
        {/* Left: upload */}
        <div>
          <span className={s.ulabel}>Image Upload</span>
          <div
            className={`${s.uzone} ${drag ? s.uzoneDov : ''} ${img ? s.uzoneHim : ''}`}
            onClick={() => !img && fref.current?.click()}
            onDrop={e => { e.preventDefault(); setDrag(false); proc(e.dataTransfer.files[0]); }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
          >
            {img ? (
              <>
                <img src={displaySrc} alt="Preview" className={s.pimg} />
                {rawResult && (
                  <button
                    className={s.heatmapToggle}
                    onClick={e => { e.stopPropagation(); setShowHeatmap(v => !v); }}
                  >
                    {showHeatmap ? 'Original' : 'Grad-CAM'}
                  </button>
                )}
                <div className={s.pbar}>
                  <span className={s.pname}>{img.name}</span>
                  <button className={s.prem}
                    onClick={e => { e.stopPropagation(); reset(); }}>
                    Remove ×
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={s.uiconring}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className={s.uh}>Drop image here</div>
                <div className={s.us}>or click to browse</div>
                <div className={s.utags}>
                  {['JPG', 'PNG', 'JPEG'].map(f => <span key={f} className={s.utag}>{f}</span>)}
                </div>
              </>
            )}
          </div>
          <button className={s.sbtn} disabled={!img || loading} onClick={analyse}>
            {loading
              ? <><div className={s.sring} /> Analysing…</>
              : 'Run AI Analysis'
            }
          </button>
        </div>

        {/* Right: results */}
        <Results
          result={result}
          loading={loading}
          rawResult={rawResult}
          onReset={result ? reset : null}
        />
      </div>
    </section>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */
function Hero({ onScan, isDark }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 120);
    return () => clearTimeout(t);
  }, []);

  const bi = (delay) => ({
    opacity:   loaded ? 1 : 0,
    filter:    loaded ? 'blur(0)' : 'blur(14px)',
    transform: loaded ? 'none' : 'translateY(20px)',
    transition: `opacity 1s ${delay}s cubic-bezier(0.22,1,0.36,1), filter 1s ${delay}s cubic-bezier(0.22,1,0.36,1), transform 1s ${delay}s cubic-bezier(0.22,1,0.36,1)`,
  });

  const stats = [
    { v: '94.2%',        l: 'Detection accuracy'   },
    { v: '< 10s',        l: 'Average scan time'     },
    { v: '33k+',         l: 'Training images'       },
    { v: 'Val AUC 0.9869', l: 'Best checkpoint'     },
  ];

  return (
    <section id="hero" className={s.hero} data-section-label="01 Hero">
      {isDark && <SilkCanvas />}
      <div className={s.heroWave} />
      <div className={s.heroVignette} />

      {/* Ghost watermark */}
      <div className={s.heroGhost} style={{
        opacity:    loaded ? 1 : 0,
        transition: 'opacity 1.4s 1s ease',
      }}>
        DERMO
      </div>

      {/* Thin vertical accent rule */}
      <div className={s.vertRule} style={{ opacity: loaded ? 0.25 : 0 }} />

      <div className={s.heroContent}>
        <div style={bi(0.1)}>
          <div className={s.heroKicker}>
            <span className={s.kickerDot} />
            AI Dermatology · Clinical Grade
          </div>
        </div>
        <h1 className={s.heroh1} style={bi(0.28)}>
          Skin clarity,<br /><em className={s.heroh1Em}>instantly.</em>
        </h1>
        <p className={s.heroSub} style={bi(0.46)}>
          Upload a photo of your mole or lesion. Our AI delivers a clinically-informed risk
          assessment — in seconds, not weeks.
        </p>
        <div className={s.heroActions} style={bi(0.62)}>
          <button className={s.btnP} onClick={onScan}>Begin free scan</button>
          <button className={s.btnG}
            onClick={() => document.getElementById('bento')?.scrollIntoView({ behavior: 'smooth' })}>
            How it works
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className={s.heroStatStrip} style={{
        opacity:    loaded ? 1 : 0,
        transform:  loaded ? 'none' : 'translateY(12px)',
        transition: 'opacity 0.9s 1.0s cubic-bezier(0.22,1,0.36,1), transform 0.9s 1.0s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {stats.map(stat => (
          <div className={s.hstat} key={stat.l}>
            <div className={s.hstatV}>{stat.v}</div>
            <div className={s.hstatL}>{stat.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Root app ────────────────────────────────────────────────── */
export default function Home() {
  const [sec, setSec]          = useState(0);
  const [isDark, toggleTheme]  = useDarkMode();
  const ids                    = ['hero', 'bento', 'scan'];

  useScrollParallax();

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const i = ids.indexOf(e.target.id);
          if (i >= 0) setSec(i);
        }
      });
    }, { threshold: 0.35 });
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const goScan    = () => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' });
  const goBento   = () => document.getElementById('bento')?.scrollIntoView({ behavior: 'smooth' });
  const goTo      = (i) => document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' });

  const bars = [
    { num: '01', label: 'Detect ',   hi: 'Melanoma', rest: ' Early',  desc: 'AI mole analysis, clinical grade.'  },
    { num: '02', label: 'How the ',  hi: 'AI',       rest: ' works',  desc: 'ABCDE criteria applied in seconds.' },
    { num: '03', label: 'Upload & ', hi: 'Analyse',  rest: '',        desc: 'Risk classification in under 10s.'  },
  ];
  const b = bars[sec] || bars[0];

  return (
    <>
      <CursorGlow />

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.logo} onClick={() => goTo(0)} style={{ cursor: 'pointer' }}>
          Dermo<em className={s.logoEm}>Scan</em>
        </div>
        <ul className={s.navLinks}>
          <li className={`${s.navLink} ${sec === 0 ? s.navLinkAct : ''}`} onClick={() => goTo(0)}>Home</li>
          <li className={`${s.navLink} ${sec === 1 ? s.navLinkAct : ''}`} onClick={() => goTo(1)}>Platform</li>
          <li className={`${s.navLink} ${sec === 2 ? s.navLinkAct : ''}`} onClick={() => goTo(2)}>Scan</li>
        </ul>
        <div className={s.navRight}>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          <button className={s.npill} onClick={goBento}>Research</button>
          <button className={s.ncta} onClick={goScan}>Scan Now</button>
        </div>
      </nav>

      {/* Dot nav */}
      <div className={s.dnav}>
        {ids.map((_, i) => (
          <div key={i} className={`${s.dn} ${sec === i ? s.dnAct : ''}`} onClick={() => goTo(i)} />
        ))}
      </div>

      {/* Hero */}
      <Hero onScan={goScan} isDark={isDark} />

      {/* Bento */}
      <section id="bento" className={s.sectionWrap} style={{ paddingTop: 52 }} data-section-label="02 Platform">
        <Bento onScan={goScan} />
      </section>

      {/* Scan */}
      <Scan />

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.fl}>Dermo<em className={s.flEm}>Scan</em></div>
        <div className={s.fc}>For informational purposes only · Not medical advice · © 2026</div>
      </footer>

      {/* Bottom bar */}
      <div className={s.bbar}>
        <div className={s.bbn}>{b.num}</div>
        <div className={s.bbl}>{b.label}<em className={s.bblEm}>{b.hi}</em>{b.rest}</div>
        <div className={s.bbpills}>
          {ids.map((_, i) => (
            <div key={i} className={`${s.bbp} ${sec === i ? s.bbpAct : ''}`} />
          ))}
        </div>
        <button className={s.bbact} onClick={goScan}>Scan now ↗</button>
        <div className={s.bbdesc}>{b.desc}</div>
      </div>
    </>
  );
}
