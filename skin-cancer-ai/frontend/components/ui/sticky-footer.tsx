import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  BriefcaseBusiness,
  Code2,
  FileScan,
  Flame,
  Mail,
  Microscope,
  PlayCircle,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FooterLinkGroup {
  label: string;
  links: FooterLink[];
}

type StickyFooterProps = React.ComponentProps<"footer">;

export function StickyFooter({ className, ...props }: StickyFooterProps) {
  return (
    <footer
      className={cn("relative h-[420px] w-full bg-[#020303] text-[#f5fbfa]", className)}
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      {...props}
    >
      <div className="fixed bottom-0 h-[420px] w-full">
        <div className="sticky top-[calc(100vh-420px)] h-full overflow-y-auto">
          <div className="relative flex size-full flex-col justify-between gap-5 overflow-hidden border-t border-white/[0.08] px-5 py-6 md:px-10">
            <div aria-hidden className="absolute inset-0 isolate z-0 overflow-hidden">
              <div className="absolute left-[-7rem] top-[-18rem] h-[38rem] w-[22rem] -rotate-45 rounded-full bg-[radial-gradient(68%_69%_at_55%_31%,rgba(236,254,255,.09)_0,rgba(34,211,238,.028)_54%,rgba(245,251,250,.01)_80%)]" />
              <div className="absolute left-[18%] top-[-18rem] h-[34rem] w-[12rem] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(249,115,22,.055)_0,rgba(249,115,22,.014)_80%,transparent_100%)]" />
              <div className="absolute right-[-8rem] top-[-17rem] h-[34rem] w-[18rem] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(6,182,212,.06)_0,rgba(6,182,212,.014)_80%,transparent_100%)]" />
            </div>

            <div className="relative z-10 grid gap-8 md:grid-cols-[minmax(14rem,18rem)_1fr]">
              <AnimatedContainer className="space-y-4">
                <a href="#overview" className="inline-flex items-center gap-3 text-[#f5fbfa] no-underline" aria-label="DermoScan home">
                  <span className="grid size-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.08] text-cyan-100">
                    <ScanLine className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xl font-semibold leading-none tracking-normal text-[#f8fffd]" style={{ fontFamily: "var(--font-serif)" }}>DermoScan</span>
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-[rgba(189,236,232,0.64)]">AI lesion review</span>
                  </span>
                </a>
                <p className="max-w-xs font-[var(--font-sans)] text-[13px] leading-5 text-[rgba(215,231,228,0.72)]">
                  Upload a dermoscopy image for AI-assisted scoring, Grad-CAM evidence, and a clearer view of what the
                  model is weighing.
                </p>
                <div className="flex gap-2">
                  {socialLinks.map((link) => (
                    <Button key={link.title} size="icon" variant="outline" className="size-8 rounded-full border-white/[0.08] bg-white/[0.08] text-[rgba(220,239,237,0.72)] hover:bg-white/[0.13] hover:text-[#f8fffd]" asChild>
                      <a href={link.href} aria-label={link.title}>
                        <link.icon className="size-3.5" />
                      </a>
                    </Button>
                  ))}
                </div>
              </AnimatedContainer>

              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {footerLinkGroups.map((group, index) => (
                  <AnimatedContainer key={group.label} delay={0.12 + index * 0.08}>
                    <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(189,236,232,0.64)]">{group.label}</h3>
                    <ul className="mt-3 space-y-1.5 font-[var(--font-sans)] text-[13px] leading-5 text-[rgba(215,231,228,0.62)]">
                      {group.links.map((link) => (
                        <li key={link.title}>
                          <a href={link.href} className="inline-flex items-center gap-1.5 text-[rgba(215,231,228,0.62)] no-underline transition-colors duration-300 hover:text-[#f8fffd]">
                            {link.icon ? <link.icon className="size-3.5 text-[rgba(189,236,232,0.55)]" /> : null}
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </AnimatedContainer>
                ))}
              </div>
            </div>

            <div className="relative z-10 flex flex-col justify-between gap-2 border-t border-white/[0.08] pt-3 font-[var(--font-sans)] text-[11px] leading-4 text-[rgba(215,231,228,0.48)] md:flex-row md:items-center">
              <p>© 2026 DermoScan. AI support for lesion review.</p>
              <p>Not a diagnosis. Use with clinician judgment.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

const socialLinks = [
  { title: "Email", href: "mailto:hello@dermoscan.ai", icon: Mail },
  { title: "Source", href: "#", icon: Code2 },
  { title: "Team", href: "#", icon: BriefcaseBusiness },
  { title: "Video overview", href: "#", icon: PlayCircle },
];

const footerLinkGroups: FooterLinkGroup[] = [
  {
    label: "Product",
    links: [
      { title: "Upload scan", href: "#scan", icon: FileScan },
      { title: "Probability score", href: "#results", icon: Activity },
      { title: "Heatmap view", href: "#results", icon: Flame },
      { title: "Model signals", href: "#signals", icon: Microscope },
    ],
  },
  {
    label: "Model",
    links: [
      { title: "DenseNet backbone", href: "#signals" },
      { title: "Grad-CAM evidence", href: "#results" },
      { title: "Validation AUC", href: "#signals" },
      { title: "Review workflow", href: "#signals" },
    ],
  },
  {
    label: "Resources",
    links: [
      { title: "Clinical overview", href: "#overview" },
      { title: "Image requirements", href: "#scan" },
      { title: "Result guidance", href: "#results" },
      { title: "Explainability notes", href: "#signals" },
    ],
  },
  {
    label: "Safety",
    links: [
      { title: "Clinical review required", href: "#signals", icon: ShieldCheck },
      { title: "Privacy posture", href: "#" },
      { title: "Terms of use", href: "#" },
      { title: "Contact", href: "mailto:hello@dermoscan.ai" },
    ],
  },
];

type AnimatedContainerProps = React.ComponentProps<typeof motion.div> & {
  children?: React.ReactNode;
  delay?: number;
};

function AnimatedContainer({ delay = 0.1, children, ...props }: AnimatedContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
