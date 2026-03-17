/*
  Warnings:

  - A unique constraint covering the columns `[panelChannelId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN "panelChannelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_panelChannelId_key" ON "Event"("panelChannelId");
