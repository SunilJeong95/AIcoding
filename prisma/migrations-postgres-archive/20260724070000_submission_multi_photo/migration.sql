-- Submissions now support multiple photos per step. Add the new array column,
-- backfill it from the existing single-photo column, then drop the old one.
ALTER TABLE "Submission" ADD COLUMN "photoPaths" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Submission"
SET "photoPaths" = ARRAY["photoPath"]
WHERE "photoPath" IS NOT NULL;

ALTER TABLE "Submission" DROP COLUMN "photoPath";
