-- AlterTable
ALTER TABLE "Step" ADD COLUMN     "requiresUpload" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "photoPath" DROP NOT NULL;
