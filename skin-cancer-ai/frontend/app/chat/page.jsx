"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, FileText, Loader2, MessageCircle, Send, ShieldCheck, Stethoscope } from "lucide-react";
import { Header } from "@/components/ui/header-2";

const starterPrompts = [
  "Explain my DermoScan report findings in plain language.",
  "Explain the ABCDE criteria and how they relate to skin lesion review.",
  "What do the risk levels mean, and when should I seek professional evaluation?",
];

const initialMessages = [
  {
    role: "assistant",
    text:
      "I can explain a DermoScan report as educational support. I cannot diagnose or rule out cancer, and concerning or high-risk results should be reviewed by a qualified clinician.",
  },
];

export default function ChatPage() {
  const reduceMotion = useReducedMotion();
  const [reportId, setReportId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryReportId = params.get("reportId");
    const latestReportId = window.localStorage.getItem("dermoscan.latestReportId");
    setReportId(queryReportId || latestReportId || "");
  }, []);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedReportId = reportId.trim();

    if (!trimmedReportId) {
      setError("Scan a lesion first, or paste a report ID.");
      return;
    }

    if (!trimmedMessage) return;

    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", text: trimmedMessage }]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage, reportId: trimmedReportId }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = typeof payload?.detail === "string" ? payload.detail : "Could not get a chatbot reply.";
        throw new Error(detail);
      }

      setMessages((current) => [...current, { role: "assistant", text: payload.reply }]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Could not get a chatbot reply.");
    } finally {
      setIsLoading(false);
    }
  };

  const useStarterPrompt = (prompt) => {
    setMessage(prompt);
    setError("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#020617", "#0f766e", "#22d3ee", "#164e63", "#f97316"]}
        speed={reduceMotion ? 0 : 0.22}
        distortion={0.72}
        swirl={0.28}
        grainMixer={0.16}
        grainOverlay={0.08}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-[0.54]"
        colors={["#000000", "#ecfeff", "#06b6d4", "#fb923c"]}
        speed={reduceMotion ? 0 : 0.14}
        distortion={0.34}
        swirl={0.14}
        grainMixer={0.08}
        grainOverlay={0.04}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(236,254,255,.24),transparent_34%),linear-gradient(90deg,rgba(2,6,23,.76),rgba(2,6,23,.38)_48%,rgba(2,6,23,.66))]" />

      <Header />

      <section className="relative z-20 mx-auto grid min-h-screen w-full max-w-6xl gap-5 px-6 pb-8 pt-28 md:px-8 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1fr)]">
        <motion.aside
          className="h-fit rounded-[2rem] border border-white/[0.08] bg-white/10 p-5 shadow-2xl shadow-cyan-950/25 backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full border border-cyan-100/20 bg-cyan-100/10 text-cyan-100">
              <MessageCircle className="size-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/65">Report assistant</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Ask about a scan</h1>
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium text-white/80" htmlFor="report-id">
            Report ID
          </label>
          <input
            id="report-id"
            value={reportId}
            onChange={(event) => setReportId(event.target.value)}
            placeholder="Run a scan to fill this automatically"
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/20"
          />

          <div className="mt-5 grid gap-3">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => useStarterPrompt(prompt)}
                className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-left text-sm leading-6 text-white/72 transition hover:border-cyan-200/35 hover:bg-white/10 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-orange-200/20 bg-orange-300/10 p-4 text-sm leading-6 text-orange-50/82">
            <div className="mb-2 flex items-center gap-2 font-semibold text-orange-50">
              <Stethoscope className="size-4" />
              Educational support
            </div>
            Use this to understand DermoScan output, ABCDE criteria, and risk language. It is not medical advice.
          </div>
        </motion.aside>

        <motion.section
          className="flex min-h-[34rem] flex-col rounded-[2rem] border border-white/[0.08] bg-white/10 p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-3 pb-3 pt-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/65">Gemini context chat</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Report-aware explanation</h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-50 sm:flex">
              <ShieldCheck className="size-4" />
              No diagnosis
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1 py-4">
            <div className="grid gap-3">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`max-w-[88%] rounded-[1.4rem] border px-4 py-3 text-sm leading-6 ${
                    item.role === "user"
                      ? "ml-auto border-cyan-200/25 bg-cyan-300/15 text-cyan-50"
                      : "border-white/[0.08] bg-black/25 text-white/78"
                  }`}
                >
                  {item.text}
                </div>
              ))}

              {isLoading ? (
                <div className="max-w-[88%] rounded-[1.4rem] border border-white/[0.08] bg-black/25 px-4 py-3 text-sm leading-6 text-white/68">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-cyan-100" />
                    Reading the report context
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-orange-200/25 bg-orange-300/10 px-4 py-3 text-sm leading-6 text-orange-50">
              <AlertTriangle className="mt-1 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={sendMessage} className="grid gap-3 rounded-[1.45rem] border border-white/[0.08] bg-black/25 p-3 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="chat-message">
              Ask about the report
            </label>
            <textarea
              id="chat-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about findings, ABCDE criteria, risk levels, or professional evaluation..."
              rows={2}
              className="max-h-36 min-h-14 resize-none rounded-[1rem] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/20"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 px-6 text-sm font-semibold text-white shadow-lg shadow-cyan-950/35 transition hover:from-cyan-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </button>
          </form>

          <div className="mt-3 flex items-center gap-2 px-2 text-xs leading-5 text-white/48">
            <FileText className="size-3.5" />
            Replies are grounded in the selected DermoScan report and are educational only.
          </div>
        </motion.section>
      </section>
    </main>
  );
}
