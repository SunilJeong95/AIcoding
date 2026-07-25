"use client";

import { useEffect, useState } from "react";
import Lightbox from "./Lightbox";

interface StepSubmission {
  stepId: string;
  order: number;
  topic: string;
  requiresUpload: boolean;
  photoPaths: string[];
  uploaded: boolean;
}

interface StudentSubmissionsModalProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

// Admin-only: click a student's name in the roster to see, per step, what
// photos (if any) they uploaded — with a click-to-enlarge lightbox.
export default function StudentSubmissionsModal({
  studentId,
  studentName,
  onClose,
}: StudentSubmissionsModalProps) {
  const [steps, setSteps] = useState<StepSubmission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/students/${studentId}/submissions`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "불러오지 못했습니다");
          return;
        }
        setSteps(data.steps);
      } catch {
        if (!cancelled) setError("네트워크 오류가 발생했습니다");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">{studentName}님 제출 사진</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg px-2 py-1 text-ink-500 transition hover:bg-ink-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
        )}
        {!steps && !error && (
          <p className="py-8 text-center text-sm text-ink-400">불러오는 중...</p>
        )}

        {steps && (
          <div className="space-y-5">
            {steps.map((s) => (
              <div key={s.stepId}>
                <p className="mb-2 text-sm font-semibold text-ink-800">
                  {s.order}. {s.topic || `Step ${s.order}`}
                  {!s.requiresUpload && (
                    <span className="ml-2 text-xs font-normal text-ink-400">
                      (업로드 불필요)
                    </span>
                  )}
                </p>
                {s.photoPaths.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {s.photoPaths.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setLightboxSrc(`/api/uploads/${p}`)}
                        className="block aspect-square overflow-hidden rounded-lg border border-ink-200 bg-ink-50"
                      >
                        <img src={`/api/uploads/${p}`} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  s.requiresUpload && (
                    <p className="text-xs text-ink-400">아직 업로드한 사진이 없습니다.</p>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
