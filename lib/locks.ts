import { getDb } from "@/lib/db";

// SPEC: open item resolved as heartbeat-based staleness (plan §8, §1 edit-lock
// timeout). A StepLock whose lastHeartbeatAt is older than 90s is stale and may
// be taken over. The editor client heartbeats every 30s while open.
export const LOCK_STALE_MS = 90 * 1000;

export interface AcquireResult {
  acquired: boolean;
  ownerName: string;
}

// Acquire (or take over a stale) lock for a step.
//
// D1 has no transaction support, so the staleness check and the write are two
// plain sequential statements rather than one atomic compare-and-set. This
// opens a race window where two concurrent acquire calls could both observe
// "no live lock" and both get `{ acquired: true }`. Because stepId is the
// StepLock primary key, the second upsert simply overwrites the first — the
// loser's stale success response self-corrects within one 30s heartbeat cycle
// (heartbeatLock/holdsLock will show they no longer own it). Accepted as a
// low-probability risk on a low-concurrency internal admin tool.
export async function acquireLock(
  stepId: string,
  ownerName: string,
  ownerSessionId: string,
): Promise<AcquireResult> {
  const prisma = getDb();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);

  const existing = await prisma.stepLock.findUnique({ where: { stepId } });

  // Live lock held by someone else → refuse.
  if (
    existing &&
    existing.ownerSessionId !== ownerSessionId &&
    existing.lastHeartbeatAt > staleBefore
  ) {
    return { acquired: false, ownerName: existing.ownerName };
  }

  // No lock, our own lock, or a stale lock → (re)claim it.
  await prisma.stepLock.upsert({
    where: { stepId },
    create: {
      stepId,
      ownerName,
      ownerSessionId,
      lockedAt: now,
      lastHeartbeatAt: now,
    },
    update: {
      ownerName,
      ownerSessionId,
      lockedAt: now,
      lastHeartbeatAt: now,
    },
  });

  return { acquired: true, ownerName };
}

// Refresh the heartbeat, only if the caller still owns the lock. Returns false
// if the lock was lost (released, taken over after going stale, or never held).
export async function heartbeatLock(
  stepId: string,
  ownerSessionId: string,
): Promise<boolean> {
  const prisma = getDb();
  const result = await prisma.stepLock.updateMany({
    where: { stepId, ownerSessionId },
    data: { lastHeartbeatAt: new Date() },
  });
  return result.count > 0;
}

// Release the lock, only if the caller owns it. Returns false if not owned.
export async function releaseLock(
  stepId: string,
  ownerSessionId: string,
): Promise<boolean> {
  const prisma = getDb();
  const result = await prisma.stepLock.deleteMany({
    where: { stepId, ownerSessionId },
  });
  return result.count > 0;
}

// True if the given session currently holds a live (non-stale) lock on the step.
// Used by the content-mutation routes to enforce "must hold the lock".
export async function holdsLock(
  stepId: string,
  ownerSessionId: string,
): Promise<boolean> {
  const prisma = getDb();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS);
  const lock = await prisma.stepLock.findUnique({ where: { stepId } });
  return (
    !!lock &&
    lock.ownerSessionId === ownerSessionId &&
    lock.lastHeartbeatAt > staleBefore
  );
}

// Delete every lock owned by an admin session. Called on admin logout so an
// admin who closes the tab without releasing doesn't leave steps locked.
// Exposed for WU-2's admin logout route.
export async function releaseAllForSession(
  ownerSessionId: string,
): Promise<number> {
  const prisma = getDb();
  const result = await prisma.stepLock.deleteMany({
    where: { ownerSessionId },
  });
  return result.count;
}
