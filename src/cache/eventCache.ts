import { Event, EventSession } from "../generated/prisma/client";

const cachedEvents: Record<string, Event & { eventSessions?: EventSession[] }> = {};

export const eventCache = {
    async set(event: Event & { eventSessions?: EventSession[] }) {
        cachedEvents[event.id] = event;
    },
    async get(eventId: string) {
        return cachedEvents[eventId] ?? null;
    },
    async getByPanelChannelId(panelChannelId: string) {
        // this is silly but it works for now
        return Object.values(cachedEvents).find(event => event.panelChannelId === panelChannelId) ?? null;
    },
    async delete(eventId: string) {
        delete cachedEvents[eventId];
    },
    async clear() {
        Object.keys(cachedEvents).forEach(key => delete cachedEvents[key]);
    }
}
