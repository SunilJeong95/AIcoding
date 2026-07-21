import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import RosterTable from "@/components/RosterTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav name={admin.name} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <RosterTable />
      </main>
    </div>
  );
}
