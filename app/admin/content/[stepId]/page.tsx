import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import StepEditor from "@/components/StepEditor";

export const dynamic = "force-dynamic";

export default async function StepEditorPage({
  params,
}: {
  params: Promise<{ stepId: string }>;
}) {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { stepId } = await params;
  const [step, totalSteps] = await Promise.all([
    prisma.step.findUnique({ where: { id: stepId } }),
    prisma.step.count({ where: { courseId: 1 } }),
  ]);
  if (!step) notFound();

  return (
    <div className="min-h-screen bg-ink-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/admin/content"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← 콘텐츠 목록
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
            {step.topic || `Step ${step.order}`} 편집
          </h1>
        </div>

        <div className="rounded-2xl border border-ink-200/70 bg-white p-6 shadow-soft">
          <StepEditor
            stepId={step.id}
            order={step.order}
            totalSteps={totalSteps}
            initialTopic={step.topic}
            initialText={step.textContent}
            initialRequiresUpload={step.requiresUpload}
          />
        </div>
      </main>
    </div>
  );
}
