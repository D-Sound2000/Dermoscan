export default function AbstractVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(109,40,217,0.2) 50%, transparent 70%)',
          }}
        />
      </div>

      {/* Main SVG blobs */}
      <svg
        viewBox="0 0 400 450"
        fill="none"
        className="w-full max-w-[380px] h-auto animate-float"
        aria-hidden
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="blobGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="blobGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="blobGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx="200" cy="225" r="160" fill="url(#glow)" />

        {/* Blob 3 — largest, faintest */}
        <path
          d="M120,120 C160,60 290,50 320,120 C350,190 340,300 280,350 C220,400 130,380 100,310 C70,240 80,180 120,120Z"
          fill="url(#blobGrad3)"
          className="animate-blob-pulse"
          style={{ transformOrigin: '200px 225px', animationDelay: '2s' }}
        />

        {/* Blob 2 — mid layer */}
        <path
          d="M150,140 C190,80 300,90 320,160 C340,230 310,310 260,340 C210,370 140,350 120,280 C100,210 110,200 150,140Z"
          fill="url(#blobGrad2)"
          className="animate-blob-pulse"
          style={{ transformOrigin: '210px 230px', animationDelay: '4s' }}
        />

        {/* Blob 1 — foreground, most vivid */}
        <path
          d="M170,160 C200,110 280,120 300,180 C320,240 290,310 240,330 C190,350 150,320 140,260 C130,200 140,210 170,160Z"
          fill="url(#blobGrad1)"
          className="animate-blob-pulse"
        />

        {/* Inner highlight ring */}
        <ellipse
          cx="210"
          cy="230"
          rx="55"
          ry="55"
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1"
          opacity="0.35"
          className="animate-spin-slower"
          style={{ transformOrigin: '210px 230px' }}
        />

        {/* Core dot */}
        <circle cx="210" cy="230" r="6" fill="#C4B5FD" opacity="0.6" />
      </svg>

      {/* Scattered decorative dots */}
      <div className="absolute top-12 right-16 w-2 h-2 rounded-full bg-violet-accent/40 animate-pulse-dot" />
      <div
        className="absolute bottom-20 left-12 w-1.5 h-1.5 rounded-full bg-violet-accent/30 animate-pulse-dot"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/3 left-6 w-1 h-1 rounded-full bg-violet-accent/25 animate-pulse-dot"
        style={{ animationDelay: '0.5s' }}
      />
      <div
        className="absolute bottom-1/4 right-10 w-1.5 h-1.5 rounded-full bg-violet-accent/35 animate-pulse-dot"
        style={{ animationDelay: '1.5s' }}
      />
    </div>
  );
}
