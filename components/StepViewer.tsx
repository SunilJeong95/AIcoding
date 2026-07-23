"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import PhotoUpload from "./PhotoUpload";

export interface StepData {
  id: string;
  order: number;
  topic: string;
  textContent: string;
  imageContent: string | null;
  requiresUpload: boolean;
}

interface StepViewerProps {
  step: StepData;
  totalSteps: number;
  // Whether the current step already has an "uploaded" Submission — gates the
  // "다음" button for requiresUpload steps. Ignored otherwise.
  submitted: boolean;
  onUploaded: () => void;
  onAdvance: () => Promise<void>;
}

export default function StepViewer({
  step,
  totalSteps,
  submitted,
  onUploaded,
  onAdvance,
}: StepViewerProps) {
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdvance() {
    setError(null);
    setAdvancing(true);
    try {
      await onAdvance();
    } catch (e) {
      setError(e instanceof Error ? e.message : "다음 단계로 넘어가지 못했습니다.");
    } finally {
      setAdvancing(false);
    }
  }

  const nextEnabled = step.requiresUpload ? submitted : true;

  return (
    <section className="rounded-2xl border border-brand-300 bg-white p-6 shadow-soft ring-1 ring-brand-500/15 transition">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-lg font-bold text-ink-900">
          <span className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold tabular-nums text-brand-700">
            {step.order}/{totalSteps}
          </span>
          <span className="truncate">{step.topic || `Step ${step.order}`}</span>
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          진행중
        </span>
      </div>

      {step.textContent && (
        <div className="prose mb-4 max-w-none text-ink-700 prose-headings:text-ink-900 prose-headings:font-bold prose-a:text-brand-600 prose-strong:text-ink-900 prose-img:rounded-xl prose-img:border prose-img:border-ink-200">
          <ReactMarkdown>{step.textContent}</ReactMarkdown>
        </div>
      )}

      {step.imageContent && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${step.imageContent}`}
          alt={`Step ${step.order} 참고 이미지`}
          className="mb-4 max-w-full rounded-xl border border-ink-200"
        />
      )}

      <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
        {step.requiresUpload && (
          <PhotoUpload stepId={step.id} onUploaded={onUploaded} />
        )}
        <button
          type="button"
          onClick={handleAdvance}
          disabled={!nextEnabled || advancing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {advancing && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          다음
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </section>
  );
}
