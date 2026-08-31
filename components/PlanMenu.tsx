"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CHIPS = [
  "3 days this week",
  "Upper body focus",
  "Go heavier",
  "Work around a sore shoulder",
];

/**
 * The "…" menu on the Plan tab: Smart Modify (a bottom sheet that hands the
 * request to the Coach), manage workouts, edit profile.
 */
export default function PlanMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sheet) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  function submit(value?: string) {
    const ask = (value ?? text).trim();
    if (!ask) return;
    setSheet(false);
    router.push(`/?ask=${encodeURIComponent(ask)}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:bg-zinc-50"
        aria-label="Plan options"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                setSheet(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            >
              <span aria-hidden>✨</span> Smart Modify
            </button>
            <Link
              href="/templates"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              <span aria-hidden>🗂</span> Manage workouts
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              <span aria-hidden>⚙️</span> Edit profile
            </Link>
          </div>
        </>
      )}

      {mounted &&
        sheet &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setSheet(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Modify training schedule"
          >
            <div
              className="w-full max-w-lg rounded-t-2xl bg-white p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
              <h2 className="text-lg font-semibold">
                Modify training schedule
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Tell your coach what to change — it will suggest an updated
                week.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="e.g. I can only train Tuesday and Thursday this week…"
                className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => submit(chip)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 transition hover:border-blue-500/60 hover:text-zinc-900"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <button
                onClick={() => submit()}
                disabled={!text.trim()}
                className="mt-4 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                Ask my coach
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
