-- Cover image is retired in favor of inline markdown images in textContent
-- (see the inline-image insertion feature). The one existing step with a
-- cover image had it migrated into its textContent before this ran.
ALTER TABLE "Step" DROP COLUMN "imageContent";
