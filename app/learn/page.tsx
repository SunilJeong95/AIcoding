"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepViewer, { type StepData } from "@/components/StepViewer";

interface StepsResponse {
  currentStepOrder: number;
  totalSteps: number;
  currentStepSubmitted: boolean;
  steps: StepData[];
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
      setStudentName(me.name ?? "");
      setData(await stepsRes.json());
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        불러오는 중...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={load}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          다시 시도
        </button>
      </main>
    );
  }

  if (!data) return null;

  const { currentStepOrder, totalSteps, currentStepSubmitted, steps } = data;
  // The step at currentStepOrder awaits upload unless it's the capped final step
  // that has already been submitted.
  const awaitingOrder = currentStepSubmitted ? null : currentStepOrder;
  const allDone =
    totalSteps > 0 &&
    currentStepOrder >= totalSteps &&
    currentStepSubmitted;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">실습 교육</h1>
            <p className="text-sm text-gray-500">
              {studentName ? `${studentName}님` : ""} · 진행 {currentStepOrder}/
              {totalSteps}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            로그아웃
          </button>
        </header>

        <div className="space-y-4">
          {steps.map((step) => (
            <StepViewer
              key={step.id}
              step={step}
              totalSteps={totalSteps}
              awaitingUpload={step.order === awaitingOrder}
              onUploaded={load}
            />
          ))}
        </div>

        {allDone && (
          <p className="rounded-xl bg-green-50 p-4 text-center font-medium text-green-700">
            모든 단계를 완료했습니다. 수고하셨습니다!
          </p>
        )}
      </div>
    </main>
  );
}
