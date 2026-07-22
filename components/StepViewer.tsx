"use client";

import PhotoUpload from "./PhotoUpload";

export interface StepData {
  id: string;
  order: number;
  textContent: string;
  imageContent: string | null;
}

interface StepViewerProps {
  step: StepData;
  totalSteps: number;
  // True only for the single step currently awaiting a photo upload. When false,
  // the step is already completed and shown read-only.
  awaitingUpload: boolean;
  onUploaded: () => void;
}

export default function StepViewer({
  step,
  totalSteps,
  awaitingUpload,
  onUploaded,
}: StepViewerProps) {
  return (
    <section
      className={`rounded-2xl border bg-white p-6 shadow-soft transition ${
        awaitingUpload ? "border-brand-300 ring-1 ring-brand-500/15" : "border-ink-200/70"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-ink-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
            {step.order}
          </span>
          Step {step.order}
          <span className="text-sm font-normal text-ink-400">/ {totalSteps}</span>
        </h2>
        {!awaitingUpload ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            ✓ 완료
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            진행중
          </span>
        )}
      </div>

      {step.textContent && (
        <p className="mb-4 whitespace-pre-wrap leading-relaxed text-ink-700">
          {step.textContent}
        </p>
      )}

      {step.imageContent && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${step.imageContent}`}
          alt={`Step ${step.order} 참고 이미지`}
          className="mb-4 max-w-full rounded-xl border border-ink-200"
        />
      )}

      {awaitingUpload && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          <PhotoUpload stepId={step.id} onUploaded={onUploaded} />
        </div>
      )}
    </section>
  );
}
