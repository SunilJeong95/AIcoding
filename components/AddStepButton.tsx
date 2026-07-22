"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddStepButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function add() {
    const topic = window.prompt("새 step의 주제를 입력하세요")?.trim();
    if (!topic) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, textContent: "" }),
      });
      if (!res.ok) {
        alert("주제 추가에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={add}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {busy ? "추가 중…" : "+ 주제 추가"}
    </button>
  );
}
