"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";
import {
  ArrowLeft,
  MapPin,
  Sun,
  Activity,
  User,
  LogOut,
  ScanLine,
  Flame,
  Shield,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { createClient, type Profile } from "@/lib/supabase";

// ─── Display helpers ──────────────────────────────────────────────────────────

const SKIN_TYPES: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: "Type I",   desc: "Always burns, never tans",           color: "#f5e6d3" },
  2: { label: "Type II",  desc: "Burns easily, tans minimally",        color: "#e8c9a0" },
  3: { label: "Type III", desc: "Sometimes burns, tans gradually",     color: "#c8975a" },
  4: { label: "Type IV",  desc: "Rarely burns, tans easily",           color: "#a0693a" },
  5: { label: "Type V",   desc: "Very rarely burns, tans very easily", color: "#7a4520" },
  6: { label: "Type VI",  desc: "Never burns, deeply pigmented",       color: "#3d1f0e" },
};

const AGE_LABELS: Record<string, string> = {
  "under-18": "Under 18",
  "18-29":    "18 – 29",
  "30-44":    "30 – 44",
  "45-59":    "45 – 59",
  "60+":      "60+",
};

const ACTIVITY_LABELS: Record<string, string> = {
  low:      "Low — mostly indoors",
  moderate: "Moderate — some outdoor time",
  high:     "High — outdoors frequently",
};

