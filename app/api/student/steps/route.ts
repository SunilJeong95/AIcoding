import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

// GET /api/student/steps — server-enforced sequential lock.
// Only the single step at student.currentStepOrder is returned — earlier and
// later steps are NOT exposed at all (no text/image of any other step leaks,
// and the client renders one step at a time instead of an ever-growing list).
export async function GET() {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentStepOrder } = auth.student;

  // Gate at the query level — every other step never leaves the server.
  const [totalSteps, step] = await Promise.all([
    prisma.step.count({ where: { courseId: 1 } }),
    prisma.step.findFirst({
      where: { courseId: 1, order: currentStepOrder },
      select: {
        id: true,
        order: true,
        topic: true,
        textContent: true,
        imageContent: true,
        requiresUpload: true,
      },
    }),
  ]);

  // Whether the current step has an "uploaded" Submission yet — for
  // requiresUpload steps this gates the "다음" button; for the last step
  // it's also how the client knows the course is fully complete (see
  // /api/student/advance, which upserts a Submission even for no-upload steps).
  let currentStepSubmitted = false;
  if (step) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: {
          studentId: auth.student.id,
          stepId: step.id,
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
    step,
  });
}
