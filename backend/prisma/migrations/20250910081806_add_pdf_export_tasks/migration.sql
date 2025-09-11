-- CreateTable
CREATE TABLE "PdfExportTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PdfExportTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PdfExportTask_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PdfExportTask_userId_idx" ON "PdfExportTask"("userId");

-- CreateIndex
CREATE INDEX "PdfExportTask_albumId_idx" ON "PdfExportTask"("albumId");

-- CreateIndex
CREATE INDEX "PdfExportTask_status_idx" ON "PdfExportTask"("status");