const SUNBURN_LABELS: Record<string, string> = {
  rarely:     "Rarely",
  sometimes:  "Sometimes",
  frequently: "Frequently",
};

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
      >
        <Icon size={16} className="text-cyan-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-white/35 mb-0.5">{label}</p>
        <div className="text-sm text-white/85 font-medium">{value}</div>
      </div>
      {extra}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(true);

  // MFA state
  const [mfaFactor, setMfaFactor]       = useState<{ id: string } | null>(null);
  const [enrolling, setEnrolling]       = useState(false);
  const [qrCode, setQrCode]             = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [enrollCode, setEnrollCode]     = useState("");
  const [enrollError, setEnrollError]   = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [mfaActionLoading, setMfaActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/onboarding"); return; }

      setEmail(user.email ?? "");

      const [{ data: profileData }, { data: factorsData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.auth.mfa.listFactors(),
      ]);

      setProfile(profileData);
      const totp = (factorsData?.totp ?? []).find((f: any) => f.status === "verified") ?? null;
      setMfaFactor(totp ? { id: totp.id } : null);
      setLoading(false);
    }
    load();
  }, []);

  async function startEnroll() {
    setEnrolling(true);
    setQrCode(null);
    setEnrollCode("");
    setEnrollError("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) { setEnrolling(false); return; }
    setQrCode(data.totp.qr_code);
    setEnrollFactorId(data.id);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollFactorId) return;
    setEnrollLoading(true);
    setEnrollError("");
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrollFactorId, challengeId: ch.id, code: enrollCode });
      if (vErr) throw vErr;
      setMfaFactor({ id: enrollFactorId });
      cancelEnroll();
    } catch (err: any) {
      setEnrollError(err.message ?? "Invalid code. Try again.");
    } finally {
      setEnrollLoading(false);
    }
  }

  function cancelEnroll() {
    setEnrolling(false);
    setQrCode(null);
    setEnrollFactorId(null);
    setEnrollCode("");
    setEnrollError("");
  }

  async function unenroll() {
    if (!mfaFactor) return;
    setMfaActionLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id });
    if (!error) setMfaFactor(null);
    setMfaActionLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/onboarding");
  }

  const skinData = profile?.skin_type ? SKIN_TYPES[profile.skin_type] : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#020617] overflow-hidden">
      {/* SVG filters */}
      <svg className="absolute inset-0 h-0 w-0" aria-hidden>
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix type="matrix" values="1 0 0 0 0.02  0 1 0 0 0.02  0 0 1 0 0.05  0 0 0 0.9 0" result="tint" />
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={0.2}
        distortion={0.78}
        swirl={0.36}
        grainMixer={0.18}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-50"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={0.14}
        distortion={0.42}
        swirl={0.18}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(236,254,255,.15),transparent_40%),linear-gradient(180deg,rgba(2,6,23,.55),rgba(2,6,23,.25)_50%,rgba(2,6,23,.75))]" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Back to app
        </button>
        <div className="flex items-center gap-2">
          <ScanLine size={15} className="text-cyan-300/70" />
          <span className="text-sm font-medium text-white/60">DermoScan</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-start justify-center p-6 pt-10">
        {loading ? (
          <div className="flex items-center justify-center mt-20">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md flex flex-col gap-4"
          >
            {/* Avatar + email */}
            <div
              className="rounded-[1.4rem] border border-white/[0.08] bg-white/10 backdrop-blur-2xl p-6 flex items-center gap-4"
              style={{ filter: "url(#glass-effect)" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-cyan-200">
                  {email ? email[0].toUpperCase() : "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-white/35 mb-0.5">Account</p>
                <p className="text-base font-semibold text-white truncate">{email}</p>
              </div>
            </div>

            {/* Profile data */}
            <div
              className="rounded-[1.4rem] border border-white/[0.08] bg-white/10 backdrop-blur-2xl p-5 flex flex-col gap-2.5"
              style={{ filter: "url(#glass-effect)" }}
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent rounded-full" />

              <p className="text-xs uppercase tracking-widest font-semibold text-white/35 px-1 mb-1">Skin Profile</p>

              {/* Skin type */}
              <InfoRow
                icon={User}
                label="Fitzpatrick Skin Type"
                value={
                  skinData ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ background: skinData.color, border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                      {skinData.label} — {skinData.desc}
                    </span>
                  ) : (
                    <span className="text-white/35 italic">Not set</span>
                  )
                }
              />

              {/* Age */}
              <InfoRow
                icon={User}
                label="Age Range"
                value={
                  profile?.age_range
                    ? AGE_LABELS[profile.age_range] ?? profile.age_range
                    : <span className="text-white/35 italic">Not set</span>
                }
              />

              {/* Activity */}
              <InfoRow
                icon={Activity}
                label="Outdoor Activity"
                value={
                  profile?.activity_level
                    ? ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level
                    : <span className="text-white/35 italic">Not set</span>
                }
              />

              {/* Sunburn */}
              <InfoRow
                icon={Flame}
                label="Sunburn History"
                value={
                  profile?.sunburn_history
                    ? SUNBURN_LABELS[profile.sunburn_history] ?? profile.sunburn_history
                    : <span className="text-white/35 italic">Not set</span>
                }
              />

              {/* Location */}
              <InfoRow
                icon={MapPin}
                label="Home Location"
                value={
                  profile?.location_name
                    ? profile.location_name
                    : <span className="text-white/35 italic">Not set</span>
                }
              />
            </div>

            {/* Security / 2FA */}
            <div
              className="rounded-[1.4rem] border border-white/[0.08] bg-white/10 backdrop-blur-2xl p-5 flex flex-col gap-2.5"
              style={{ filter: "url(#glass-effect)" }}
            >
              <p className="text-xs uppercase tracking-widest font-semibold text-white/35 px-1 mb-1">Security</p>
              {mfaFactor ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.18)" }}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-cyan-300 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">Two-factor auth enabled</p>
                      <p className="text-xs text-white/40">Authenticator app (TOTP)</p>
                    </div>
                  </div>
                  <button
                    onClick={unenroll}
                    disabled={mfaActionLoading}
                    className="text-xs text-red-400/70 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {mfaActionLoading ? "…" : "Remove"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEnroll}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-white/65 hover:bg-white/8 hover:text-white transition-colors w-full text-left"
                >
                  <Shield size={15} className="text-white/35" />
                  Set up two-factor auth
                </button>
              )}
            </div>

            {/* MFA enrollment modal */}
            {enrolling && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-[1.4rem] border border-white/[0.08] bg-[#020617] p-6 flex flex-col gap-4">
                  <p className="text-base font-semibold text-white">Set up two-factor auth</p>
                  {!qrCode ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-white/55">Scan this QR code with Google Authenticator, Authy, or any TOTP app.</p>
                      <img src={qrCode} alt="2FA QR code" className="w-44 h-44 mx-auto rounded-xl bg-white p-2" />
                      <form onSubmit={confirmEnroll} className="flex flex-col gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter 6-digit code"
                          value={enrollCode}
                          onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          maxLength={6}
                          className="w-full bg-black/30 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400/60 transition-colors text-center tracking-widest font-mono"
                          autoFocus
                        />
                        {enrollError && <p className="text-xs text-red-400">{enrollError}</p>}
                        <button
                          type="submit"
                          disabled={enrollCode.length !== 6 || enrollLoading}
                          className="w-full py-3 rounded-xl text-sm font-semibold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                        >
                          {enrollLoading && <Loader2 size={14} className="animate-spin" />}
                          {enrollLoading ? "Verifying…" : "Enable 2FA"}
                        </button>
                        <button type="button" onClick={cancelEnroll} className="text-xs text-white/35 hover:text-white/60 transition-colors text-center">
                          Cancel
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              className="rounded-[1.4rem] border border-white/[0.08] bg-white/10 backdrop-blur-2xl p-3 flex flex-col gap-1"
              style={{ filter: "url(#glass-effect)" }}
            >
              <button
                onClick={() => router.push("/onboarding")}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-white/65 hover:bg-white/8 hover:text-white transition-colors w-full text-left"
              >
                <ScanLine size={15} className="text-white/35" />
                Re-run onboarding
              </button>
              <div className="h-px bg-white/8 mx-2" />
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-400/70 hover:bg-red-500/8 hover:text-red-300 transition-colors w-full text-left"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
