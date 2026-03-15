/*
  Warnings:

  - A unique constraint covering the columns `[channelId]` on the table `EventSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN "snapshotAt" DATETIME;

-- AlterTable
ALTER TABLE "EventSession" ADD COLUMN "channelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventSession_channelId_key" ON "EventSession"("channelId");
