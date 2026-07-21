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
          <h2 className="text-lg font-semibold text-gray-900">학생 현황</h2>
          <p className="text-sm text-gray-500">총 {rows.length}명</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "새로고침 중…" : "새로고침"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">사번</th>
              <th className="px-4 py-3">AI 도구</th>
              <th className="px-4 py-3">진행 단계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  아직 입장한 학생이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.employeeId}</td>
                  <td className="px-4 py-3 text-gray-700">{r.aiTool}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">
                    {r.progress}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
