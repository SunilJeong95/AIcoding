import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// GET /api/admin/students — roster ordered by createdAt. Progress is rendered
// as "n/total" (spec §5); total is the current step count.
export async function GET() {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const [totalSteps, students] = await Promise.all([
    prisma.step.count(),
    prisma.student.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    totalSteps,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      employeeId: s.employeeId,
      aiTool: s.aiTool,
      currentStepOrder: s.currentStepOrder,
      totalSteps,
      progress: `${Math.min(s.currentStepOrder, totalSteps)}/${totalSteps}`,
    })),
  });
}
