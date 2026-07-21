import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// GET /api/student/steps — server-enforced sequential lock.
// Only steps with order <= student.currentStepOrder are returned, and locked
// later steps are NOT exposed at all (no text/image of future steps leaks).
export async function GET() {
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentStepOrder } = auth.student;

  const totalSteps = await prisma.step.count({ where: { courseId: 1 } });

  // Gate at the query level — future steps never leave the server.
  const steps = await prisma.step.findMany({
    where: { courseId: 1, order: { lte: currentStepOrder } },
    orderBy: { order: "asc" },
    select: { id: true, order: true, textContent: true, imageContent: true },
  });

  // The step at currentStepOrder normally has no submission (uploading advances
  // past it). The one exception is the last step, whose order caps — so this flag
  // is how the client knows the final step is complete (nothing left to upload).
  const currentStep = steps.find((s) => s.order === currentStepOrder);
  let currentStepSubmitted = false;
  if (currentStep) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: {
          studentId: auth.student.id,
          stepId: currentStep.id,
        },
      },
      select: { status: true },
    });
    currentStepSubmitted = submission?.status === "uploaded";
  }

  return NextResponse.json({
    currentStepOrder,
    totalSteps,
    currentStepSubmitted,
    steps,
  });
}
