import { Event } from "../generated/prisma/client.js";
import { prisma } from "../index.js";

interface EventsOptions {
    guildId?: string;
    startDate?: Date;
    endDate?: Date;
    creatorId?: string;
    status?: string;
    fightId?: string;
    description?: string;
    categoryId?: string;
}

interface CreateEventOptions {
    guildId: string;
    creatorId: string;
    fightId: string;
    categoryId?: string;
    description: string;
    startDate: Date;
    endDate: Date;
}

interface CreateEventSessionOptions {
    eventId: string;
    channelId: string | null;
    date: Date;
    snapshotAt: Date;
}

export const eventService = {
    async createEvent(options: CreateEventOptions) {
        return prisma.event.create({ data: options });
    },
    async createEventSession(options: CreateEventSessionOptions) {
        return prisma.eventSession.create({ data: options });
    },
    async getActiveEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.event.findMany({
            where: {
                endDate: {
                    gte: today,
                },
                startDate: {
                    lte: today,
                },
            },
        });
    },
    async getActiveEventSessions(eventIds: string[]) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.eventSession.findMany({
            where: {
                eventId: {
                    in: eventIds,
                },
                date: {
                    gte: today,
                },
            },
        });
    },
    async getEvents(options: EventsOptions) {
        return prisma.event.findMany({
            where: options,
        });
    },
    async getEventById(id: string, includeEventSessions: boolean = false) {
        return prisma.event.findUnique({
            where: { id },
            include: { eventSessions: includeEventSessions }
        });
    },
    async updateEvent(id: string, event: Event) {
        return prisma.event.update({ where: { id }, data: event });
    },
    async deleteEvents(options: EventsOptions) {
        return prisma.event.deleteMany({ where: options });
    },
    async deleteEventById(id: string) {
        return prisma.event.delete({ where: { id } });
    },
};

