"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ShaderShowcase from "@/components/ui/hero";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/onboarding");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("skin_type, location_name, latitude, longitude")
        .eq("id", data.session.user.id)
        .single();

      // If no profile or missing required fields, send to onboarding
      if (!profile?.skin_type || !profile?.location_name) {
        router.replace("/onboarding");
        return;
      }

      setLocation({
        name: profile.location_name,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--mint)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <main className="bg-black">
      <ShaderShowcase />
      <section className="relative overflow-hidden bg-[#020303] px-5 py-16 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.05),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-8 md:p-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/70 mb-5">
                  <span className="size-3 rounded-full bg-cyan-400/60" />
                  UV & Skin Safety
                </div>
                <h2 className="text-3xl font-semibold text-white md:text-4xl">
                  Check today&apos;s outdoor skin risk
                </h2>
                <p className="mt-3 max-w-lg text-base leading-7 text-white/55">
                  Get a real-time UV safety score, hourly UV timeline, and a personalized protection plan for your location.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Live UV data", "Sunscreen advice", "Clothing guide", "Hydration tips"].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/uv-safety"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 md:flex-shrink-0"
              >
                Check UV Safety
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <StickyFooter />
    </main>
  );
}
