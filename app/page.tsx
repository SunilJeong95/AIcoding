import Link from "next/link";

// Landing scaffold — WU-4 will flesh this out. Provides the two entry points.
export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-950 p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 right-0 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-8 text-center">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-ink-300">
          AI 실습 교육 플랫폼
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          실습 교육
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-ink-400">
          단계별 실습을 따라가며 사진으로 진행 상황을 기록하세요.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-400 active:bg-brand-600"
          >
            학생 입장
          </Link>
          <Link
            href="/admin/login"
            className="rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            관리자 입장
          </Link>
        </div>
      </div>
    </main>
  );
}
