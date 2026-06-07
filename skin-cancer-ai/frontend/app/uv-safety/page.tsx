"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { WeatherSafetyAdvisor } from "@/components/ui/weather-safety-advisor";
import { createClient } from "@/lib/supabase";

type LocationState = {
  name: string;
  latitude: number;
  longitude: number;
} | null;

export default function UVSafetyPage() {
  const router = useRouter();
  const [location, setLocation] = useState<LocationState>(null);
  const [skinType, setSkinType] = useState<number | null>(null);
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

      if (!profile?.skin_type || !profile?.location_name) {
        router.replace("/onboarding");
        return;
      }

      setLocation({
        name: profile.location_name,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
      setSkinType(profile.skin_type);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020303]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020303]">
      <div className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#020303]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm text-white/60 transition hover:bg-white/[0.10] hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
          <div className="flex items-center gap-2 text-white/40">
            <ScanLine className="size-4 text-cyan-100/60" />
            <span className="hidden text-sm font-medium text-white/50 sm:block">DermoScan</span>
          </div>
        </div>
      </div>
      <WeatherSafetyAdvisor initialLocation={location} skinType={skinType} />
    </div>
  );
}
