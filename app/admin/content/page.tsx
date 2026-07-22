import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import DeleteStepButton from "@/components/DeleteStepButton";
import AddStepButton from "@/components/AddStepButton";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const steps = await prisma.step.findMany({
    where: { courseId: 1 },
    orderBy: { order: "asc" },
  });

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              교육 콘텐츠 관리
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              총 {steps.length}개의 주제가 등록되어 있습니다.
            </p>
          </div>
          <AddStepButton />
        </div>

        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <p className="text-sm text-ink-500">
              아직 등록된 주제가 없습니다. &quot;주제 추가&quot;로 시작하세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {steps.map((step) => {
              const preview = step.textContent.trim().slice(0, 60);
              return (
                <li
                  key={step.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-soft transition hover:border-ink-300"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                      {step.order}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">
                        {step.topic || `Step ${step.order}`}
                      </p>
                      <p className="truncate text-sm text-ink-500">
                        {preview || "(내용 없음)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/content/${step.id}`}
                      className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
                    >
                      편집
                    </Link>
                    <DeleteStepButton stepId={step.id} order={step.order} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
