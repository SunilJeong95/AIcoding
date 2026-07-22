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
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            참가 코드 관리
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            총 <span className="font-medium text-ink-700">{total}</span> / {MAX_CODES}개
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="count" className="text-xs font-medium text-ink-500">
              생성 수량
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={MAX_CODES}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
          <button
            onClick={generate}
            disabled={busy || atCap}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {busy ? "생성 중…" : "코드 생성"}
          </button>
        </div>
      </div>

      {atCap && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          최대 {MAX_CODES}개에 도달하여 더 이상 생성할 수 없습니다.
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100 text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">코드</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">이름</th>
                <th className="px-5 py-3">사번</th>
                <th className="px-5 py-3">AI 도구</th>
                <th className="px-5 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {codes.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-400">
                    생성된 코드가 없습니다.
                  </td>
                </tr>
              ) : (
                codes.map((c) => {
                  const inUse = c.status === "in-use";
                  return (
                    <tr key={c.id} className="transition hover:bg-ink-50/60">
                      <td className="px-5 py-3.5 font-mono font-medium tracking-wide text-ink-900">
                        {c.code}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            inUse
                              ? "bg-brand-50 text-brand-700"
                              : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              inUse ? "bg-brand-500" : "bg-ink-400"
                            }`}
                          />
                          {inUse ? "사용중" : "미사용"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">
                        {c.assignedStudentName ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">
                        {c.assignedEmployeeId ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">
                        {c.aiTool ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => reset(c.id, c.code)}
                          disabled={!inUse || resettingId === c.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {resettingId === c.id && (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                          )}
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
      </div>
    </section>
  );
}
