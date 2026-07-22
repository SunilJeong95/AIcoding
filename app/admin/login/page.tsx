"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-ink-500 hover:text-ink-300"
          >
            ← 홈으로
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full space-y-5 rounded-3xl border border-white/10 bg-ink-900 p-8 shadow-card"
        >
          <div>
            <span className="inline-flex rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300">
              ADMIN
            </span>
            <h1 className="mt-3 text-2xl font-bold text-white">관리자 로그인</h1>
            <p className="mt-1 text-sm text-ink-400">
              관리자 코드와 이름을 입력하세요.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-ink-300">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-white placeholder:text-ink-500 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
              placeholder="홍길동"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium text-ink-300">
              관리자 코드
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-white placeholder:text-ink-500 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
              placeholder="관리자 코드"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white shadow-pop transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
