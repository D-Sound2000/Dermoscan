"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { createClient, type Scan } from "@/lib/supabase";

function ReportContent() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const mole = params.get("mole") ?? "";
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/onboarding");
        return;
      }
      const { data } = await supabase.from("scans").select("*").eq("user_id", user.id).order("scanned_at", { ascending: true });
      setScans(((data ?? []) as Scan[]).filter((scan) => scan.mole_label === mole));
      setLoading(false);
    }
    load();
  }, [mole, router, supabase]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-white/60">Preparing report…</div>;
  if (!mole || scans.length === 0) return <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white"><div><h1 className="text-2xl font-semibold">No scan history found</h1><Link href="/my-moles" className="mt-4 inline-block text-cyan-300">Return to lesion history</Link></div></div>;

  const latest = scans[scans.length - 1];
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between print:hidden">
        <Link href="/my-moles" className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="size-4" /> Back</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"><Download className="size-4" /> Save as PDF</button>
      </div>

      <article className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:p-8 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">DermoScan clinician handoff</p><h1 className="mt-2 text-3xl font-bold">Lesion history: {mole}</h1><p className="mt-2 text-sm text-slate-500">Generated {new Date().toLocaleDateString()} • {scans.length} documented capture{scans.length === 1 ? "" : "s"}</p></div>
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-[10px] uppercase tracking-wider text-white/60">Latest model output</p><p className="mt-1 font-semibold">{latest.predicted_class}</p><p className="text-xs text-white/60">Malignant score {Math.round(latest.malignant_probability * 100)}%</p></div>
        </header>

        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" /><p className="text-sm leading-6 text-amber-950"><strong>Not a diagnosis.</strong> Model scores are research outputs, not the patient&apos;s probability of cancer and not proof of biological change. Clinical history and examination take priority.</p></div>
        </section>

        <section className="mt-7"><h2 className="text-lg font-bold">Capture timeline</h2><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {scans.map((scan) => <div key={scan.id} className="break-inside-avoid overflow-hidden rounded-xl border border-slate-200">{scan.image_preview ? <img src={scan.image_preview} alt={`${mole} on ${scan.scanned_at}`} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-400">Image not retained</div>}<div className="p-3 text-xs leading-5"><p className="font-semibold">{new Date(scan.scanned_at).toLocaleDateString()}</p><p className="text-slate-500">Location: {scan.body_location || "Not recorded"}</p><p className="text-slate-500">Quality: {scan.image_quality_score ?? "—"}/100</p><p className="text-slate-500">Model score: {Math.round(scan.malignant_probability * 100)}%</p></div></div>)}
        </div></section>

        <section className="mt-7 grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-slate-200 p-5"><h2 className="font-bold">Reported observations</h2><div className="mt-3 space-y-3 text-sm text-slate-600">{scans.some((scan) => scan.symptoms) ? scans.filter((scan) => scan.symptoms).map((scan) => <p key={scan.id}><strong>{new Date(scan.scanned_at).toLocaleDateString()}:</strong> {scan.symptoms}</p>) : <p>No symptoms or observations recorded.</p>}</div></div><div className="rounded-xl border border-slate-200 p-5"><h2 className="font-bold">Questions for a clinician</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>• Does this lesion need dermoscopic examination or biopsy?</li><li>• Are the visible changes clinically concerning?</li><li>• How often should it be monitored?</li><li>• What symptoms should trigger earlier follow-up?</li></ul></div></section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[10px] leading-4 text-slate-400">DermoScan supports documentation and education only. It does not replace evaluation by a qualified healthcare professional. Images may differ because of lighting, camera angle, distance, and focus.</footer>
      </article>
    </main>
  );
}

export default function ReportPage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-white/60">Preparing report…</div>}><ReportContent /></Suspense>;
}
