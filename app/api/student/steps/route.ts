import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// GET /api/student/steps — server-enforced sequential lock.
// Only steps with order <= student.currentStepOrder are returned, and locked
// later steps are NOT exposed at all (no text/image of future steps leaks).
export async function GET() {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentStepOrder } = auth.student;

  // Gate at the query level — future steps never leave the server.
  const [totalSteps, steps] = await Promise.all([
    prisma.step.count({ where: { courseId: 1 } }),
    prisma.step.findMany({
      where: { courseId: 1, order: { lte: currentStepOrder } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        textContent: true,
        imageContent: true,
        requiresUpload: true,
      },
    }),
  ]);

  // Whether the step at currentStepOrder has an "uploaded" Submission yet —
  // for requiresUpload steps this gates the "다음" button; for the last step
  // it's also how the client knows the course is fully complete (see
  // /api/student/advance, which upserts a Submission even for no-upload steps).
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
