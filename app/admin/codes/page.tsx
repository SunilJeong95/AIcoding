import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import CodeManager from "@/components/CodeManager";

export const dynamic = "force-dynamic";

export default async function AdminCodesPage() {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <CodeManager />
      </main>
    </div>
  );
}
