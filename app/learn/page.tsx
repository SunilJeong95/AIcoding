"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepViewer, { type StepData } from "@/components/StepViewer";

interface StepsResponse {
  currentStepOrder: number;
  totalSteps: number;
  currentStepSubmitted: boolean;
  step: StepData | null;
}

// Resolves once the image is decoded (or fails), so the spinner covers the
// image fetch too instead of the next screen popping content in piecemeal.
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export default function LearnPage() {
  const router = useRouter();
  const [data, setData] = useState<StepsResponse | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [meRes, stepsRes] = await Promise.all([
        fetch("/api/student/me"),
        fetch("/api/student/steps"),
      ]);
      if (meRes.status === 401 || stepsRes.status === 401) {
        router.replace("/login");
        return;
      }
      if (!stepsRes.ok) {
        setError("단계를 불러오지 못했습니다.");
        return;
      }
      const me = await meRes.json();
      const stepsJson: StepsResponse = await stepsRes.json();
      if (stepsJson.step?.imageContent) {
        await preloadImage(`/api/uploads/${stepsJson.step.imageContent}`);
      }
      setStudentName(me.name ?? "");
      setData(stepsJson);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function onLogout() {
    await fetch("/api/student/logout", { method: "POST" });
    router.replace("/login");
  }

  async function onAdvance() {
    const res = await fetch("/api/student/advance", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "다음 단계로 넘어가지 못했습니다.");
    }
    // Swap straight to a full loading screen and only reveal the next step
    // once it (and its image) has fully loaded — no growing list, no
    // partial reveal.
    setLoading(true);
    await load();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 text-sm text-ink-500">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" />
          불러오는 중...
        </span>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50">
        <p className="text-sm text-rose-700">{error}</p>
        <button
          onClick={load}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          다시 시도
        </button>
      </main>
    );
  }

  if (!data) return null;

  const { currentStepOrder, totalSteps, currentStepSubmitted, step } = data;
  // The course is fully done once the (capped) last step has been advanced
  // past via /api/student/advance — until then, currentStepOrder is always
  // the step awaiting attention (upload-then-next, or just next).
  const allDone =
    totalSteps > 0 && currentStepOrder >= totalSteps && currentStepSubmitted;
  const progressPct =
    totalSteps > 0 ? Math.min(100, Math.round((currentStepOrder / totalSteps) * 100)) : 0;

  return (
    <main className="min-h-screen bg-ink-50 pb-16">
      <div className="mx-auto max-w-3xl space-y-6 p-4 pt-6">
        <header className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink-900">
                실습 교육
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                {studentName ? `${studentName}님 · ` : ""}진행 {currentStepOrder}/
                {totalSteps}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
            >
              로그아웃
            </button>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

        {!allDone && step && (
          <StepViewer
            key={step.id}
            step={step}
            totalSteps={totalSteps}
            submitted={currentStepSubmitted}
            onUploaded={load}
            onAdvance={onAdvance}
          />
        )}

        {allDone && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 font-semibold text-emerald-800">
              모든 단계를 완료했습니다. 수고하셨습니다!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
