import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { MAX_CODES } from "@/lib/codes";

// GET /api/admin/codes — list all entry codes with status + assignee info.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const codes = await prisma.entryCode.findMany({
    orderBy: { issuedAt: "asc" },
  });

  return NextResponse.json({
    total: codes.length,
    max: MAX_CODES,
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status,
      assignedStudentName: c.assignedStudentName,
      assignedEmployeeId: c.assignedEmployeeId,
      aiTool: c.aiTool,
      issuedAt: c.issuedAt,
      usedAt: c.usedAt,
    })),
  });
}
