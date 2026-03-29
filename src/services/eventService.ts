import { eventCache } from "../cache/eventCache.js";
import { PendingSignUp } from "../commands/eventsPanel.js";
import { Event, EventSession, EventSignup, EventSignupStatus, Job, Prisma } from "../generated/prisma/client.js";
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
    id?: string;
    eventId: string;
    channelId: string | null;
    date: Date;
    status: EventSessionStatus;
    snapshotAt: Date;
    controlPanelMessageId: string | null;
    signUpPanelId: string | null;
}

export enum EventStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum EventSessionStatus {
    OPEN = 'OPEN',
    LOCKED = 'LOCKED',
    CLOSED = 'CLOSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    UPCOMING = 'UPCOMING'
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
    async getEventIdByPanelChannelId(panelChannelId: string) {
        const cachedEvent = await eventCache.getByPanelChannelId(panelChannelId);
        if (cachedEvent && cachedEvent.eventSessions) {
            return cachedEvent;
        }

        const event = await prisma.event.findFirst({
            where: {
                panelChannelId,
            },
            include: { eventSessions: true }
        });

        if (event) {
            eventCache.set(event);
        }
        return event;
    },
    async getCancellableEvents(creatorId: string, includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: {
                creatorId,
                status: EventStatus.OPEN,
                eventSessions: {
                    some: {
                        status: EventSessionStatus.OPEN,
                    },
                },
            },
            include: { eventSessions: includeEventSessions }
        });
    },
    async getOpenEventSessions(includeEvent: boolean = false): Promise<EventSession & { event: Event } | null> {
        return prisma.eventSession.findFirst({
            where: {
                status: EventSessionStatus.OPEN,
            },
            include: { event: includeEvent },
            orderBy: { snapshotAt: 'asc' },
        });
    },
    async getEventsByGuildIds(guildIds: string[], status?: EventStatus[], includeEventSessions: boolean = false) {
        return prisma.event.findMany({
            where: {
                guildId: {
                    in: guildIds,
                },
                ...(status && { status: { in: status } }),
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
        const cachedEvent = await eventCache.get(id);
        if (cachedEvent) {
            return cachedEvent;
        }

        const event = await prisma.event.findUnique({
            where: { id },
            include: { eventSessions: includeEventSessions }
        });
        if (event) {
            eventCache.set(event);
        }
        return event;
    },
    async getEventsByIds(ids: string[], includeEventSessions: boolean = false) {
        const cachedEvents = await Promise.all(ids.map(id => eventCache.get(id)));
        if (cachedEvents.every(event =>
            event !== null
            && (!includeEventSessions || event.eventSessions)
        )) {
            return cachedEvents;
        }

        const events = await prisma.event.findMany({
            where: { id: { in: ids } },
            include: { eventSessions: includeEventSessions }
        });
        events.forEach(event => eventCache.set(event));
        return events;
    },
    async getEventBySessionId(sessionId: string, includeEventSessions: boolean = false) {
        const cachedEvent = await eventCache.get(sessionId);
        if (cachedEvent) {
            return cachedEvent;
        }

        const event = await prisma.event.findFirst({
            where: { eventSessions: { some: { id: sessionId } } },
            include: { eventSessions: includeEventSessions }
        });
        if (event) {
            eventCache.set(event);
        }
        return event;
    },
    async getEventSessionByDate(eventId: string, date: Date) {
        return prisma.eventSession.findFirst({
            where: { eventId: eventId, date: date }
        });
    },
    async getEventSessionById(id: string) {
        return prisma.eventSession.findUnique({
            where: { id }
        });
    },
    async updateEventPanelChannelId(id: string, panelChannelId: string) {
        return prisma.event.update({ where: { id }, data: { panelChannelId } });
    },
    async updateEventSession(id: string, eventSession: EventSession) {
        return prisma.eventSession.update({ where: { id }, data: eventSession });
    },
    async updateEventSessionStatus(ids: string[], status: EventSessionStatus) {
        return prisma.eventSession.updateMany(
            {
                where: {
                    id: { in: ids }
                },
                data: { status }
            }
        );
    },
    async signUpForSession(sessionId: string, signUp: PendingSignUp) {
        const existingSignup = await prisma.eventSignup.findFirst({
            where: {
                sessionId,
                userId: signUp.userId,
            },
        });

        const data: Prisma.EventSignupUncheckedCreateWithoutSessionInput = {
            userId: signUp.userId,
            characterId: signUp.characterId!,
            availableFrom: signUp.availableTime.from!.toJSDate(),
            availableTo: signUp.availableTime.until!.toJSDate(),
            progPoint: signUp.progPoint,
            willingness: signUp.willingness,
            dailyLimit: signUp.dailyLimit,
            isHelper: signUp.isHelper,
            helperProgPoints: signUp.helperProgPoints?.join(','),
            status: EventSignupStatus.PENDING,
            partiesAssigned: 0,
            jobs: {
                create: signUp.selectedJobs!.map((job) => ({
                    job: job.name,
                    role: job.naturalRole,
                    modifier: job.modifier,
                })),
            },
        };

        if (existingSignup) {
            return prisma.eventSignup.update({
                where: { id: existingSignup.id },
                data: {
                    ...data,
                }
            });
        }

        return prisma.eventSession.update({
            where: { id: sessionId },
            data: { eventSignups: { create: data } }
        });
    },
    async updateEventStatus(id: string, status: EventStatus, updateEventSessions: boolean = false) {
        const event = await this.getEventById(id, false);
        if (!event) {
            throw new Error('Event not found');
        }
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

