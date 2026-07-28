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
// still get an "uploaded" Submission row (empty photoPaths) so downstream
// progress checks (currentStepSubmitted) work the same way regardless of
// whether the step had a photo.
//
// completedAt is the explicit "finished" signal, set only when this endpoint
// is called FROM the real last step — see the nextOrder comment below for how
// currentStepOrder itself represents that same event.
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
  const isLastStep = targetStep.order === totalSteps;
  // Not capped at totalSteps: advancing past the real last step moves
  // currentStepOrder to totalSteps + 1, a virtual "step" with no backing Step
  // row. /api/student/steps then returns step: null for it, which the client
  // renders as the congrats screen — so all the existing order-based
  // 이전/다음 navigation works for it unchanged instead of needing special
  // history/query-param handling.
  const nextOrder = student.currentStepOrder + 1;

  // D1 has no transaction support — sequential statements. Scoped to the
  // student's own row; worst case is a rare double-advance from a
  // double-click, which the client already guards against.
  if (targetStep.requiresUpload) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: { studentId: student.id, stepId: targetStep.id },
      },
    });
    if (!submission || submission.status !== "uploaded") {
      return NextResponse.json(
        { error: "사진을 먼저 업로드하세요." },
        { status: 400 },
      );
    }
  } else {
    await prisma.submission.upsert({
      where: {
        studentId_stepId: { studentId: student.id, stepId: targetStep.id },
      },
      create: {
        studentId: student.id,
        stepId: targetStep.id,
        status: "uploaded",
      },
      update: { status: "uploaded", uploadedAt: new Date() },
    });
  }
  const studentUpdate: { currentStepOrder?: number; completedAt?: Date } = {};
  if (nextOrder !== student.currentStepOrder) {
    studentUpdate.currentStepOrder = nextOrder;
  }
  if (isLastStep) {
    studentUpdate.completedAt = new Date();
  }
  if (Object.keys(studentUpdate).length > 0) {
    await prisma.student.update({
      where: { id: student.id },
      data: studentUpdate,
    });
  }

  return NextResponse.json({
    ok: true,
    currentStepOrder: nextOrder,
    totalSteps,
    completed: isLastStep,
  });
}
