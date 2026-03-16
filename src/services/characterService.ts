import { prisma } from "../index.js";
import { characterCache } from "../cache/characterCache.js";

export interface CharacterOptions {
    name: string;
    world: string;
    fflogsCanonicalId: string | null;
}

export const characterService = {
    async addCharacter(userId: string, character: CharacterOptions) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { characters: { create: character } },
            include: { characters: true },
        });
        characterCache.set(userId, user.characters);
        return user;
    },
    async getCharacter(userId: string, characterName: string) {
        const cachedCharacters = await characterCache.get(userId);
        const cachedCharacter = cachedCharacters?.find((c) => c.name === characterName);
        if (cachedCharacter) {
            return cachedCharacter;
        }
        const character = await prisma.character.findFirst({
            where: { userId, name: characterName },
        });
        if (character) {
            if (cachedCharacters) {
                characterCache.set(userId, [...cachedCharacters, character]);
            } else {
                characterCache.set(userId, [character]);
            }
        }
        return character;
    },
    async getCharacters(userId: string) {
        const characters = await prisma.character.findMany({
            where: { userId },
        });
        characterCache.set(userId, characters);
        return characters;
    },
    async removeCharacter(userId: string, characterIds: string[]) {
        let characters = await this.getCharacters(userId);
        characters = characters.filter((c) => !characterIds.includes(c.id));
        characterCache.set(userId, characters);
        return await prisma.character.deleteMany({
            where: { userId, id: { in: characterIds } },
        });
    },
    async removeAllCharacters(userId: string) {
        characterCache.delete(userId);
        return await prisma.character.deleteMany({
            where: { userId },
        });
    },
};