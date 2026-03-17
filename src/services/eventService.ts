import { Event, EventSession } from "../generated/prisma/client.js";
import { prisma } from "../index.js";
import { dateHelper } from "../utils/generalHelpers.js";

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
    panelChannelId?: string;
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
    async getEventsByStatus(status: EventStatus[], includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: {
                status: {
                    in: status,
                },
            },
            include: { eventSessions: includeEventSessions }
        });
    },
    async getActiveEvents(includeEventSessions: boolean = false) {
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
            include: { eventSessions: includeEventSessions }
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
        const today = dateHelper.today();
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
    async getEventsByCreatorId(creatorId: string, includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: {
                creatorId,
            },
            include: { eventSessions: includeEventSessions }
        });
    },
    async getEventsByGuildId(guildId: string, includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: {
                guildId,
            },
            include: { eventSessions: includeEventSessions }
        });
    },
    async getEventByDateAndStatus(date: Date, status?: EventSessionStatus[], guildId?: string, includeEventSessions: boolean = false) {
        return await prisma.event.findMany({
            where: {
                guildId,
            },
            include: {
                eventSessions: includeEventSessions && {
                    where: {
                        date: {
                            lte: date,
                        },
                        status: {
                            in: status,
                        },
                    },
                }
            },

        });
    },
    async getEventById(id: string, includeEventSessions: boolean = false) {
        return prisma.event.findUnique({
            where: { id },
            include: { eventSessions: includeEventSessions }
        });
    },
    async getEventsByIds(ids: string[], includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: { id: { in: ids } },
            include: { eventSessions: includeEventSessions }
        });
    },
    async updateEventPanelChannelId(id: string, panelChannelId: string) {
        return prisma.event.update({ where: { id }, data: { panelChannelId } });
    },
    async updateEventSession(id: string, eventSession: EventSession) {
        return prisma.eventSession.update({ where: { id }, data: eventSession });
    },
    async updateEventSessionStatus(id: string, status: EventSessionStatus) {
        return prisma.eventSession.update({ where: { id }, data: { status } });
    },
    async updateEventStatus(id: string, status: EventStatus, updateEventSessions: boolean = false) {
        return prisma.event.update({
            where: { id },
            data: {
                status,
                ...(updateEventSessions && { eventSessions: { updateMany: { where: { eventId: id }, data: { status } } } }),
            }
        });
    },
    // async updateEvent(id: string, event: Event) {
    //     return prisma.event.update({ where: { id }, data: event });
    // },
    async deleteEvents(options: EventsOptions) {
        return prisma.event.deleteMany({ where: options });
    },
    async deleteEventById(ids: string[]) {
        return prisma.event.deleteMany({ where: { id: { in: ids } } });
    },
};

