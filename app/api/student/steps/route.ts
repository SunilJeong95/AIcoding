import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { contentToolKeyFor, type TextContentByTool } from "@/lib/validation";
import { parsePhotoPaths } from "@/lib/photoPaths";

const NOT_AUTHORED_TEXT = "아직 이 AI 도구에 대한 안내가 준비되지 않았습니다.";

// Resolves a Step's per-tool JSON body down to the single string StepData
// expects, picking the variant for the student's own aiTool. An unmapped
// tool (see contentToolKeyFor) or a not-yet-authored variant both fall back
// to the same placeholder, rather than showing a blank step.
function resolveTextContent(
  textContentByTool: unknown,
  aiTool: string,
): string {
  const key = contentToolKeyFor(aiTool);
  if (!key) return NOT_AUTHORED_TEXT;
  const byTool = (textContentByTool ?? {}) as TextContentByTool;
  const text = byTool[key];
  return text && text.trim() ? text : NOT_AUTHORED_TEXT;
}

// GET /api/student/steps?order=N — server-enforced sequential lock.
// Without `order`, returns the current (awaiting) step. With `order`, returns
// that specific already-unlocked step for read-only review — any order
// outside [1, currentStepOrder] is clamped, so a locked future step is never
// exposed. The client renders one step at a time instead of an ever-growing
// list.
export async function GET(req: NextRequest) {
  const prisma = getDb();
  const auth = await getStudentSession();
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { currentStepOrder } = auth.student;

  const orderParam = req.nextUrl.searchParams.get("order");
  const parsedOrder = orderParam !== null ? Number(orderParam) : NaN;
  const viewOrder =
    Number.isInteger(parsedOrder) && parsedOrder >= 1 && parsedOrder <= currentStepOrder
      ? parsedOrder
      : currentStepOrder;

  // Gate at the query level — every other step never leaves the server.
  const [totalSteps, step] = await Promise.all([
    prisma.step.count({ where: { courseId: 1 } }),
    prisma.step.findFirst({
      where: { courseId: 1, order: viewOrder },
      select: {
        id: true,
        order: true,
        topic: true,
        textContentByTool: true,
        requiresUpload: true,
      },
    }),
  ]);

  const resolvedStep = step && {
    id: step.id,
    order: step.order,
    topic: step.topic,
    textContent: resolveTextContent(step.textContentByTool, auth.student.aiTool),
    requiresUpload: step.requiresUpload,
  };

  // The RETURNED step's own submission — when it's the current step, this
  // gates the "다음" button (requiresUpload). When browsing an already-
  // completed step read-only, this is just its uploaded photos.
  let submitted = false;
  let photoPaths: string[] = [];
  if (step) {
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_stepId: {
          studentId: auth.student.id,
          stepId: step.id,
        },
      },
      select: { status: true, photoPaths: true },
    });
    submitted = submission?.status === "uploaded";
    photoPaths = parsePhotoPaths(submission?.photoPaths);
  }

  return NextResponse.json({
    currentStepOrder,
    totalSteps,
    submitted,
    photoPaths,
    // Explicit "advanced past the real last step" signal — see
    // /api/student/advance. Distinct from `submitted`, which is only about
    // the returned step's own submission.
    completed: auth.student.completedAt !== null,
    step: resolvedStep,
  });
}
