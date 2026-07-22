"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LockBanner from "@/components/LockBanner";

const HEARTBEAT_MS = 30 * 1000;

type LockState =
  | { phase: "acquiring" }
  | { phase: "editing" }
  | { phase: "readonly"; ownerName: string };

export default function StepEditor({
  stepId,
  order,
  initialText,
  initialImage,
}: {
  stepId: string;
  order: number;
  initialText: string;
  initialImage: string | null;
}) {
  const router = useRouter();
  const [lock, setLock] = useState<LockState>({ phase: "acquiring" });
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<string | null>(initialImage);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Tracks whether we currently own the lock, so cleanup can release it.
  const ownsLock = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      try {
        const res = await fetch(`/api/admin/steps/${stepId}/lock`, {
          method: "POST",
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.acquired) {
          ownsLock.current = true;
          setLock({ phase: "editing" });
        } else {
          setLock({ phase: "readonly", ownerName: data.ownerName ?? "다른 관리자" });
        }
      } catch {
        if (!cancelled) {
          setLock({ phase: "readonly", ownerName: "알 수 없음" });
        }
      }
    }

    acquire();

    // Release the lock synchronously if the tab/window is closed.
    function onBeforeUnload() {
      if (ownsLock.current && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/admin/steps/${stepId}/lock/release`);
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Release on unmount (client-side navigation away from the editor).
      if (ownsLock.current) {
        ownsLock.current = false;
        fetch(`/api/admin/steps/${stepId}/lock/release`, {
          method: "POST",
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [stepId]);

  // Heartbeat every 30s while we hold the lock.
  useEffect(() => {
    if (lock.phase !== "editing") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/steps/${stepId}/lock/heartbeat`, {
          method: "POST",
        });
        const data = await res.json();
        if (!data.ok) {
          // Lost the lock (went stale and someone took over). Drop to read-only.
          ownsLock.current = false;
          setLock({ phase: "readonly", ownerName: "다른 관리자" });
        }
      } catch {
        // transient — keep trying on the next tick
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [lock.phase, stepId]);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/steps/${stepId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: text }),
      });
      if (res.status === 403) {
        setStatus("편집 권한이 만료되었습니다. 페이지를 새로고침하세요.");
        ownsLock.current = false;
        setLock({ phase: "readonly", ownerName: "다른 관리자" });
        return;
      }
      if (!res.ok) {
        setStatus("저장에 실패했습니다.");
        return;
      }
      setStatus("저장되었습니다.");
      // Release on save success, then return to the list.
      if (ownsLock.current) {
        ownsLock.current = false;
        await fetch(`/api/admin/steps/${stepId}/lock/release`, { method: "POST" });
      }
      router.push("/admin/content");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`/api/admin/steps/${stepId}/image`, {
      method: "POST",
      body: form,
    });
    if (res.status === 403) {
      setStatus("편집 권한이 만료되었습니다. 페이지를 새로고침하세요.");
      return;
    }
    if (!res.ok) {
      setStatus("이미지 업로드에 실패했습니다.");
      return;
    }
    const data = await res.json();
    setImage(data.imageContent);
    setStatus("이미지가 업로드되었습니다.");
  }

  if (lock.phase === "acquiring") {
    return <p className="text-sm text-ink-500">편집 권한을 확인하는 중…</p>;
  }

  const readOnly = lock.phase === "readonly";

  return (
    <div>
      {readOnly && <LockBanner ownerName={lock.ownerName} />}

      <label className="mb-2 block text-sm font-medium text-ink-700">
        본문 내용
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={readOnly}
        rows={12}
        className="w-full rounded-xl border border-ink-200 p-3.5 font-mono text-sm text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 read-only:bg-ink-50 read-only:text-ink-500"
        placeholder="이 step의 실습 안내 내용을 입력하세요."
      />

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-ink-700">
          삽화 이미지
        </label>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${image}`}
            alt={`Step ${order} 삽화`}
            className="mb-3 max-h-64 rounded-xl border border-ink-200"
          />
        ) : (
          <p className="mb-3 text-sm text-ink-400">등록된 이미지가 없습니다.</p>
        )}
        {!readOnly && (
          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            className="block text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          />
        )}
      </div>

      {status && <p className="mt-4 text-sm text-ink-600">{status}</p>}

      {!readOnly && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      )}
    </div>
  );
}
