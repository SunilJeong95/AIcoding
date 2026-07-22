"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteStepButton({
  stepId,
  order,
}: {
  stepId: string;
  order: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Step ${order}을(를) 삭제하시겠습니까?`)) return;
    setBusy(true);
    try {
      // DELETE requires holding the lock — acquire it first so we don't stomp
      // on an admin who is currently editing this step.
      const lockRes = await fetch(`/api/admin/steps/${stepId}/lock`, {
        method: "POST",
      });
      const lock = await lockRes.json();
      if (!lock.acquired) {
        alert(`${lock.ownerName}님이 편집 중이라 삭제할 수 없습니다.`);
        return;
      }

      const res = await fetch(`/api/admin/steps/${stepId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("삭제에 실패했습니다.");
        // best-effort release so the lock doesn't linger
        await fetch(`/api/admin/steps/${stepId}/lock/release`, { method: "POST" });
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-lg border border-rose-200 px-3.5 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "삭제 중…" : "삭제"}
    </button>
  );
}
