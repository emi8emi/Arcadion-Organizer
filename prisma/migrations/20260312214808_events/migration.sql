/*
  Warnings:

  - You are about to drop the `RaidEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidEventOrganizer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidParty` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidPartyMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidPartyOutcome` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RaidSignup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `raidName` on the `Match` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "RaidEventOrganizer_eventId_userId_key";

-- DropIndex
DROP INDEX "RaidPartyMember_partyId_userId_key";

-- DropIndex
DROP INDEX "RaidPartyOutcome_partyId_key";

-- DropIndex
DROP INDEX "RaidSignup_sessionId_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidEvent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidEventOrganizer";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidParty";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidPartyMember";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidPartyOutcome";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidSession";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RaidSignup";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "fightId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventEventOrganizer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    CONSTRAINT "EventEventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "summaryMessageId" TEXT,
    "controlPanelMessageId" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "snapshotAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progPoint" TEXT,
    "willingness" TEXT,
    "isHelper" BOOLEAN NOT NULL DEFAULT false,
    "helperProgPoints" TEXT,
    "availableFrom" DATETIME NOT NULL,
    "availableTo" DATETIME NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "partiesAssigned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSignup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventParty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isPartial" BOOLEAN NOT NULL DEFAULT true,
    "balanceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventParty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPartyOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "progAchieved" BOOLEAN NOT NULL DEFAULT false,
    "fflogsUrl" TEXT,
    "satisfactionUpvotes" INTEGER NOT NULL DEFAULT 0,
    "satisfactionDownvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventPartyOutcome_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "EventParty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPartyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isHelper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "EventParty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eventName" TEXT,
    "mode" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "winnerId" TEXT,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "endTime", "id", "mode", "startTime", "status", "teamAId", "teamBId", "updatedAt", "webhookUrl", "winnerId") SELECT "createdAt", "endTime", "id", "mode", "startTime", "status", "teamAId", "teamBId", "updatedAt", "webhookUrl", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_Roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signupId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "Roles_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "EventSignup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Roles" ("id", "role", "signupId") SELECT "id", "role", "signupId" FROM "Roles";
DROP TABLE "Roles";
ALTER TABLE "new_Roles" RENAME TO "Roles";
CREATE UNIQUE INDEX "Roles_signupId_role_key" ON "Roles"("signupId", "role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Event_categoryId_key" ON "Event"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventEventOrganizer_eventId_userId_key" ON "EventEventOrganizer"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignup_sessionId_userId_key" ON "EventSignup"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPartyOutcome_partyId_key" ON "EventPartyOutcome"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPartyMember_partyId_userId_key" ON "EventPartyMember"("partyId", "userId");
