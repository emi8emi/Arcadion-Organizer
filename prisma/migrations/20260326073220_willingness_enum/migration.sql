-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progPoint" TEXT,
    "willingness" TEXT,
    "dailyLimit" INTEGER NOT NULL DEFAULT 2,
    "isHelper" BOOLEAN NOT NULL DEFAULT false,
    "helperProgPoints" TEXT,
    "availableFrom" DATETIME NOT NULL,
    "availableTo" DATETIME NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "partiesAssigned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSignup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EventSignup" ("availableFrom", "availableTo", "characterId", "createdAt", "dailyLimit", "helperProgPoints", "id", "isHelper", "partiesAssigned", "progPoint", "sessionId", "status", "updatedAt", "userId", "willingness") SELECT "availableFrom", "availableTo", "characterId", "createdAt", "dailyLimit", "helperProgPoints", "id", "isHelper", "partiesAssigned", "progPoint", "sessionId", "status", "updatedAt", "userId", "willingness" FROM "EventSignup";
DROP TABLE "EventSignup";
ALTER TABLE "new_EventSignup" RENAME TO "EventSignup";
CREATE UNIQUE INDEX "EventSignup_sessionId_userId_key" ON "EventSignup"("sessionId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
