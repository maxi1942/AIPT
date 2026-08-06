"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteTemplateButton({
  templateId,
}: {
  templateId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this workout design? Past sessions are kept.")) return;
    setBusy(true);
    await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
