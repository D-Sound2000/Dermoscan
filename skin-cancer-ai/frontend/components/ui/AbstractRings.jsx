export default function AbstractRings() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-64 h-64 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(244,114,182,0.5) 0%, rgba(236,72,153,0.15) 60%, transparent 70%)',
          }}
        />
      </div>

      {/* Ring SVG */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        className="w-full max-w-[360px] h-auto"
        aria-hidden
      >
        <defs>
          <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9A8D4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="ringGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ring 1 — outermost, slowest */}
        <circle
          cx="200"
          cy="200"
          r="170"
          stroke="url(#ringGrad3)"
          strokeWidth="1"
          strokeDasharray="8 12"
          className="animate-spin-slower"
          style={{ transformOrigin: '200px 200px' }}
        />

        {/* Ring 2 — mid, counter-rotation */}
        <circle
          cx="200"
          cy="200"
          r="130"
          stroke="url(#ringGrad2)"
          strokeWidth="1.5"
          className="animate-spin-reverse"
          style={{ transformOrigin: '200px 200px' }}
        />

        {/* Ring 3 — inner, faster */}
        <circle
          cx="200"
          cy="200"
          r="90"
          stroke="url(#ringGrad1)"
          strokeWidth="2"
          strokeDasharray="4 8"
          className="animate-spin-slow"
          style={{ transformOrigin: '200px 200px' }}
        />

        {/* Ring 4 — core solid ring */}
        <circle
          cx="200"
          cy="200"
          r="50"
          stroke="#F472B6"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Centre dot */}
        <circle cx="200" cy="200" r="5" fill="#F9A8D4" opacity="0.6" />

        {/* Orbital dots */}
        <circle cx="200" cy="30" r="3" fill="#F472B6" opacity="0.5"
          className="animate-spin-slower" style={{ transformOrigin: '200px 200px' }} />
        <circle cx="330" cy="200" r="2.5" fill="#F9A8D4" opacity="0.4"
          className="animate-spin-reverse" style={{ transformOrigin: '200px 200px' }} />
        <circle cx="70" cy="200" r="2" fill="#FBCFE8" opacity="0.35"
          className="animate-spin-slow" style={{ transformOrigin: '200px 200px' }} />
      </svg>

      {/* Scattered decorative dots */}
      <div className="absolute top-10 right-20 w-2 h-2 rounded-full bg-coral-accent/40 animate-pulse-dot" />
      <div
        className="absolute bottom-16 left-16 w-1.5 h-1.5 rounded-full bg-coral-accent/30 animate-pulse-dot"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/4 left-8 w-1 h-1 rounded-full bg-coral-accent/25 animate-pulse-dot"
        style={{ animationDelay: '0.7s' }}
      />
    </div>
  );
}
