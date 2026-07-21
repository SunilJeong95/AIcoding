import type { SessionOptions } from "iron-session";

// Encrypted cookie payload. Only one of the two identity shapes is populated at a time.
export interface SessionData {
  // Student session (plan §Session model detail)
  student?: {
    sessionId: string; // Session row id (source of truth for revoked check)
    studentId: string;
    entryCode: string;
  };
  // Admin session
  admin?: {
    adminSessionId: string; // Session row id (kind='admin')
    name: string;
  };
}

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  // Fail loud in every runtime: iron-session refuses secrets < 32 chars anyway.
  throw new Error(
    "SESSION_SECRET env var must be set and at least 32 characters long.",
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: "training_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};
