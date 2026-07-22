"use client";

import { useCallback, useEffect, useState } from "react";

interface RosterRow {
  id: string;
  name: string;
  employeeId: string;
  aiTool: string;
  currentStepOrder: number;
  totalSteps: number;
  progress: string;
}

export default function RosterTable() {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "목록을 불러오지 못했습니다");
        return;
      }
      setRows(data.students ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            학생 현황
          </h1>
          <p className="mt-1 text-sm text-ink-500">총 {rows.length}명 입장</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-ink-600" />
          )}
          {loading ? "새로고침 중…" : "새로고침"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100 text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">이름</th>
                <th className="px-5 py-3">사번</th>
                <th className="px-5 py-3">AI 도구</th>
                <th className="px-5 py-3">진행 단계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center text-sm text-ink-400">
                    아직 입장한 학생이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-ink-50/60">
                    <td className="px-5 py-3.5 font-medium text-ink-900">
                      {r.name}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{r.employeeId}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
                        {r.aiTool}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-700">
                      {r.progress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
