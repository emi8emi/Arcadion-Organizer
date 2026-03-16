import { Event, EventSession } from "../generated/prisma/client.js";
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

export enum EventStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum EventSessionStatus {
    OPEN = 'OPEN',
    FORMING = 'FORMING',
    LOCKED = 'LOCKED',
    CLOSED = 'CLOSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export const eventService = {
    async createEvent(options: CreateEventOptions) {
        return prisma.event.create({ data: options });
    },
    async createEventSession(options: CreateEventSessionOptions) {
        return prisma.eventSession.create({ data: options });
    },
    async getEventsByStatus(status: EventStatus[]) {
        return prisma.event.findMany({
            where: {
                status: {
                    in: status,
                },
            },
        });
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
    async getActiveEventSessionByStatus(eventIds: string[], status: EventSessionStatus[]) {
        return prisma.eventSession.findMany({
            where: {
                eventId: {
                    in: eventIds,
                },
                status: {
                    in: status,
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
    async updateEventSession(id: string, eventSession: EventSession) {
        return prisma.eventSession.update({ where: { id }, data: eventSession });
    },
    async updateEventSessionStatus(id: string, status: EventSessionStatus) {
        return prisma.eventSession.update({ where: { id }, data: { status } });
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

