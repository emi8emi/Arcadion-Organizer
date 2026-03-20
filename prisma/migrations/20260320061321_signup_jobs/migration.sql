/*
  Warnings:

  - You are about to drop the `Roles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `timeslotBucket` to the `EventParty` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job` to the `EventPartyMember` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Roles_signupId_role_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Roles";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signupId" TEXT NOT NULL,
    "role" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signupId" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "modifier" TEXT,
    CONSTRAINT "Jobs_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "EventSignup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventParty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isPartial" BOOLEAN NOT NULL DEFAULT true,
    "startTime" DATETIME NOT NULL,
    "timeslotBucket" DATETIME NOT NULL,
    "balanceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventParty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EventSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventParty" ("balanceScore", "createdAt", "id", "isPartial", "sessionId", "startTime", "status", "updatedAt") SELECT "balanceScore", "createdAt", "id", "isPartial", "sessionId", "startTime", "status", "updatedAt" FROM "EventParty";
DROP TABLE "EventParty";
ALTER TABLE "new_EventParty" RENAME TO "EventParty";
CREATE TABLE "new_EventPartyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "job" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isHelper" BOOLEAN NOT NULL DEFAULT false,
    "tankModifier" TEXT,
    "fakeMelee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "EventParty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventPartyMember" ("characterId", "createdAt", "id", "isHelper", "partyId", "role", "updatedAt", "userId") SELECT "characterId", "createdAt", "id", "isHelper", "partyId", "role", "updatedAt", "userId" FROM "EventPartyMember";
DROP TABLE "EventPartyMember";
ALTER TABLE "new_EventPartyMember" RENAME TO "EventPartyMember";
CREATE UNIQUE INDEX "EventPartyMember_partyId_userId_key" ON "EventPartyMember"("partyId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_signupId_role_key" ON "Role"("signupId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Jobs_signupId_job_modifier_key" ON "Jobs"("signupId", "job", "modifier");
