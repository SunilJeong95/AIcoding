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
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Step {step.order}
          <span className="ml-2 text-sm font-normal text-gray-500">
            / {totalSteps}
          </span>
        </h2>
        {!awaitingUpload && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            완료
          </span>
        )}
      </div>

      {step.textContent && (
        <p className="mb-4 whitespace-pre-wrap leading-relaxed text-gray-800">
          {step.textContent}
        </p>
      )}

      {step.imageContent && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${step.imageContent}`}
          alt={`Step ${step.order} 참고 이미지`}
          className="mb-4 max-w-full rounded-lg border border-gray-200"
        />
      )}

      {awaitingUpload && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <PhotoUpload stepId={step.id} onUploaded={onUploaded} />
        </div>
      )}
    </section>
  );
}
