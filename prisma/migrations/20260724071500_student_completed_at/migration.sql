-- Explicit completion marker so "all done" reflects an actual advance past
-- the last step, not just "currently on the last step with it submitted"
-- (which used to show the congrats screen before the student ever clicked
-- 다음 on the final step).
ALTER TABLE "Student" ADD COLUMN "completedAt" TIMESTAMP(3);
