-- CreateTable
CREATE TABLE "ImageLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shortCode" TEXT NOT NULL,
    "imageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImageLink_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageLink_shortCode_key" ON "ImageLink"("shortCode");

-- CreateIndex
CREATE INDEX "ImageLink_shortCode_idx" ON "ImageLink"("shortCode");

-- CreateIndex
CREATE INDEX "ImageLink_imageId_idx" ON "ImageLink"("imageId");
