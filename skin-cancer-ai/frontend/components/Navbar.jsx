'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const NAV_LINKS = [
  { label: 'How It Works', href: '#hero' },
  { label: 'Performance', href: '#features' },
  { label: 'Analyze', href: '#upload' },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('');

  // Track which section is in view
  useEffect(() => {
    const ids = ['hero', 'features', 'upload'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-dark-bg/80 dark:bg-dark-bg/80 border-b border-white/[0.06] transition-colors">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="w-8 h-8 rounded-full bg-violet-dim border border-violet-accent/20 flex items-center justify-center text-violet-accent">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.8" fill="currentColor" />
              <line x1="7" y1="1" x2="7" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="7" y1="11" x2="7" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="1" y1="7" x2="3" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="11" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-base font-semibold tracking-widest uppercase text-white">
            DermoScan
          </span>
        </a>

        {/* Centre links — desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={href}
              onClick={() => scrollTo(href)}
              className={`relative text-sm font-medium transition-colors pb-0.5 ${
                active === href
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
              {active === href && (
                <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-violet-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 9.5A5.5 5.5 0 016.5 2.5 6.5 6.5 0 1013.5 9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* CTA — desktop */}
          <button
            onClick={() => scrollTo('#upload')}
            className="hidden md:inline-flex items-center gap-2 border border-violet-accent text-violet-accent rounded-full px-5 py-2 text-sm font-medium hover:bg-violet-accent hover:text-white transition-all"
          >
            Analyze Your Skin
          </button>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-dark-bg/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => scrollTo(href)}
                className="text-left text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => scrollTo('#upload')}
              className="mt-2 border border-violet-accent text-violet-accent rounded-full px-5 py-2.5 text-sm font-medium hover:bg-violet-accent hover:text-white transition-all text-center"
            >
              Analyze Your Skin
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
