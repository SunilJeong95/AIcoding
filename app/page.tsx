import Link from "next/link";

// Landing scaffold — WU-4 will flesh this out. Provides the two entry points.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">실습 교육</h1>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          학생 입장
        </Link>
        <Link
          href="/admin/login"
          className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50"
        >
          관리자 입장
        </Link>
      </div>
    </main>
  );
}
