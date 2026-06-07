"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpIcon,
  CircleUserRound,
  FileText,
  HeartPulse,
  Loader2,
  MessageCircle,
  Paperclip,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const starterPrompts = [
  {
    icon: <FileText className="h-4 w-4" />,
    label: "Explain report",
    prompt: "Explain my DermoScan report findings in plain language.",
  },
  {
    icon: <HeartPulse className="h-4 w-4" />,
    label: "Risk level",
    prompt: "What does this risk level mean, and when should I seek professional evaluation?",
  },
  {
    icon: <Stethoscope className="h-4 w-4" />,
    label: "Dermatologist questions",
    prompt: "What should I ask a dermatologist at my appointment?",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    label: "ABCDE criteria",
    prompt: "Explain the ABCDE criteria and how they relate to this report.",
  },
];

const initialMessages = [
  {
    role: "assistant",
    text:
      "I can explain a DermoScan report as educational support. I cannot diagnose or rule out cancer, and concerning or high-risk results should be reviewed by a qualified clinician.",
  },
];

function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${nextHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export default function RuixenMoonChat() {
  const [reportId, setReportId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const transcriptRef = useRef(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryReportId = params.get("reportId");
    const latestReportId = window.localStorage.getItem("dermoscan.latestReportId");
    setReportId(queryReportId || latestReportId || "");
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedReportId = reportId.trim();

    if (!trimmedReportId) {
      setError("Scan a lesion first, or paste a report ID.");
      return;
    }

    if (!trimmedMessage || isLoading) return;

    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", text: trimmedMessage }]);
    setMessage("");
    adjustHeight(true);

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
    requestAnimationFrame(() => adjustHeight());
  };

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col items-center overflow-hidden bg-black text-white">
      <GradientBackground />
      <div className="absolute inset-0 -z-10 bg-black/20" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2)_48%,rgba(0,0,0,.68))]" />

      <section className="relative z-10 flex min-h-screen w-full flex-col items-center px-4 py-6 sm:px-6">
        <header className="flex w-full max-w-5xl items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/50">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-300/15 text-cyan-100">
              <MessageCircle className="h-4 w-4" />
            </span>
            DermoScan
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200/20 bg-black/35 px-4 py-2 text-xs font-semibold text-emerald-50 backdrop-blur-md sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Report-aware, no diagnosis
          </div>
        </header>

        <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center pb-5 pt-10">
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-100/75">Gemini context chat</p>
            <h1 className="mt-3 text-4xl font-semibold text-white drop-shadow-sm sm:text-5xl">Ask about your scan</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-200 sm:text-base">
              Get plain-language explanations grounded in the selected DermoScan report.
            </p>
          </div>

          <div
            ref={transcriptRef}
            className="mt-8 grid max-h-[34vh] w-full gap-3 overflow-y-auto px-1"
            aria-live="polite"
          >
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={cn(
                  "max-w-[88%] rounded-xl border px-4 py-3 text-sm leading-6 shadow-lg backdrop-blur-md",
                  item.role === "user"
                    ? "ml-auto border-cyan-200/25 bg-cyan-300/15 text-cyan-50"
                    : "border-neutral-700 bg-black/55 text-neutral-100",
                )}
              >
                {item.text}
              </div>
            ))}

            {isLoading ? (
              <div className="max-w-[88%] rounded-xl border border-neutral-700 bg-black/55 px-4 py-3 text-sm leading-6 text-neutral-200 shadow-lg backdrop-blur-md">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-100" />
                  Reading the report context
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-20 mb-[8vh] w-full max-w-3xl">
          <div className="mb-3 grid gap-2 rounded-xl border border-neutral-700 bg-black/55 p-3 backdrop-blur-md sm:grid-cols-[1fr_minmax(12rem,18rem)]">
            <label className="sr-only" htmlFor="report-id">
              Report ID
            </label>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-neutral-300">
              <CircleUserRound className="h-4 w-4 text-cyan-100" />
              <span className="shrink-0 font-medium text-white">Report ID</span>
              <input
                id="report-id"
                value={reportId}
                onChange={(event) => setReportId(event.target.value)}
                placeholder="Run a scan to fill automatically"
                className="min-w-0 flex-1 bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-orange-200/15 bg-orange-300/10 px-3 py-2 text-xs leading-5 text-orange-50/85">
              <Stethoscope className="h-4 w-4 shrink-0" />
              Educational support only.
            </div>
          </div>

          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-orange-200/25 bg-orange-300/15 px-4 py-3 text-sm leading-6 text-orange-50 backdrop-blur-md">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={sendMessage} className="relative rounded-xl border border-neutral-700 bg-black/60 backdrop-blur-md">
            <label className="sr-only" htmlFor="chat-message">
              Ask about the report
            </label>
            <Textarea
              id="chat-message"
              ref={textareaRef}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                adjustHeight();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
              placeholder="Ask about findings, ABCDE criteria, risk levels, or professional evaluation..."
              className={cn(
                "min-h-[48px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm text-white",
                "placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0",
              )}
              style={{ overflow: "hidden" }}
            />

            <div className="flex items-center justify-between p-3 pt-1">
              <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-neutral-700" aria-label="Attachments unavailable">
                <Paperclip className="h-4 w-4" />
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                  message.trim()
                    ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    : "cursor-not-allowed bg-neutral-700 text-neutral-400",
                )}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpIcon className="h-4 w-4" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {starterPrompts.map((item) => (
              <QuickAction key={item.label} icon={item.icon} label={item.label} onClick={() => useStarterPrompt(item.prompt)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-700 bg-black/50 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
