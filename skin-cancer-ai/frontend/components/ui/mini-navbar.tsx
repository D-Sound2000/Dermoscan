"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, ScanLine, X } from "lucide-react";

const AnimatedNavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group relative flex h-5 items-start overflow-hidden whitespace-nowrap text-sm leading-5 no-underline"
    >
      <span className="flex h-10 flex-col transition-transform duration-[400ms] ease-out group-hover:-translate-y-5">
        <span className="flex h-5 items-center text-gray-300">{children}</span>
        <span className="flex h-5 items-center text-white">{children}</span>
      </span>
    </a>
  );
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleMenu = () => {
    setIsOpen((current) => !current);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass("rounded-3xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass("rounded-full");
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const navLinksData = [
    { label: "Overview", href: "#" },
    { label: "Trust", href: "#trust" },
    { label: "Signals", href: "#trust" },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div
        className={`pointer-events-auto relative flex w-full max-w-3xl flex-col items-center border border-white/15 bg-[#1f1f1f57] px-5 py-3 shadow-2xl shadow-black/25 backdrop-blur-md transition-[border-radius] duration-300 ease-in-out sm:w-auto sm:px-6 ${headerShapeClass}`}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,.22),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(34,211,238,.16),transparent_28%)]" />

        <div className="relative z-10 flex w-full items-center justify-between gap-x-6 sm:gap-x-8">
          <a href="#" className="flex items-center gap-3 whitespace-nowrap text-white no-underline" onClick={closeMenu} aria-label="DermoScan home">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/10 text-cyan-100 shadow-inner shadow-white/10">
              <ScanLine className="h-4 w-4" />
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-sm font-semibold tracking-normal">DermoScan</span>
              <span className="mt-1 block whitespace-nowrap text-[9px] uppercase tracking-[0.26em] text-cyan-100/65">AI lesion review</span>
            </span>
          </a>

          <nav className="hidden items-center space-x-5 text-sm sm:flex">
            {navLinksData.map((link) => (
              <AnimatedNavLink key={link.label} href={link.href}>
                {link.label}
              </AnimatedNavLink>
            ))}
          </nav>

            <a
              href="#trust"
              className="hidden whitespace-nowrap rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-3 py-2 text-sm text-gray-300 no-underline transition-colors duration-200 hover:border-white/50 hover:text-white sm:inline-flex"
            >
              Evidence
            </a>
            <div className="group relative hidden sm:block">
              <div className="pointer-events-none absolute inset-0 -m-2 rounded-full bg-gray-100 opacity-35 blur-lg transition-all duration-300 ease-out group-hover:-m-3 group-hover:opacity-55 group-hover:blur-xl" />
              <a
                href="#trust"
                className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gray-100 to-gray-300 px-3 py-2 text-sm font-semibold text-black no-underline transition-all duration-200 hover:from-gray-200 hover:to-gray-400"
              >
                Explore
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

          <button
            className="flex h-8 w-8 items-center justify-center text-gray-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:hidden"
            onClick={toggleMenu}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            type="button"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={`relative z-10 flex w-full flex-col items-center overflow-hidden transition-all duration-300 ease-in-out sm:hidden ${
            isOpen ? "max-h-[1000px] pt-4 opacity-100" : "max-h-0 pt-0 opacity-0 pointer-events-none"
          }`}
        >
          <nav className="flex w-full flex-col items-center space-y-4 text-base">
            {navLinksData.map((link) => (
              <AnimatedNavLink key={link.label} href={link.href} onClick={closeMenu}>
                {link.label}
              </AnimatedNavLink>
            ))}
          </nav>
          <div className="mt-4 flex w-full flex-col items-center space-y-4">
            <a
              href="#trust"
              onClick={closeMenu}
              className="w-full rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-4 py-2 text-center text-sm text-gray-300 no-underline transition-colors duration-200 hover:border-white/50 hover:text-white"
            >
              Evidence
            </a>
            <a
              href="#trust"
              onClick={closeMenu}
              className="w-full rounded-full bg-gradient-to-br from-gray-100 to-gray-300 px-4 py-2 text-center text-sm font-semibold text-black no-underline transition-all duration-200 hover:from-gray-200 hover:to-gray-400"
            >
              Explore
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
