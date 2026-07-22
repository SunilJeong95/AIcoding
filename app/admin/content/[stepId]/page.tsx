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
  const step = await prisma.step.findUnique({ where: { id: stepId } });
  if (!step) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link href="/admin/content" className="text-sm text-blue-600 hover:underline">
          ← 콘텐츠 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Step {step.order} 편집</h1>
      </div>

      <StepEditor
        stepId={step.id}
        order={step.order}
        initialText={step.textContent}
        initialImage={step.imageContent}
      />
      </main>
    </div>
  );
}
