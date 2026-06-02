"use client";

import ShaderShowcase from "@/components/ui/hero";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { WeatherSafetyAdvisor } from "@/components/ui/weather-safety-advisor";

export default function Home() {
  return (
    <main className="bg-black">
      <ShaderShowcase />
      <WeatherSafetyAdvisor />
      <StickyFooter />
    </main>
  );
}
