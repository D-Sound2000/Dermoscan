export default function SectionStrip({ number, title, description }) {
  return (
    <div className="border-t border-white/10 mt-16 pt-6 max-w-7xl mx-auto px-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-gray-500 tracking-wider">
          {number}
        </span>
        <span className="text-gray-500 text-sm">—</span>
        <span className="text-sm font-medium text-gray-300">{title}</span>
        {description && (
          <span className="hidden sm:inline text-xs text-gray-500 ml-4">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
