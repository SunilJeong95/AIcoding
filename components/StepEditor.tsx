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
  initialRequiresUpload,
}: {
  stepId: string;
  order: number;
  initialText: string;
  initialImage: string | null;
  initialRequiresUpload: boolean;
}) {
  const router = useRouter();
  const [lock, setLock] = useState<LockState>({ phase: "acquiring" });
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<string | null>(initialImage);
  const [requiresUpload, setRequiresUpload] = useState(initialRequiresUpload);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  // Close the preview popup on Escape.
  useEffect(() => {
    if (!showPreview) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPreview(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPreview]);

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
        body: JSON.stringify({ textContent: text, requiresUpload }),
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
    setUploadingImage(true);
    try {
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
    } finally {
      setUploadingImage(false);
    }
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
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              onChange={uploadImage}
              className="block text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {uploadingImage && (
              <span className="flex items-center gap-1.5 text-sm text-ink-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-ink-600" />
                업로드 중…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="flex items-center gap-2.5 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={requiresUpload}
            disabled={readOnly}
            onChange={(e) => setRequiresUpload(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed"
          />
          이 step은 실습 사진 업로드가 필요합니다
        </label>
        <p className="mt-1.5 pl-6 text-xs text-ink-400">
          체크를 해제하면 학생은 사진 업로드 없이 &quot;다음&quot; 버튼만으로 이 step을 통과합니다.
        </p>
      </div>

      {status && <p className="mt-4 text-sm text-ink-600">{status}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setShowPreview(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-5 py-2.5 font-medium text-ink-700 transition hover:bg-ink-50"
        >
          미리보기
        </button>
        {!readOnly && (
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {saving ? "저장 중…" : "저장"}
          </button>
        )}
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3.5">
              <span className="text-sm font-semibold text-ink-500">
                학생 화면 미리보기
              </span>
              <button
                onClick={() => setShowPreview(false)}
                aria-label="미리보기 닫기"
                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-ink-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                  {order}
                </span>
                Step {order}
              </h2>
              {text ? (
                <p className="mb-4 whitespace-pre-wrap leading-relaxed text-ink-700">
                  {text}
                </p>
              ) : (
                <p className="mb-4 text-sm text-ink-400">(내용 없음)</p>
              )}
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/uploads/${image}`}
                  alt={`Step ${order} 삽화`}
                  className="mb-4 max-w-full rounded-xl border border-ink-200"
                />
              )}
              <div className="border-t border-ink-100 pt-4">
                {requiresUpload ? (
                  <div className="rounded-xl border border-dashed border-ink-300 py-3.5 text-center text-sm text-ink-400">
                    사진 업로드 버튼이 여기에 표시됩니다
                  </div>
                ) : (
                  <div className="rounded-lg bg-brand-600 py-3 text-center text-sm font-semibold text-white">
                    다음
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
