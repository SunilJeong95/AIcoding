"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddStepButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: "" }),
      });
      if (!res.ok) {
        alert("step 추가에 실패했습니다.");
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
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "추가 중…" : "+ step 추가"}
    </button>
  );
}
