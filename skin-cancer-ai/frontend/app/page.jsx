'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  FileText,
  ImagePlus,
  Layers,
  LockKeyhole,
  Microscope,
  Moon,
  RotateCcw,
  ScanLine,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import s from './page.module.css';

const API_URL = 'http://172.24.76.36:8000/predict-with-heatmap';

function useTheme() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const stored = localStorage.getItem('dermoscan-theme');
    const next = stored === 'light' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('dermoscan-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  return [theme, toggleTheme];
}

function IconButton({ children, label, onClick }) {
  return (
    <button className={s.iconButton} type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Nav({ theme, onTheme, onScan }) {
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <nav className={s.nav}>
      <button className={s.brand} type="button" onClick={() => goTo('top')}>
        <span className={s.brandMark} aria-hidden="true">
          <span />
        </span>
        <span>DermoScan</span>
      </button>
      <div className={s.navLinks}>
        <button type="button" onClick={() => goTo('scan')}>Scan</button>
        <button type="button" onClick={() => goTo('evidence')}>Evidence</button>
        <button type="button" onClick={() => goTo('workflow')}>Workflow</button>
      </div>
      <div className={s.navActions}>
        <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onTheme}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
        <button className={s.navCta} type="button" onClick={onScan}>
          Start Scan
          <ArrowRight size={16} />
        </button>
      </div>
    </nav>
  );
}

function MetricStrip() {
  const metrics = [
    { label: 'Validation AUC', value: '0.9869' },
    { label: 'Image Corpus', value: '33k+' },
    { label: 'Mean Runtime', value: '<10s' },
    { label: 'Classes', value: '2' },
  ];

  return (
    <div className={s.metricStrip} aria-label="Model metrics">
      {metrics.map((metric) => (
        <div className={s.metric} key={metric.label}>
          <span>{metric.value}</span>
          <small>{metric.label}</small>
        </div>
      ))}
    </div>
  );
}

function ScanProgress() {
  const [step, setStep] = useState(0);
  const steps = [
    'Normalizing lesion image',
    'Extracting dermoscopic signals',
    'Running DenseNet-121 inference',
    'Generating Grad-CAM overlay',
  ];

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => (current + 1) % steps.length), 1600);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className={s.progressWrap}>
      <div className={s.scanDial} aria-hidden="true">
        <span />
        <span />
        <span />
        <ScanLine size={28} />
      </div>
      <p key={step}>{steps[step]}</p>
    </div>
  );
}

