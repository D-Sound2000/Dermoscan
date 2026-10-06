import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, Microscope, ShieldCheck } from "lucide-react";
import { MeshGradient } from "@paper-design/shaders-react";

const sections = [
  {
    title: "Intended use",
    icon: ShieldCheck,
    text: "DermoScan is an educational early-warning and documentation tool. It can help a user organize observations and decide whether to seek professional review. It is not a diagnostic device and cannot confirm or rule out skin cancer.",
  },
  {
    title: "Model",
    icon: Microscope,
    text: "The deployed pipeline is a binary DenseNet121 image classifier with benign and malignant outputs. Images are resized, center-cropped to 224 x 224 pixels, and normalized using ImageNet statistics.",
  },
  {
    title: "Explainability",
    icon: BarChart3,
    text: "Grad-CAM highlights image regions that influenced the malignant output. A heatmap shows model attention, not a tumor boundary or proof that the model's conclusion is correct. DermoScan does not display a substitute heatmap when Grad-CAM is unavailable.",
  },
];

export default function ModelCardPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-5 py-8 text-white md:px-8">
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={0.2}
        distortion={0.78}
        swirl={0.36}
        grainMixer={0.18}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-50"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={0.14}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(236,254,255,.15),transparent_40%),linear-gradient(180deg,rgba(2,6,23,.55),rgba(2,6,23,.25)_50%,rgba(2,6,23,.75))]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ArrowLeft className="size-4" /> Back to DermoScan
        </Link>

        <div className="mt-10 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300/70">Transparency and safety</p>
          <h1 className="mt-3 text-4xl font-bold md:text-6xl">DermoScan model card</h1>
          <p className="mt-5 text-lg leading-8 text-white/60">
            What the model does, what its output means, and where it should not be trusted.
          </p>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {sections.map(({ title, icon: Icon, text }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
              <Icon className="size-5 text-cyan-300" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-orange-300/25 bg-orange-300/[0.07] p-6 md:p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 shrink-0 text-orange-300" />
            <div>
              <h2 className="text-xl font-semibold">Current evidence status</h2>
              <p className="mt-3 leading-7 text-white/65">
                The repository reports validation AUC values from development experiments, but a frozen, reproducible test report for the exact deployed binary checkpoint is not yet published. DermoScan therefore does not present an accuracy claim in the product interface. Validation performance is not clinical performance.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.05] p-6 md:grid-cols-2 md:p-8">
          <div>
            <h2 className="text-xl font-semibold">Known limitations</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/60">
              <li>• Performance on casual smartphone photos has not been established separately from dermoscopic imagery.</li>
              <li>• Lighting, blur, camera distance, skin products, hair, and framing can alter the score.</li>
              <li>• Performance by skin tone and demographic subgroup has not yet been fully reported.</li>
              <li>• A low score must not override symptoms or visible change.</li>
              <li>• Repeated scores are not a measurement of cancer growth.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Before a clinical claim</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/60">
              {["Patient-level train/test separation", "Independent held-out test evaluation", "Sensitivity, specificity, precision, recall, and calibration", "Subgroup and smartphone-image evaluation", "Prospective review with qualified clinicians"].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-cyan-300/70" />{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="my-8 text-xs leading-5 text-white/35">
          Version 1.0 • DenseNet121 binary research model • Last reviewed September 2026
        </p>
      </div>
    </main>
  );
}
