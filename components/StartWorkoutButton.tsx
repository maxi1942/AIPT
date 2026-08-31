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
        "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      }
    >
      {busy ? "Starting…" : label}
    </button>
  );
}
