/*
  Warnings:

  - You are about to drop the column `summaryMessageId` on the `EventSession` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "channelId" TEXT,
    "signUpPanelId" TEXT,
    "controlPanelMessageId" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "snapshotAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventSession" ("channelId", "controlPanelMessageId", "createdAt", "date", "eventId", "id", "snapshotAt", "status", "updatedAt") SELECT "channelId", "controlPanelMessageId", "createdAt", "date", "eventId", "id", "snapshotAt", "status", "updatedAt" FROM "EventSession";
DROP TABLE "EventSession";
ALTER TABLE "new_EventSession" RENAME TO "EventSession";
CREATE UNIQUE INDEX "EventSession_channelId_key" ON "EventSession"("channelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
