/*
  Warnings:

  - Added the required column `startTime` to the `EventParty` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventParty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isPartial" BOOLEAN NOT NULL DEFAULT true,
    "startTime" DATETIME NOT NULL,
    "balanceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventParty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventParty" ("balanceScore", "createdAt", "id", "isPartial", "sessionId", "status", "updatedAt") SELECT "balanceScore", "createdAt", "id", "isPartial", "sessionId", "status", "updatedAt" FROM "EventParty";
DROP TABLE "EventParty";
ALTER TABLE "new_EventParty" RENAME TO "EventParty";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
