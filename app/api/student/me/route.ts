import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// GET /api/student/me — current student + progress.
// getStudentSession runs the revoked-first check (plan §Session model detail):
// a revoked/invalid session or a Student deleted by admin Reset → null → 401.
export async function GET() {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const totalSteps = await prisma.step.count({ where: { courseId: 1 } });

  return NextResponse.json({
    name: auth.student.name,
    employeeId: auth.student.employeeId,
    aiTool: auth.student.aiTool,
    currentStepOrder: auth.student.currentStepOrder,
    totalSteps,
  });
}
