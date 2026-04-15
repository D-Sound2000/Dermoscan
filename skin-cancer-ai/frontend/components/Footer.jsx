export default function Footer() {
  return (
    <footer className="bg-[#0A0A0F] border-t border-white/[0.06] py-8">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs text-gray-500 text-center leading-relaxed max-w-2xl mx-auto">
          For informational purposes only — not a substitute for professional
          clinical evaluation. This tool does not constitute medical advice.
          Always consult a qualified dermatologist for diagnosis and treatment.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[0.6rem] tracking-wider uppercase text-gray-600">
          <span>DermoScan</span>
          <span className="text-gray-700">·</span>
          <span>DenseNet121 Binary Classifier</span>
          <span className="text-gray-700">·</span>
          <span>For Research Use Only</span>
        </div>
      </div>
    </footer>
  );
}
