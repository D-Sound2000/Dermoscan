"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";
import {
  ArrowRight,
  ArrowLeft,
  ScanLine,
  MapPin,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Search,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "signup" | "signin";

type ProfileDraft = {
  skin_type: number | null;
  age_range: string | null;
  activity_level: string | null;
  sunburn_history: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GeoResult = {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIN_TYPES = [
  { type: 1, label: "Type I",   desc: "Always burns, never tans",              color: "#f5e6d3" },
  { type: 2, label: "Type II",  desc: "Burns easily, tans minimally",           color: "#e8c9a0" },
  { type: 3, label: "Type III", desc: "Sometimes burns, tans gradually",        color: "#c8975a" },
  { type: 4, label: "Type IV",  desc: "Rarely burns, tans easily",              color: "#a0693a" },
  { type: 5, label: "Type V",   desc: "Very rarely burns, tans very easily",    color: "#7a4520" },
  { type: 6, label: "Type VI",  desc: "Never burns, deeply pigmented",          color: "#3d1f0e" },
];

const AGE_RANGES = [
  { value: "under-18", label: "Under 18" },
  { value: "18-29",    label: "18 – 29"  },
  { value: "30-44",    label: "30 – 44"  },
  { value: "45-59",    label: "45 – 59"  },
  { value: "60+",      label: "60+"      },
];

const ACTIVITY_LEVELS = [
  { value: "low",      label: "Low",      detail: "Mostly indoors"         },
  { value: "moderate", label: "Moderate", detail: "Some outdoor time"      },
  { value: "high",     label: "High",     detail: "Outdoors frequently"    },
];

const SUNBURN_OPTIONS = [
  { value: "rarely",     label: "Rarely",     detail: "Hardly ever burn"         },
  { value: "sometimes",  label: "Sometimes",  detail: "Burn a few times a year"  },
  { value: "frequently", label: "Frequently", detail: "Burn easily and often"    },
];

const TOTAL_STEPS = 6;

// ─── Shared glass input style ─────────────────────────────────────────────────

const inputCls =
  "w-full bg-black/30 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400/60 focus:ring-0 transition-colors";

// ─── Pill option button ───────────────────────────────────────────────────────

function PillOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
      style={{
        background: selected
          ? "rgba(34,211,238,0.12)"
          : "rgba(255,255,255,0.05)",
        border: selected
          ? "1px solid rgba(34,211,238,0.45)"
          : "1px solid rgba(255,255,255,0.08)",
        color: selected ? "rgb(165,243,252)" : "rgba(255,255,255,0.75)",
      }}
    >
      {children}
      {selected && <CheckCircle2 size={15} className="text-cyan-300 shrink-0" />}
    </button>
  );
}

// ─── Step label ───────────────────────────────────────────────────────────────

function StepLabel({ step }: { step: number }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1 text-cyan-300/70">
      Step {step} of 5
    </p>
  );
}

// ─── Auth step ────────────────────────────────────────────────────────────────

