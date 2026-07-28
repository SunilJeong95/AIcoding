-- Step content now varies per AI tool (Cursor / GitHub Copilot / Claude)
-- instead of one shared body. Add the new JSON column, backfill it from the
-- existing single-body column into all three keys (so nothing already
-- written is lost — admins can then diverge each variant from there), then
-- drop the old column.
ALTER TABLE "Step" ADD COLUMN "textContentByTool" JSONB NOT NULL DEFAULT '{}';

UPDATE "Step"
SET "textContentByTool" = jsonb_build_object(
  'Cursor', "textContent",
  'GitHub Copilot', "textContent",
  'Claude', "textContent"
);

ALTER TABLE "Step" DROP COLUMN "textContent";
