import { endSessions, startSessions } from "../commands/events.js";
import { client } from "../index.js";
import { dateHelper } from "../utils/generalHelpers.js";
import { eventService, EventSessionStatus, EventStatus } from "./eventService.js";
import { Event, EventSession } from "../generated/prisma/client.js";

export const eventsCron = {
    tickDaily,
    scheduleNextSnapshot,
}

async function tickDaily() {
    await runDailyTasks();

    const delay = dateHelper.tomorrow(true).getTime() - Date.now();
    setTimeout(async () => {
        await runDailyTasks();
        console.log(`[eventsCron] Daily tick`);
        tickDaily(); // reschedule for the next day
    }, Math.max(delay, 0));
}

async function scheduleNextSnapshot() {
    const next = await eventService.getOpenEventSessions();
    if (!next) return;

    const delay = next.snapshotAt.getTime() - Date.now();
    setTimeout(async () => {
        // TODO: run formation for session
        await runFormation(next);
        console.log(`[eventsCron] Snapshot taken for event ${next.id}`);
        scheduleNextSnapshot(); // reschedule for the next one
    }, Math.max(delay, 0));
}

async function runDailyTasks() {
    const guildIds = client.guilds.cache.map(guild => guild.id);
    if (!guildIds) return;

    const events = await eventService.getEventsByGuildIds(guildIds, [EventStatus.OPEN, EventStatus.CLOSED], true);
    if (!events) return;

    let eventsOrderedByGuild: Record<string, (Event & { eventSessions: EventSession[] })[]> = {};
    for (const event of events) {
        if (!event) continue;
        if (!event.eventSessions) continue;

        if (!eventsOrderedByGuild[event.guildId]) {
            eventsOrderedByGuild[event.guildId] = [];
        }
        eventsOrderedByGuild[event.guildId].push(event);

        const sessionsToUpdate = event.eventSessions.filter(session => dateHelper.getDate(session.date) <= dateHelper.getDate(dateHelper.today()) && session.status === "OPEN");
        if (sessionsToUpdate.length > 0) {
            console.log(`[eventsCron] Ending ${sessionsToUpdate.length} sessions for event ${event.id}`);
            await endSessions(sessionsToUpdate, event.guildId);
        }
    }

    for (const guildId in eventsOrderedByGuild) {
        try {
            console.log(`[eventsCron] Starting sessions for guild ${guildId}`);
            await startSessions(eventsOrderedByGuild[guildId], guildId);
        } catch (error) {
            console.error(`[eventsCron] Failed to start sessions for guild ${guildId}`, error);
        }
    }

}

function runFormation(next: EventSession & { event: Event }) {
    throw new Error("Function not implemented.");
}
