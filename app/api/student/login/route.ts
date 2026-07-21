import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { studentLoginSchema } from "@/lib/validation";

// POST /api/student/login
//
// SPEC: open item resolved as "free-input on first use, then locked to that code"
// (plan §1 / §8). First successful login binds assignedStudentName/assignedEmployeeId/
// aiTool onto the EntryCode and flips status unused → in-use. Subsequent logins with
// the same code must match the stored name+employeeId (prevents hijacking an in-use code).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = studentLoginSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "입력값을 확인하세요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { name, employeeId, aiTool, code } = parsed.data;

  const entryCode = await prisma.entryCode.findUnique({ where: { code } });
  if (!entryCode) {
    return NextResponse.json(
      { error: "존재하지 않는 참가 코드입니다." },
      { status: 400 },
    );
  }

  let studentId: string;
  let currentStepOrder: number;

  if (entryCode.status === "unused") {
    // First use — bind the code to this person.
    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          name,
          employeeId,
          aiTool,
          entryCodeId: entryCode.id,
        },
      });
      await tx.entryCode.update({
        where: { id: entryCode.id },
        data: {
          status: "in-use",
          assignedStudentName: name,
          assignedEmployeeId: employeeId,
          aiTool,
          usedAt: new Date(),
        },
      });
      return created;
    });
    studentId = student.id;
    currentStepOrder = student.currentStepOrder;
  } else {
    // in-use — must match the bound identity, else this is a hijack attempt.
    if (
      entryCode.assignedStudentName !== name ||
      entryCode.assignedEmployeeId !== employeeId
    ) {
      return NextResponse.json(
        { error: "이미 사용 중인 코드입니다. 이름과 사번이 일치하지 않습니다." },
        { status: 403 },
      );
    }
    const existing = await prisma.student.findUnique({
      where: { entryCodeId: entryCode.id },
    });
    if (!existing) {
      // Code marked in-use but the Student row is gone (unexpected). Treat as invalid.
      return NextResponse.json(
        { error: "코드 상태가 올바르지 않습니다. 관리자에게 문의하세요." },
        { status: 409 },
      );
    }
    studentId = existing.id;
    currentStepOrder = existing.currentStepOrder;
  }

  // Fresh Session row is the source of truth for the revoked/force-logout check.
  const sessionRow = await prisma.session.create({
    data: { kind: "student", name, entryCode: code },
  });

  const session = await getSession();
  session.student = { sessionId: sessionRow.id, studentId, entryCode: code };
  session.admin = undefined;
  await session.save();

  return NextResponse.json({ ok: true, studentId, name, currentStepOrder });
}
