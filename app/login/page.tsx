"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AI_TOOLS = ["Cursor", "GitHub Copilot", "Claude", "Codex"] as const;

export default function StudentLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [aiTool, setAiTool] = useState<string>(AI_TOOLS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, employeeId, aiTool, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.push("/learn");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-ink-400 hover:text-ink-600"
          >
            ← 홈으로
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full space-y-5 rounded-3xl border border-ink-200/70 bg-white p-8 shadow-card"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              실습 교육 입장
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              발급받은 참가 코드로 입장하세요.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-ink-700">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="employeeId" className="block text-sm font-medium text-ink-700">
              사번
            </label>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="aiTool" className="block text-sm font-medium text-ink-700">
              사용 AI 도구
            </label>
            <select
              id="aiTool"
              value={aiTool}
              onChange={(e) => setAiTool(e.target.value)}
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            >
              {AI_TOOLS.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="code" className="block text-sm font-medium text-ink-700">
              참가 코드
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoCapitalize="characters"
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 font-mono tracking-wide text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? "입장 중..." : "입장하기"}
          </button>
        </form>
      </div>
    </main>
  );
}
