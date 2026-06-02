"use client";

import ShaderShowcase from "@/components/ui/hero";
import { StickyFooter } from "@/components/ui/sticky-footer";

export default function Home() {
  return (
    <main className="bg-black">
      <ShaderShowcase />
      <StickyFooter />
    </main>
  );
}
