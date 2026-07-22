import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// POST /api/student/advance — move past the CURRENT step (server-derived from
// student.currentStepOrder, never client-supplied — same auth-bypass guard as
// /api/student/submit).
//
// Steps that require a photo (requiresUpload) can only be advanced once a
// prior /api/student/submit call recorded an "uploaded" Submission for this
// student+step. Steps that don't require a photo advance immediately, but
// still get an "uploaded" Submission row (photoPath: null) so downstream
// progress checks (currentStepSubmitted, the "all done" state on the last
// step) work the same way regardless of whether the step had a photo.
export async function POST() {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { student } = auth;

  const targetStep = await prisma.step.findFirst({
    where: { courseId: 1, order: student.currentStepOrder },
  });
  if (!targetStep) {
    return NextResponse.json(
      { error: "현재 단계를 찾을 수 없습니다." },
      { status: 400 },
    );
  }

  const totalSteps = await prisma.step.count({ where: { courseId: 1 } });
  const nextOrder = Math.min(student.currentStepOrder + 1, totalSteps);

  try {
    await prisma.$transaction(async (tx) => {
      if (targetStep.requiresUpload) {
        const submission = await tx.submission.findUnique({
          where: {
            studentId_stepId: { studentId: student.id, stepId: targetStep.id },
          },
        });
        if (!submission || submission.status !== "uploaded") {
          throw new Error("NOT_UPLOADED");
        }
      } else {
        await tx.submission.upsert({
          where: {
            studentId_stepId: { studentId: student.id, stepId: targetStep.id },
          },
          create: {
            studentId: student.id,
            stepId: targetStep.id,
            photoPath: null,
            status: "uploaded",
          },
          update: { status: "uploaded", uploadedAt: new Date() },
        });
      }
      if (nextOrder !== student.currentStepOrder) {
        await tx.student.update({
          where: { id: student.id },
          data: { currentStepOrder: nextOrder },
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_UPLOADED") {
      return NextResponse.json(
        { error: "사진을 먼저 업로드하세요." },
        { status: 400 },
      );
    }
    throw e;
  }

  return NextResponse.json({
    ok: true,
    currentStepOrder: nextOrder,
    totalSteps,
    completed: nextOrder === totalSteps,
  });
}
