import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import DeleteStepButton from "@/components/DeleteStepButton";
import AddStepButton from "@/components/AddStepButton";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const steps = await prisma.step.findMany({
    where: { courseId: 1 },
    orderBy: { order: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">교육 콘텐츠 관리</h1>
        <AddStepButton />
      </div>

      {steps.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
          아직 등록된 step이 없습니다. &quot;step 추가&quot;로 시작하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {steps.map((step) => {
            const preview = step.textContent.trim().slice(0, 60);
            return (
              <li
                key={step.id}
                className="flex items-center justify-between rounded-md border border-gray-200 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">Step {step.order}</p>
                  <p className="truncate text-sm text-gray-500">
                    {preview || "(내용 없음)"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/content/${step.id}`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
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