function ResultPanel({ loading, result, rawResult, onReset }) {
  if (loading) {
    return (
      <section className={s.resultPanel} aria-live="polite">
        <div className={s.panelTop}>
          <span>Analysis</span>
          <b className={s.statusWorking}>Scanning</b>
        </div>
        <ScanProgress />
      </section>
    );
  }

  if (!result) {
    return (
      <section className={s.resultPanel}>
        <div className={s.panelTop}>
          <span>Analysis</span>
          <b>Ready</b>
        </div>
        <div className={s.emptyState}>
          <FileText size={28} />
          <h3>No report yet</h3>
          <p>Upload a clear lesion image to receive a risk classification, confidence score, and heatmap.</p>
        </div>
      </section>
    );
  }

  const verdict = result.verdict.toLowerCase();
  const isMalignant = verdict === 'malignant';
  const isBenign = verdict === 'benign';
  const malignantPct = rawResult ? Math.round(rawResult.malignant_probability * 100) : 0;
  const benignPct = rawResult ? Math.round(rawResult.benign_probability * 100) : 0;
  const riskLabel = isBenign ? 'Likely benign' : isMalignant ? 'Elevated risk' : 'Needs review';
  const ringValue = rawResult ? malignantPct : 0;

  return (
    <section className={`${s.resultPanel} ${s.resultReady}`}>
      <div className={s.panelTop}>
        <span>Analysis</span>
        <b className={isBenign ? s.statusBenign : isMalignant ? s.statusRisk : s.statusReview}>
          {result.verdict}
        </b>
      </div>

      <div className={s.resultHero}>
        <div>
          <p className={s.resultEyebrow}>AI Classification</p>
          <h3 className={isBenign ? s.benignText : isMalignant ? s.riskText : s.reviewText}>{riskLabel}</h3>
          <span>Confidence {result.confidence}</span>
        </div>
        <div className={s.riskGauge} style={{ '--risk': `${ringValue * 3.6}deg` }}>
          <strong>{malignantPct}%</strong>
          <small>risk</small>
        </div>
      </div>

      <p className={s.summary}>{result.summary}</p>

      {rawResult && (
        <div className={s.probabilities}>
          {[
            { label: 'Benign probability', value: benignPct, tone: 'good' },
            { label: 'Malignant probability', value: malignantPct, tone: 'risk' },
          ].map((item) => (
            <div className={s.probability} key={item.label}>
              <div>
                <span>{item.label}</span>
                <b>{item.value}%</b>
              </div>
              <div className={s.track}>
                <span className={item.tone === 'good' ? s.goodBar : s.riskBar} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={s.disclaimer}>
        <AlertTriangle size={15} />
        <span>This is informational AI support, not a diagnosis. Consult a board-certified dermatologist for medical decisions.</span>
      </div>

      <button className={s.secondaryButton} type="button" onClick={onReset}>
        <RotateCcw size={16} />
        New Scan
      </button>
    </section>
  );
}

function Scanner() {
  const [image, setImage] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [rawResult, setRawResult] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const fileRef = useRef(null);

  const reset = useCallback(() => {
    if (image?.url) URL.revokeObjectURL(image.url);
    if (fileRef.current) fileRef.current.value = '';
    setImage(null);
    setResult(null);
    setRawResult(null);
    setShowHeatmap(false);
  }, [image]);

  const processFile = useCallback((file) => {
    if (!file || !['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) return;
    if (image?.url) URL.revokeObjectURL(image.url);
    setImage({ file, name: file.name, url: URL.createObjectURL(file) });
    setResult(null);
    setRawResult(null);
    setShowHeatmap(false);
  }, [image]);

  const analyse = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    setRawResult(null);

    try {
      const form = new FormData();
      form.append('file', image.file);
      const response = await fetch(API_URL, { method: 'POST', body: form });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${response.status}`);
      }
      const data = await response.json();
      const malignantPct = Math.round(data.malignant_probability * 100);
      const benignPct = Math.round(data.benign_probability * 100);
      setRawResult(data);
      setResult({
        verdict: data.predicted_class,
        confidence: `${Math.max(malignantPct, benignPct)}%`,
        summary: data.recommendation,
      });
    } catch (error) {
      setResult({
        verdict: 'Uncertain',
        confidence: 'N/A',
        summary: error.message || 'Analysis failed. Please try again with a clearer image.',
      });
    } finally {
      setLoading(false);
    }
  };

  const displaySrc = rawResult && showHeatmap ? rawResult.heatmap_image : image?.url;

  return (
    <section id="scan" className={s.scanShell}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className={s.fileInput}
        onChange={(event) => processFile(event.target.files?.[0])}
      />

      <div className={s.scanIntro}>
        <span className={s.kicker}>Diagnostic Workspace</span>
        <h2>Upload a lesion image for AI-assisted review.</h2>
        <p>Designed for clear dermoscopy or close-up skin photos. Results include a classification, confidence estimate, and optional Grad-CAM heatmap.</p>
      </div>

      <div className={s.scanGrid}>
        <section className={s.uploadPanel}>
          <div className={s.panelTop}>
            <span>Image Input</span>
            <b>JPG / PNG</b>
          </div>

          <div
            className={`${s.dropzone} ${dragging ? s.dropzoneActive : ''} ${image ? s.dropzoneLoaded : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => !image && fileRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !image) fileRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              processFile(event.dataTransfer.files?.[0]);
            }}
          >
            {image ? (
              <>
                <img className={s.previewImage} src={displaySrc} alt="Uploaded lesion preview" />
                <div className={s.previewActions}>
                  {rawResult && (
                    <button className={s.overlayButton} type="button" onClick={(event) => {
                      event.stopPropagation();
                      setShowHeatmap((current) => !current);
                    }}>
                      <Layers size={15} />
                      {showHeatmap ? 'Original' : 'Heatmap'}
                    </button>
                  )}
                  <button className={s.clearButton} type="button" aria-label="Remove image" onClick={(event) => {
                    event.stopPropagation();
                    reset();
                  }}>
                    <X size={16} />
                  </button>
                </div>
                <div className={s.fileBar}>
                  <span>{image.name}</span>
                  <button type="button" onClick={(event) => {
                    event.stopPropagation();
                    fileRef.current?.click();
                  }}>
                    Replace
                  </button>
                </div>
              </>
            ) : (
              <div className={s.uploadEmpty}>
                <ImagePlus size={42} />
                <h3>Drop image here</h3>
                <p>or browse from your device</p>
                <div className={s.formatPills}>
                  <span>JPEG</span>
                  <span>PNG</span>
                  <span>Close-up</span>
                </div>
              </div>
            )}
          </div>

          <button className={s.primaryButton} type="button" disabled={!image || loading} onClick={analyse}>
            {loading ? (
              <>
                <span className={s.spinner} />
                Analyzing
              </>
            ) : (
              <>
                <Upload size={17} />
                Run AI Analysis
              </>
            )}
          </button>
        </section>

        <ResultPanel loading={loading} result={result} rawResult={rawResult} onReset={reset} />
      </div>
    </section>
  );
}

function Hero({ onScan }) {
  return (
    <header id="top" className={s.hero}>
      <div className={s.heroCopy}>
        <span className={s.kicker}>
          <Activity size={14} />
          AI dermatology support
        </span>
        <h1>DermoScan</h1>
        <p>
          A focused skin-lesion analysis workspace with fast AI classification, transparent risk scoring,
          and clinician-minded guidance.
        </p>
        <div className={s.heroActions}>
          <button className={s.primaryButton} type="button" onClick={onScan}>
            Start Analysis
            <ArrowRight size={17} />
          </button>
          <button className={s.ghostButton} type="button" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>
            View Workflow
            <ChevronDown size={17} />
          </button>
        </div>
      </div>

      <div className={s.heroVisual} aria-label="Dermatology AI interface preview">
        <div className={s.visualHeader}>
          <span />
          <span />
          <span />
          <b>Live Preview</b>
        </div>
        <div className={s.skinPreview}>
          <img src="/wave-bg.avif" alt="Abstract skin imaging background" />
          <div className={s.scanFrame}>
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className={s.scanLine} />
        </div>
        <div className={s.visualStats}>
          <div>
            <small>Risk Signal</small>
            <strong>Low</strong>
          </div>
          <div>
            <small>Heatmap</small>
            <strong>Ready</strong>
          </div>
          <div>
            <small>Latency</small>
            <strong>8.4s</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

function Evidence() {
  const items = [
    {
      icon: <Microscope size={22} />,
      title: 'Dermoscopic inference',
      text: 'DenseNet-121 evaluates lesion patterns and returns calibrated benign or malignant probabilities.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Explainable output',
      text: 'Grad-CAM overlays help reveal which visual regions influenced the model response.',
    },
    {
      icon: <LockKeyhole size={22} />,
      title: 'Privacy-forward flow',
      text: 'Images are sent for inference only and are not part of the frontend state after reset.',
    },
  ];

  return (
    <section id="evidence" className={s.evidence}>
      <div className={s.sectionIntro}>
        <span className={s.kicker}>Evidence Layer</span>
        <h2>Built for trust, speed, and reviewability.</h2>
      </div>
      <div className={s.featureGrid}>
        {items.map((item) => (
          <article className={s.featureCard} key={item.title}>
            <div className={s.featureIcon}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Workflow({ onScan }) {
  const steps = [
    { step: '01', title: 'Capture', text: 'Use bright lighting, keep the lesion centered, and avoid heavy blur or shadows.' },
    { step: '02', title: 'Analyze', text: 'The model evaluates the image and produces a confidence-weighted classification.' },
    { step: '03', title: 'Review', text: 'Compare the report, probabilities, and heatmap before deciding next medical steps.' },
  ];

  return (
    <section id="workflow" className={s.workflow}>
      <div className={s.sectionIntro}>
        <span className={s.kicker}>Workflow</span>
        <h2>Three steps from image to report.</h2>
      </div>
      <div className={s.timeline}>
        {steps.map((item) => (
          <article className={s.timelineItem} key={item.step}>
            <span>{item.step}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
      <button className={s.primaryButton} type="button" onClick={onScan}>
        Open Scanner
        <ArrowRight size={17} />
      </button>
    </section>
  );
}

export default function Home() {
  const [theme, toggleTheme] = useTheme();
  const goScan = () => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <Nav theme={theme} onTheme={toggleTheme} onScan={goScan} />
      <main>
        <Hero onScan={goScan} />
        <MetricStrip />
        <Scanner />
        <Evidence />
        <Workflow onScan={goScan} />
      </main>
      <footer className={s.footer}>
        <span>DermoScan</span>
        <span>Informational use only. Not medical advice. Copyright 2026.</span>
      </footer>
    </>
  );
}
