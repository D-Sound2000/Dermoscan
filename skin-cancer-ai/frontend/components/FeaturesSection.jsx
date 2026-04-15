import PillButton from './ui/PillButton';
import FloatingCard from './ui/FloatingCard';
import SectionStrip from './ui/SectionStrip';
import AbstractRings from './ui/AbstractRings';

const BULLETS = [
  {
    bold: 'Patient-level validation',
    text: '— No data leakage, tested on unseen patients',
  },
  {
    bold: 'Calibrated threshold',
    text: '— Auto-tuned to 90% sensitivity target',
  },
];

const STATS = [
  { label: 'Test AUC', value: '0.9321' },
  { label: 'Sensitivity', value: '94.03%' },
  { label: 'Specificity', value: '62.60%' },
  { label: 'Dataset', value: '5,177 images' },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative bg-white dark:bg-[#0F0F18] text-gray-900 dark:text-white py-20 lg:py-28 overflow-hidden transition-colors"
    >
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — copy */}
        <div>
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-coral-accent">
            Informed Decisions
          </span>

          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.08] mt-5">
            Clinical-grade AI skin analysis platform
          </h2>

          <ul className="mt-8 space-y-3">
            {BULLETS.map(({ bold, text }) => (
              <li key={bold} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="mt-0.5 flex-shrink-0 text-coral-accent"
                  aria-hidden
                >
                  <path
                    d="M3 8h8M8 4.5L11 8l-3 3.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <strong className="text-gray-900 dark:text-white">{bold}</strong>
                  {text}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-md">
            Our model is evaluated with bootstrap confidence intervals and
            subgroup analysis across age, sex, and lesion location.
          </p>

          <div className="mt-8">
            <PillButton variant="coral" href="#features">
              View Model Performance
            </PillButton>
          </div>
        </div>

        {/* Right — abstract rings with floating stat cards */}
        <div className="relative h-[340px] sm:h-[400px] lg:h-[480px]">
          <AbstractRings />

          <FloatingCard
            text="AUC: 0.9321 (CI: 0.915–0.949)"
            color="coral"
            className="top-4 right-0 sm:top-8 sm:right-2"
            delay="0s"
          />
          <FloatingCard
            text="Sensitivity: 94.0%"
            color="coral"
            className="top-[32%] -left-2 sm:-left-4"
            delay="1s"
          />
          <FloatingCard
            text="Specificity: 62.6%"
            color="coral"
            className="bottom-24 right-2 sm:bottom-28 sm:right-6"
            delay="2s"
          />
          <FloatingCard
            text="Threshold: 0.2274"
            color="coral"
            className="bottom-6 left-4 sm:bottom-10 sm:left-8"
            delay="0.5s"
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-16 max-w-3xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map(({ label, value }) => (
          <div
            key={label}
            className="text-center rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-4 py-5 transition-colors"
          >
            <div className="font-mono text-2xl font-semibold text-gray-900 dark:text-white">
              {value}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      <SectionStrip
        number="02"
        title="Upload Your Image"
        description="Drag and drop a dermoscopy image for instant analysis"
      />
    </section>
  );
}
