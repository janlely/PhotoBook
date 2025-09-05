-- AlterTable
ALTER TABLE "Album" ADD COLUMN "background" JSONB;
ALTER TABLE "Album" ADD COLUMN "backgroundColor" TEXT;
ALTER TABLE "Album" ADD COLUMN "backgroundImage" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "background" JSONB;
ALTER TABLE "Page" ADD COLUMN "backgroundColor" TEXT;
ALTER TABLE "Page" ADD COLUMN "backgroundImage" TEXT;
