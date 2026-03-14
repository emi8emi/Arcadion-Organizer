/*
  Warnings:

  - Added the required column `fflogsCanonicalId` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "fflogsCanonicalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("createdAt", "id", "name", "updatedAt", "userId", "world") SELECT "createdAt", "id", "name", "updatedAt", "userId", "world" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_fflogsCanonicalId_key" ON "Character"("fflogsCanonicalId");
CREATE UNIQUE INDEX "Character_userId_name_world_key" ON "Character"("userId", "name", "world");
CREATE UNIQUE INDEX "Character_name_world_key" ON "Character"("name", "world");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
