const variants = {
  violet:
    'border-violet-accent text-violet-accent hover:bg-violet-accent hover:text-white',
  coral:
    'border-coral-accent text-coral-accent hover:bg-coral-accent hover:text-white',
};

export default function PillButton({
  children,
  variant = 'violet',
  onClick,
  href,
  className = '',
}) {
  const base = `inline-flex items-center gap-2 border rounded-full px-7 py-3 text-sm font-medium tracking-wide transition-all duration-200 ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={base}>
        {children}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M3 7h8M8 3.5L11 7l-3 3.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    );
  }

  return (
    <button onClick={onClick} className={base}>
      {children}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M3 7h8M8 3.5L11 7l-3 3.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
