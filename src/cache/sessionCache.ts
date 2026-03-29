import { EventSession } from "../generated/prisma/client.js";

const cache: Map<string, EventSession> = new Map();

export const sessionCache = {
    get(sessionId: string): EventSession | null {
        return cache.get(sessionId) || null;
    },
    set(sessionId: string, session: EventSession): void {
        cache.set(sessionId, session);
    },
    delete(sessionId: string): void {
        cache.delete(sessionId);
    },
    clear(): void {
        cache.clear();
    },
};