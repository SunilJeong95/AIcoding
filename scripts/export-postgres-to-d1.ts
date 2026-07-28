// One-off, READ-ONLY export of the current Supabase Postgres data into a D1
// (SQLite) INSERT script. Run via: npx tsx scripts/export-postgres-to-d1.ts <output.sql>
// Apply the result with: npx wrangler d1 execute aicoding --remote --file=<output.sql>
//
// Never writes to Postgres. Not a long-term dependency — delete once the D1
// cutover is confirmed stable.
import { Client } from "pg";
import { writeFileSync } from "fs";

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insertStatement(table: string, columns: string[], row: Record<string, unknown>): string {
  const values = columns.map((c) => sqlValue(row[c]));
  return `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`;
}

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL env var not set");
  const outPath = process.argv[2] ?? "prod-import.sql";

  const client = new Client({ connectionString });
  await client.connect();

  const lines: string[] = [
    "-- Auto-generated from Postgres export (scripts/export-postgres-to-d1.ts). READ-ONLY source.",
    "-- Apply via: npx wrangler d1 execute aicoding --remote --file=<this file>",
    "",
  ];
  const counts: Record<string, number> = {};

  const courses = (await client.query('SELECT * FROM "Course"')).rows;
  counts.Course = courses.length;
  for (const r of courses) {
    lines.push(insertStatement("Course", ["id", "title"], r));
  }

  const steps = (await client.query('SELECT * FROM "Step" ORDER BY "order" ASC')).rows;
  counts.Step = steps.length;
  for (const r of steps) {
    lines.push(
      insertStatement(
        "Step",
        ["id", "courseId", "order", "topic", "textContentByTool", "requiresUpload"],
        { ...r, textContentByTool: JSON.stringify(r.textContentByTool ?? {}) },
      ),
    );
  }

  const entryCodes = (await client.query('SELECT * FROM "EntryCode" ORDER BY "issuedAt" ASC')).rows;
  counts.EntryCode = entryCodes.length;
  for (const r of entryCodes) {
    lines.push(
      insertStatement(
        "EntryCode",
        [
          "id", "code", "status", "assignedStudentName", "assignedEmployeeId",
          "aiTool", "issuedAt", "usedAt",
        ],
        r,
      ),
    );
  }

  const students = (await client.query('SELECT * FROM "Student"')).rows;
  counts.Student = students.length;
  for (const r of students) {
    lines.push(
      insertStatement(
        "Student",
        [
          "id", "name", "employeeId", "aiTool", "entryCodeId",
          "currentStepOrder", "completedAt", "createdAt",
        ],
        r,
      ),
    );
  }

  const submissions = (await client.query('SELECT * FROM "Submission"')).rows;
  counts.Submission = submissions.length;
  for (const r of submissions) {
    lines.push(
      insertStatement(
        "Submission",
        ["id", "studentId", "stepId", "photoPaths", "status", "uploadedAt"],
        { ...r, photoPaths: JSON.stringify(r.photoPaths ?? []) },
      ),
    );
  }

  const sessions = (await client.query('SELECT * FROM "Session"')).rows;
  counts.Session = sessions.length;
  for (const r of sessions) {
    lines.push(
      insertStatement(
        "Session",
        ["id", "kind", "name", "entryCode", "revoked", "createdAt"],
        r,
      ),
    );
  }

  const stepLocks = (await client.query('SELECT * FROM "StepLock"')).rows;
  counts.StepLock = stepLocks.length;
  for (const r of stepLocks) {
    lines.push(
      insertStatement(
        "StepLock",
        ["stepId", "ownerName", "ownerSessionId", "lockedAt", "lastHeartbeatAt"],
        r,
      ),
    );
  }

  await client.end();

  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Wrote ${lines.length - 2} INSERT statements to ${outPath}`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
