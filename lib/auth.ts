import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { prisma } from "@/lib/db";
import { sessionOptions, type SessionData } from "@/lib/session";
import type { Student } from "@prisma/client";

// Raw iron-session handle — used by login/logout route handlers to write/destroy the cookie.
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export interface StudentAuth {
  sessionId: string;
  student: Student;
}

// Returns the authenticated student, or null if not authenticated / revoked / reset.
//
// CRITICAL (critic-mandated): the revoked check on the Session row runs BEFORE we
// load the Student row. An admin Reset revokes the Session AND deletes the Student
// row while the encrypted cookie still exists, so a dangling studentId must be
// treated as "not authenticated" — never allowed to throw.
export async function getStudentSession(): Promise<StudentAuth | null> {
  const session = await getSession();
  const data = session.student;
  if (!data?.sessionId || !data.studentId) return null;

  const sessionRow = await prisma.session.findUnique({
    where: { id: data.sessionId },
  });
  // Missing or revoked session → force-logout. Do this BEFORE touching Student.
  if (!sessionRow || sessionRow.revoked || sessionRow.kind !== "student") {
    return null;
  }

  // Session is valid, but the Student row may have been deleted by a Reset.
  // Tolerate a dangling studentId: null, not a throw.
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });
  if (!student) return null;

  return { sessionId: data.sessionId, student };
}

export interface AdminAuth {
  sessionId: string;
  name: string;
}

// Returns the authenticated admin, or null. Same revoked-first discipline.
export async function getAdminSession(): Promise<AdminAuth | null> {
  const session = await getSession();
  const data = session.admin;
  if (!data?.adminSessionId) return null;

  const sessionRow = await prisma.session.findUnique({
    where: { id: data.adminSessionId },
  });
  if (!sessionRow || sessionRow.revoked || sessionRow.kind !== "admin") {
    return null;
  }

  return { sessionId: data.adminSessionId, name: data.name };
}
