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

  const [totalSteps, students, steps] = await Promise.all([
    prisma.step.count(),
    prisma.student.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.step.findMany({
      where: { courseId: 1 },
      select: { order: true, topic: true },
    }),
  ]);
  const topicByOrder = new Map(steps.map((s) => [s.order, s.topic]));

  return NextResponse.json({
    totalSteps,
    students: students.map((s) => {
      const cappedOrder = Math.min(s.currentStepOrder, totalSteps);
      return {
        id: s.id,
        name: s.name,
        employeeId: s.employeeId,
        aiTool: s.aiTool,
        currentStepOrder: s.currentStepOrder,
        currentStepTopic: topicByOrder.get(cappedOrder) || null,
        totalSteps,
        progress: `${cappedOrder}/${totalSteps}`,
      };
    }),
  });
}
