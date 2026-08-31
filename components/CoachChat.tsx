"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StartWorkoutButton from "./StartWorkoutButton";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export interface NextUpInfo {
  templateId: number;
  name: string;
  when: string;
  exerciseCount: number;
  estMinutes: number;
}

const QUICK_REPLIES = [
  "Adjust my week",
  "What should I focus on?",
  "How's my progress?",
];

export default function CoachChat({
  initialMessages,
  nextUp,
  activeSession,
  hasProfile,
}: {
  initialMessages: ChatEntry[];
  nextUp: NextUpInfo | null;
  activeSession: { id: number; name: string } | null;
  hasProfile: boolean;
}) {
  const [messages, setMessages] = useState<ChatEntry[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const streamingRef = useRef(false);
  const askedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const runStream = useCallback(
    async (payload: Record<string, unknown>, showUserBubble?: string) => {
      if (streamingRef.current) return;
      streamingRef.current = true;
      setStreaming(true);
      setMessages((prev) => [
        ...prev,
        ...(showUserBubble
          ? [{ role: "user" as const, content: showUserBubble }]
          : []),
        { role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: data.error ?? "The coach is unavailable right now.",
            };
            return next;
          });
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let assistantText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          const snapshot = assistantText;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: snapshot };
            return next;
          });
        }
      } catch {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Connection lost — please try again.",
          };
          return next;
        });
      } finally {
        streamingRef.current = false;
        setStreaming(false);
      }
    },
    []
  );

  // Smart Modify handoff: /?ask=<text> pre-sends a message from the Plan tab.
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (ask && ask.trim()) {
      greetedRef.current = true; // the ask replaces the welcome
      window.history.replaceState(null, "", "/");
      runStream({ message: ask.trim() }, ask.trim());
    }
  }, [runStream]);

  // The coach opens the conversation the first time the app is opened.
  useEffect(() => {
    if (greetedRef.current || initialMessages.length > 0) return;
    greetedRef.current = true;
    runStream({ event: "welcome" });
  }, [initialMessages.length, runStream]);

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    runStream({ message: content }, content);
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-10 rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-sm text-white"
                : "mr-6 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm"
            }
          >
            <div className="whitespace-pre-wrap">
              {m.content ||
                (streaming && i === messages.length - 1 ? (
                  <span className="text-zinc-400">…</span>
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}

        {activeSession ? (
          <Link
            href={`/workout/${activeSession.id}`}
            className="mr-6 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm transition hover:bg-blue-100"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Workout in progress
              </div>
              <div className="mt-0.5 text-sm font-semibold text-zinc-900">
                {activeSession.name}
              </div>
            </div>
            <span className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white">
              Resume
            </span>
          </Link>
        ) : nextUp ? (
          <div className="mr-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {nextUp.when}
              </div>
              <Link
                href={`/templates/${nextUp.templateId}`}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
              >
                View →
              </Link>
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {nextUp.name}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {nextUp.exerciseCount} exercises · ~{nextUp.estMinutes} min
            </div>
            <div className="mt-3">
              <StartWorkoutButton
                templateId={nextUp.templateId}
                className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        ) : !hasProfile ? (
          <Link
            href="/profile"
            className="mr-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:bg-zinc-50"
          >
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                Set up your profile
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Your goal and schedule generate a weekly plan tailored to you.
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600">Start →</span>
          </Link>
        ) : null}
      </div>

      <div className="pt-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={streaming}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:border-blue-500/60 hover:text-zinc-900 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your coach…"
            className="grow rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
