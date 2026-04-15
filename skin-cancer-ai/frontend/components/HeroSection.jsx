import PillButton from './ui/PillButton';
import FloatingCard from './ui/FloatingCard';
import SectionStrip from './ui/SectionStrip';
import AbstractVisual from './ui/AbstractVisual';

const BULLETS = [
  '94% Sensitivity on Clinical Data',
  'DenseNet121 Deep Learning Architecture',
  'Trained on 5,000+ Dermoscopy Images',
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative bg-[#0A0A0F] text-white pt-28 pb-8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — copy */}
        <div className="animate-fade-up">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-violet-accent">
            AI-Powered Detection
          </span>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] mt-5">
            Empowering Early Skin Cancer Detection with AI
          </h1>

          <ul className="mt-8 space-y-3">
            {BULLETS.map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-gray-300">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="mt-0.5 flex-shrink-0 text-violet-accent"
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
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-gray-400 text-sm leading-relaxed max-w-md">
            Dermoscan uses state-of-the-art deep learning to analyze skin
            lesions and flag potentially malignant cases for clinical follow-up.
          </p>

          <div className="mt-8">
            <PillButton variant="violet" href="#upload">
              Analyze Your Lesion
            </PillButton>
          </div>
        </div>

        {/* Right — abstract visual with floating cards */}
        <div className="relative h-[340px] sm:h-[400px] lg:h-[480px]">
          <AbstractVisual />

          <FloatingCard
            text="Malignant detection"
            color="violet"
            className="top-4 right-2 sm:top-8 sm:right-4"
            delay="0s"
          />
          <FloatingCard
            text="Benign classification"
            color="violet"
            className="top-[30%] -left-2 sm:-left-4"
            delay="1.2s"
          />
          <FloatingCard
            text="Confidence scoring"
            color="violet"
            className="bottom-20 right-4 sm:bottom-24 sm:right-8"
            delay="2.4s"
          />
          <FloatingCard
            text="Threshold calibration"
            color="violet"
            className="bottom-4 left-4 sm:bottom-8 sm:left-8"
            delay="0.6s"
          />
        </div>
      </div>

      <SectionStrip
        number="01"
        title="How Dermoscan Works"
        description="Upload a dermoscopy image and receive an instant classification"
      />
    </section>
  );
}
