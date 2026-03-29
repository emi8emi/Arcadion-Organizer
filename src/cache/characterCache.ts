import { Character } from "../generated/prisma/client.js";

const cache = new Map<string, Character[]>();

// TODO: implement dirty checking
export const characterCache = {
    async get(userId: string): Promise<Character[] | null> {
        return cache.get(userId) ?? null;
    },
    async set(userId: string, characters: Character[]): Promise<void> {
        cache.set(userId, characters);
    },
    async getAllCharacters(): Promise<Character[]> {
        return Array.from(cache.values()).flat();
    },
    async delete(userId: string): Promise<void> {
        cache.set(userId, []);
    },
    async clear(): Promise<void> {
        cache.clear();
    },
};