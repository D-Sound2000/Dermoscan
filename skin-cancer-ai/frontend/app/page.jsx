"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShaderShowcase from "@/components/ui/hero";
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
    </main>
  );
}
