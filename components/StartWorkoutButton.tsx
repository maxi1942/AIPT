"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartWorkoutButton({
  templateId,
  label = "Start workout",
  className = "",
}: {
  templateId?: number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateId ? { template_id: templateId } : {}),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const session = await res.json();
      router.push(`/workout/${session.id}`);
    } catch {
      setBusy(false);
      alert("Could not start the workout. Please try again.");
    }
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className={
        className ||
        "rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
      }
    >
      {busy ? "Starting…" : label}
    </button>
  );
}