function StepAuth({
  mode,
  setMode,
  supabase,
  onDone,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  supabase: ReturnType<typeof createClient>;
  onDone: (hasProfile: boolean) => void;
}) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onDone(false);
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check if this user already completed onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("skin_type, location_name")
          .eq("id", data.user.id)
          .single();
        onDone(!!(profile?.skin_type && profile?.location_name));
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* logo badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
          <ScanLine size={14} className="text-cyan-200" />
          <span className="text-xs font-medium tracking-wide text-white/90">DermoScan</span>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-serif)" }}>
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-white/55">
          {mode === "signup"
            ? "Sign up to save your skin profile and get personalised UV safety advice."
            : "Sign in to continue to your skin profile."}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputCls}
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputCls + " pr-11"}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/25 text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mt-1 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] transition-all hover:from-cyan-400 hover:to-cyan-300 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-white/45">
        {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
          className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
        >
          {mode === "signup" ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}

// ─── Skin type step ───────────────────────────────────────────────────────────

function StepSkinType({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <StepLabel step={2} />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Your skin type</h2>
        <p className="text-sm text-white/55 mt-1">Determines how quickly UV radiation affects your skin.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {SKIN_TYPES.map((s) => {
          const sel = value === s.type;
          return (
            <button
              key={s.type}
              onClick={() => onChange(s.type)}
              className="flex flex-col gap-2.5 p-3 rounded-xl text-left transition-all"
              style={{
                background: sel ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.05)",
                border: sel ? "1px solid rgba(34,211,238,0.45)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg"
                style={{ background: s.color, border: "1px solid rgba(255,255,255,0.15)", boxShadow: sel ? "0 0 12px rgba(34,211,238,0.2)" : "none" }}
              />
              <div>
                <p className="text-xs font-semibold" style={{ color: sel ? "rgb(165,243,252)" : "rgba(255,255,255,0.85)" }}>
                  {s.label}
                </p>
                <p className="text-[10px] leading-tight mt-0.5 text-white/40">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Age range step ───────────────────────────────────────────────────────────

function StepAgeRange({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <StepLabel step={3} />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Your age range</h2>
        <p className="text-sm text-white/55 mt-1">Affects UV sensitivity and screening recommendations.</p>
      </div>
      <div className="flex flex-col gap-2">
        {AGE_RANGES.map((a) => (
          <PillOption key={a.value} selected={value === a.value} onClick={() => onChange(a.value)}>
            {a.label}
          </PillOption>
        ))}
      </div>
    </div>
  );
}

// ─── Activity step ────────────────────────────────────────────────────────────

function StepActivity({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <StepLabel step={4} />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Outdoor activity</h2>
        <p className="text-sm text-white/55 mt-1">How much time do you typically spend outside?</p>
      </div>
      <div className="flex flex-col gap-2">
        {ACTIVITY_LEVELS.map((a) => (
          <PillOption key={a.value} selected={value === a.value} onClick={() => onChange(a.value)}>
            <span>
              <span className="font-semibold">{a.label}</span>
              <span className="ml-2 text-xs text-white/40">{a.detail}</span>
            </span>
          </PillOption>
        ))}
      </div>
    </div>
  );
}

// ─── Sunburn step ─────────────────────────────────────────────────────────────

function StepSunburn({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <StepLabel step={5} />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Sunburn history</h2>
        <p className="text-sm text-white/55 mt-1">How often have you been sunburned?</p>
      </div>
      <div className="flex flex-col gap-2">
        {SUNBURN_OPTIONS.map((s) => (
          <PillOption key={s.value} selected={value === s.value} onClick={() => onChange(s.value)}>
            <span>
              <span className="font-semibold">{s.label}</span>
              <span className="ml-2 text-xs text-white/40">{s.detail}</span>
            </span>
          </PillOption>
        ))}
      </div>
    </div>
  );
}

// ─── Location step ────────────────────────────────────────────────────────────

function StepLocation({
  value,
  onChange,
}: {
  value: { name: string; lat: number; lng: number } | null;
  onChange: (v: { name: string; lat: number; lng: number }) => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<GeoResult[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQuery(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => searchGeo(q), 380);
  }

  async function searchGeo(q: string) {
    setSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
      );
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  function autoDetect() {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city  = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Your location";
          const state = data.address?.state ?? "";
          onChange({ name: state ? `${city}, ${state}` : city, lat: latitude, lng: longitude });
        } catch {
          onChange({ name: "Detected location", lat: pos.coords.latitude, lng: pos.coords.longitude });
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false)
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-1 text-cyan-300/70">Almost done</p>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Your location</h2>
        <p className="text-sm text-white/55 mt-1">Used to load your local UV forecast automatically.</p>
      </div>

      <button
        onClick={autoDetect}
        disabled={detecting}
        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15 hover:border-cyan-400/50"
      >
        {detecting ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
        {detecting ? "Detecting…" : "Use my current location"}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30">or search</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Search city or region…"
          className={inputCls + " pl-9"}
        />
        {searching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/35" />
        )}
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-1 -mt-2">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onChange({
                  name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`,
                  lat: r.latitude,
                  lng: r.longitude,
                });
                setResults([]);
                setQuery("");
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm text-white/75 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <MapPin size={12} className="text-white/35 shrink-0" />
              {r.name}{r.admin1 ? `, ${r.admin1}` : ""}, {r.country}
            </button>
          ))}
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-cyan-300 border border-cyan-400/30 bg-cyan-400/8">
          <CheckCircle2 size={14} />
          <span>{value.name}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [step, setStep]         = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isActive, setIsActive] = useState(false);

  const [profile, setProfile] = useState<ProfileDraft>({
    skin_type:       null,
    age_range:       null,
    activity_level:  null,
    sunburn_history: null,
    location_name:   null,
    latitude:        null,
    longitude:       null,
  });
  const [location, setLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("skin_type, location_name")
        .eq("id", data.session.user.id)
        .single();
      if (p?.skin_type && p?.location_name) router.replace("/");
      else setStep(1);
    });
  }, []);

  function canAdvance(): boolean {
    if (step === 0) return false;
    if (step === 1) return profile.skin_type !== null;
    if (step === 2) return profile.age_range !== null;
    if (step === 3) return profile.activity_level !== null;
    if (step === 4) return profile.sunburn_history !== null;
    if (step === 5) return location !== null;
    return false;
  }

  async function finish() {
    if (!location) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Not authenticated. Please sign in again.");

      const { error: upsertErr } = await supabase.from("profiles").upsert({
        id: user.id,
        ...profile,
        location_name: location.name,
        latitude:      location.lat,
        longitude:     location.lng,
      });
      if (upsertErr) throw new Error(upsertErr.message);

      router.replace("/");
    } catch (err: any) {
      setSaveError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else finish();
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#020617]"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      {/* SVG filters (same as hero) */}
      <svg className="absolute inset-0 h-0 w-0" aria-hidden>
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02  0 1 0 0 0.02  0 0 1 0 0.05  0 0 0 0.9 0"
              result="tint"
            />
          </filter>
        </defs>
      </svg>

      {/* Mesh gradient backgrounds (same as hero) */}
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={isActive ? 0.45 : 0.25}
        distortion={0.78}
        swirl={0.36}
        grainMixer={0.18}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-[0.62]"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={0.18}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(236,254,255,.2),transparent_40%),linear-gradient(180deg,rgba(2,6,23,.5),rgba(2,6,23,.2)_50%,rgba(2,6,23,.7))]" />

      {/* Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-5 h-0.5 rounded-full overflow-hidden bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300"
              animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />
          </div>
        )}

        <motion.div
          className="rounded-[1.6rem] border border-white/[0.08] bg-white/10 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl"
          style={{ filter: "url(#glass-effect)" }}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* top shine line */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent rounded-full" />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <StepAuth
                  mode={authMode}
                  setMode={setAuthMode}
                  supabase={supabase}
                  onDone={(hasProfile) => hasProfile ? router.replace("/") : setStep(1)}
                />
              )}
              {step === 1 && (
                <StepSkinType
                  value={profile.skin_type}
                  onChange={(v) => setProfile((p) => ({ ...p, skin_type: v }))}
                />
              )}
              {step === 2 && (
                <StepAgeRange
                  value={profile.age_range}
                  onChange={(v) => setProfile((p) => ({ ...p, age_range: v }))}
                />
              )}
              {step === 3 && (
                <StepActivity
                  value={profile.activity_level}
                  onChange={(v) => setProfile((p) => ({ ...p, activity_level: v }))}
                />
              )}
              {step === 4 && (
                <StepSunburn
                  value={profile.sunburn_history}
                  onChange={(v) => setProfile((p) => ({ ...p, sunburn_history: v }))}
                />
              )}
              {step === 5 && (
                <StepLocation
                  value={location}
                  onChange={setLocation}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {step > 0 && (
            <div className="flex flex-col gap-3 mt-8">
              {saveError && (
                <p className="text-xs px-3 py-2 rounded-lg text-center bg-red-500/10 border border-red-400/25 text-red-300">
                  {saveError}
                </p>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={back}
                  disabled={step <= 1}
                  className="flex items-center gap-1.5 text-sm text-white/45 hover:text-white/70 transition-colors disabled:invisible"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <button
                  onClick={next}
                  disabled={!canAdvance() || saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-35 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#020617] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-950/30"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  ) : isLast ? (
                    <>Finish setup <Sparkles size={14} /></>
                  ) : (
                    <>Next <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
