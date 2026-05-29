"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  FileScan,
  Menu,
  Microscope,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { cn } from "@/lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const menuItems = [
  { name: "Scanner", href: "#scan" },
  { name: "Evidence", href: "#evidence" },
  { name: "Workflow", href: "#workflow" },
  { name: "Safety", href: "#safety" },
];

const signals = [
  { label: "Validation AUC", value: "0.9869", icon: BarChart3 },
  { label: "DenseNet-121", value: "Model", icon: Microscope },
  { label: "Grad-CAM", value: "Heatmap", icon: FileScan },
  { label: "Review only", value: "Not diagnosis", icon: ShieldCheck },
];

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden bg-background text-foreground">
        <section className="relative isolate min-h-screen overflow-hidden">
          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    delayChildren: 0.6,
                  },
                },
              },
              item: {
                hidden: {
                  opacity: 0,
                  y: 20,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    type: "spring",
                    bounce: 0.25,
                    duration: 1.6,
                  },
                },
              },
            }}
            className="absolute inset-0 -z-20"
          >
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2400&q=85"
              alt=""
              className="h-full w-full object-cover opacity-30 saturate-75"
              width="2400"
              height="1600"
            />
          </AnimatedGroup>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,9,9,.76),var(--background)_78%),radial-gradient(70%_70%_at_50%_20%,rgba(94,244,207,.18),transparent_62%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-24 -z-10 hidden h-[28rem] bg-[linear-gradient(90deg,transparent,rgba(94,244,207,.16),transparent)] opacity-60 blur-3xl lg:block"
          />

          <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pb-12 pt-28 md:pt-36">
            <div className="text-center sm:mx-auto">
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href="#scan"
                  className="group mx-auto flex w-fit items-center gap-4 rounded-full border border-border bg-muted/80 p-1 pl-4 shadow-md shadow-black/20 backdrop-blur transition-all duration-300 hover:bg-background/80"
                >
                  <span className="text-sm text-foreground">AI skin-lesion review workspace</span>
                  <span className="block h-4 w-0.5 border-l bg-white/20"></span>
                  <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-background duration-500 group-hover:bg-muted">
                    <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>

                <h1 className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-semibold leading-[0.95] tracking-normal text-foreground md:text-7xl lg:mt-14 xl:text-[5.4rem]">
                  DermoScan turns a lesion image into a reviewable AI report.
                </h1>
                <p className="mx-auto mt-8 max-w-2xl text-balance text-base leading-8 text-muted-foreground md:text-lg">
                  Upload a dermoscopic or close-up skin photo, receive a benign or malignant probability,
                  and inspect a Grad-CAM heatmap that shows what influenced the model.
                </p>
              </AnimatedGroup>

              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.65,
                      },
                    },
                  },
                  ...transitionVariants,
                }}
                className="mt-11 flex flex-col items-center justify-center gap-3 md:flex-row"
              >
                <div className="rounded-[14px] border border-primary/30 bg-primary/10 p-0.5">
                  <Button asChild size="lg" className="rounded-xl px-5 text-base">
                    <Link href="#scan">
                      <span className="text-nowrap">Start Analysis</span>
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
                <Button asChild size="lg" variant="ghost" className="h-11 rounded-xl px-5">
                  <Link href="#workflow">
                    <span className="text-nowrap">See workflow</span>
                  </Link>
                </Button>
              </AnimatedGroup>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.8,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative mt-12 overflow-hidden px-0 sm:mt-16 md:mt-20">
                <div
                  aria-hidden
                  className="absolute inset-0 z-10 bg-gradient-to-b from-transparent from-60% to-background"
                />
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border bg-background/86 p-3 shadow-2xl shadow-black/35 ring-1 ring-background/70 backdrop-blur">
                  <div className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[1.05fr_.95fr]">
                    <div className="relative min-h-[290px] overflow-hidden bg-muted md:min-h-[390px]">
                      <img
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                        src="https://images.unsplash.com/photo-1581093458791-9d42e6091c22?auto=format&fit=crop&w=1600&q=85"
                        alt="Clinical imaging workstation"
                        width="1600"
                        height="1000"
                      />
                      <div className="absolute inset-8 border border-primary/55">
                        <span className="absolute -left-px -top-px size-8 border-l-2 border-t-2 border-primary" />
                        <span className="absolute -right-px -top-px size-8 border-r-2 border-t-2 border-primary" />
                        <span className="absolute -bottom-px -left-px size-8 border-b-2 border-l-2 border-primary" />
                        <span className="absolute -bottom-px -right-px size-8 border-b-2 border-r-2 border-primary" />
                      </div>
                      <div className="absolute left-8 right-8 top-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_28px_rgba(94,244,207,.75)]" />
                    </div>
                    <div className="flex flex-col justify-between gap-8 p-6 md:p-8">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
                          Model Output
                        </p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                          Confidence, risk, and visual attribution in one place.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                          DermoScan is designed for transparent review. It pairs probability scores
                          with heatmap context so the result never feels like a black box.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {signals.map((signal) => (
                          <div key={signal.label} className="rounded-lg border border-border bg-muted/50 p-4">
                            <signal.icon className="size-5 text-primary" aria-hidden />
                            <strong className="mt-4 block text-lg text-foreground">{signal.value}</strong>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {signal.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
      </main>
    </>
  );
}

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && "active"} className="group fixed z-50 w-full px-2">
        <div
          className={cn(
            "liquid-glass-header relative mx-auto mt-3 max-w-6xl overflow-hidden rounded-2xl border border-white/10 px-6 shadow-[0_24px_80px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.16)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,.16),transparent_58%)] lg:px-12",
            isScrolled && "max-w-4xl border-primary/20 bg-background/55 shadow-[0_18px_60px_rgba(0,0,0,.32),inset_0_1px_0_rgba(255,255,255,.18)] lg:px-5",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 top-0 h-24 w-48 rotate-12 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-1 h-24 w-48 -rotate-12 rounded-full bg-primary/10 blur-2xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="DermoScan home" className="flex items-center gap-2">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 text-foreground lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 group-data-[state=active]:scale-0 group-data-[state=active]:rotate-180 group-data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 group-data-[state=active]:scale-100 group-data-[state=active]:rotate-0 group-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="block text-muted-foreground duration-150 hover:text-foreground"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-white/10 bg-background/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl group-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none lg:group-data-[state=active]:flex">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="block text-muted-foreground duration-150 hover:text-foreground"
                        onClick={() => setMenuState(false)}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && "lg:hidden")}>
                  <Link href="#workflow">
                    <span>Review steps</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled && "lg:hidden")}>
                  <Link href="#scan">
                    <span>Open scanner</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled ? "lg:inline-flex" : "hidden")}>
                  <Link href="#scan">
                    <span>Analyze</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

const Logo = () => {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="grid size-8 place-items-center rounded-full border border-primary/50 bg-primary/10 text-primary">
        <ScanLine className="size-4" aria-hidden />
      </span>
      <span>DermoScan</span>
    </span>
  );
};
