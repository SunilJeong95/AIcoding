import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// GET /api/admin/students/[id]/submissions — every step for the course, each
// paired with that student's uploaded photos (if any), ordered by step order.
// Powers the admin roster's "click a name to see their photos" view.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const prisma = getDb();
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다" }, { status: 404 });
  }

  const [steps, submissions] = await Promise.all([
    prisma.step.findMany({
      where: { courseId: 1 },
      orderBy: { order: "asc" },
      select: { id: true, order: true, topic: true, requiresUpload: true },
    }),
    prisma.submission.findMany({
      where: { studentId: id },
      select: { stepId: true, photoPaths: true, status: true },
    }),
  ]);

  const submissionByStepId = new Map(submissions.map((s) => [s.stepId, s]));

  return NextResponse.json({
    student: { id: student.id, name: student.name },
    steps: steps.map((s) => {
      const submission = submissionByStepId.get(s.id);
      return {
        stepId: s.id,
        order: s.order,
        topic: s.topic,
        requiresUpload: s.requiresUpload,
        photoPaths: submission?.photoPaths ?? [],
        uploaded: submission?.status === "uploaded",
      };
    }),
  });
}
