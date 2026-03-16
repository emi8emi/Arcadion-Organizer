import { Character } from "../generated/prisma/client.js";
import { CharacterOptions, characterService } from "../services/characterService.js";

const cache = new Map<string, Character[]>();

export const characterCache = {
    async get(userId: string): Promise<Character[]> {
        const cached = cache.get(userId);
        if (cached) {
            return cached;
        }
        const characters = await characterService.getCharacters(userId);
        if (characters.length > 0) {
            cache.set(userId, characters);
        } else {
            cache.set(userId, []);
        }
        return characters;
    },
    async set(userId: string, characters: Character[]): Promise<void> {
        cache.set(userId, characters);
    },
    async delete(userId: string): Promise<void> {
        console.log(`[characterCache] Deleting cache for user ${userId}`);
        cache.set(userId, []);
    },
    async clear(): Promise<void> {
        cache.clear();
    },
};