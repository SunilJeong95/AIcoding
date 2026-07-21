"use client";

import { useCallback, useEffect, useState } from "react";

interface CodeRow {
  id: string;
  code: string;
  status: string;
  assignedStudentName: string | null;
  assignedEmployeeId: string | null;
  aiTool: string | null;
  issuedAt: string;
  usedAt: string | null;
}

const MAX_CODES = 100;

export default function CodeManager() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/codes");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "코드 목록을 불러오지 못했습니다");
        return;
      }
      setCodes(data.codes ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "코드 생성에 실패했습니다");
        return;
      }
      setNotice(
        data.capped
          ? `${data.createdCount}개만 생성되었습니다 (최대 ${MAX_CODES}개 제한).`
          : `${data.createdCount}개의 코드를 생성했습니다.`,
      );
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function reset(id: string, code: string) {
    if (
      !window.confirm(
        `코드 ${code}를 초기화하면 사용 중인 학생이 강제 로그아웃되고 코드가 재사용 가능해집니다. 계속하시겠습니까?`,
      )
    ) {
      return;
    }
    setResettingId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/codes/${id}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "초기화에 실패했습니다");
        return;
      }
      setNotice(`코드 ${code}를 초기화했습니다.`);
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setResettingId(null);
    }
  }

  const atCap = total >= MAX_CODES;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">참가 코드 관리</h2>
          <p className="text-sm text-gray-500">
            총 {total} / {MAX_CODES}개
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="count" className="text-xs font-medium text-gray-600">
              생성 수량
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={MAX_CODES}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={generate}
            disabled={busy || atCap}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "생성 중…" : "코드 생성"}
          </button>
        </div>
      </div>

      {atCap && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          최대 {MAX_CODES}개에 도달하여 더 이상 생성할 수 없습니다.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">코드</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">사번</th>
              <th className="px-4 py-3">AI 도구</th>
              <th className="px-4 py-3 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {codes.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  생성된 코드가 없습니다.
                </td>
              </tr>
            ) : (
              codes.map((c) => {
                const inUse = c.status === "in-use";
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {c.code}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          inUse
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {inUse ? "사용중" : "미사용"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.assignedStudentName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.assignedEmployeeId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.aiTool ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => reset(c.id, c.code)}
                        disabled={!inUse || resettingId === c.id}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {resettingId === c.id ? "초기화 중…" : "Reset"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
