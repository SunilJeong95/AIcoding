"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LockBanner from "@/components/LockBanner";
import StepViewer from "@/components/StepViewer";

const HEARTBEAT_MS = 30 * 1000;

type LockState =
  | { phase: "acquiring" }
  | { phase: "editing" }
  | { phase: "readonly"; ownerName: string };

export default function StepEditor({
  stepId,
  order,
  totalSteps,
  initialTopic,
  initialText,
  initialRequiresUpload,
}: {
  stepId: string;
  order: number;
  totalSteps: number;
  initialTopic: string;
  initialText: string;
  initialRequiresUpload: boolean;
}) {
  const router = useRouter();
  const [lock, setLock] = useState<LockState>({ phase: "acquiring" });
  const [topic, setTopic] = useState(initialTopic);
  const [text, setText] = useState(initialText);
  const [requiresUpload, setRequiresUpload] = useState(initialRequiresUpload);
  const [saving, setSaving] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Tracks whether we currently own the lock, so cleanup can release it.
  const ownsLock = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ topic, textContent: text, requiresUpload }),
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

  // Wraps the current textarea selection with markdown syntax (bold/italic),
  // or inserts at the cursor if nothing is selected.
  function wrapSelection(mark: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart) + mark + selected + mark + value.slice(selectionEnd);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selectionStart + mark.length, selectionEnd + mark.length);
    });
  }

  // Prefixes the current line with "## " (markdown heading).
  function insertHeading() {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart, value } = ta;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const next = value.slice(0, lineStart) + "## " + value.slice(lineStart);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selectionStart + 3, selectionStart + 3);
    });
  }

  // Uploads an image and inserts markdown image syntax at the cursor.
  async function insertInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setInsertingImage(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`/api/admin/steps/${stepId}/inline-image`, {
        method: "POST",
        body: form,
      });
      if (res.status === 403) {
        setStatus("편집 권한이 만료되었습니다. 페이지를 새로고침하세요.");
        return;
      }
      if (!res.ok) {
        setStatus("이미지 삽입에 실패했습니다.");
        return;
      }
      const data = await res.json();
      const ta = textareaRef.current;
      const pos = ta ? ta.selectionStart : text.length;
      const markdown = `\n![](/api/uploads/${data.path})\n`;
      setText(text.slice(0, pos) + markdown + text.slice(pos));
    } finally {
      setInsertingImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
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
        주제
      </label>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        readOnly={readOnly}
        maxLength={200}
        className="mb-6 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 read-only:bg-ink-50 read-only:text-ink-500"
        placeholder="이 step의 주제를 입력하세요."
      />

      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-ink-700">
          본문 내용
        </label>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => wrapSelection("**")}
              title="굵게"
              className="rounded-md px-2.5 py-1 text-sm font-bold text-ink-600 transition hover:bg-ink-100"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("*")}
              title="기울임"
              className="rounded-md px-2.5 py-1 text-sm italic text-ink-600 transition hover:bg-ink-100"
            >
              I
            </button>
            <button
              type="button"
              onClick={insertHeading}
              title="제목"
              className="rounded-md px-2.5 py-1 text-sm font-semibold text-ink-600 transition hover:bg-ink-100"
            >
              H
            </button>
            <span className="mx-1 h-4 w-px bg-ink-200" />
            <button
              type="button"
              onClick={() => inlineImageInputRef.current?.click()}
              disabled={insertingImage}
              title="이미지 삽입"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm text-ink-600 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {insertingImage ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-ink-600" />
              ) : (
                "🖼"
              )}
              이미지
            </button>
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/*"
              onChange={insertInlineImage}
              className="hidden"
            />
          </div>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={readOnly}
        rows={16}
        className="w-full rounded-xl border border-ink-200 p-3.5 font-mono text-sm text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 read-only:bg-ink-50 read-only:text-ink-500"
        placeholder="이 step의 실습 안내 내용을 입력하세요. **굵게**, *기울임*, 이미지 삽입을 지원합니다."
      />
      <p className="mt-1.5 text-xs text-ink-400">
        마크다운 문법을 지원합니다 — 이미지 버튼으로 본문 중간에 이미지를 삽입할 수 있습니다.
      </p>

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
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-ink-50 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200/70 bg-white px-5 py-3.5">
              <span className="text-sm font-semibold text-ink-500">
                학생 화면 미리보기 — 실제 /learn 화면과 동일한 컴포넌트입니다
              </span>
              <button
                onClick={() => setShowPreview(false)}
                aria-label="미리보기 닫기"
                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 pt-6">
              <StepViewer
                step={{ id: stepId, order, topic, textContent: text, requiresUpload }}
                totalSteps={totalSteps}
                isCurrent
                submitted={false}
                onUploaded={() => {}}
                onAdvance={async () => {}}
                previewOnly
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
