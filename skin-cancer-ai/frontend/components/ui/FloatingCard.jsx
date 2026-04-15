const dotColors = {
  violet: 'bg-violet-accent',
  coral: 'bg-coral-accent',
};

export default function FloatingCard({
  text,
  color = 'violet',
  className = '',
  delay = '0s',
}) {
  return (
    <div
      className={`absolute backdrop-blur-md bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 shadow-lg animate-float ${className}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[color]}`}
          aria-hidden
        />
        <span className="text-xs font-medium text-white/90 whitespace-nowrap">
          {text}
        </span>
      </div>
    </div>
  );
}
