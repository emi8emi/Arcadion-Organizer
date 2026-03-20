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
    async getCharactersByIds(characterIds: string[]) {
        const cachedCharacters = await characterCache.getAllCharacters();
        const cachedCharacter = cachedCharacters?.filter((c) => characterIds.includes(c.id));
        if (cachedCharacter && cachedCharacter.length === characterIds.length) {
            return cachedCharacter;
        }
        const characters = await prisma.character.findMany({
            where: { id: { in: characterIds } },
        });
        if (characters) {
            if (cachedCharacters) {
                characterCache.set(characters[0].userId, [...cachedCharacters, ...characters]);
            } else {
                characterCache.set(characters[0].userId, characters);
            }
        }
        return characters;
    },
    async getCharacterByName(characterName: string, characterWorld: string) {
        const cachedCharacters = await characterCache.getAllCharacters();
        const cachedCharacter = cachedCharacters?.find((c) => c.name === characterName);
        if (cachedCharacter) {
            return cachedCharacter;
        }
        const character = await prisma.character.findFirst({
            where: { name: characterName, world: characterWorld },
        });
        if (character) {
            if (cachedCharacters) {
                characterCache.set(character.userId, [...cachedCharacters, character]);
            } else {
                characterCache.set(character.userId, [character]);
            }
        }
        return character;
    },
    async getUserCharacters(userId: string) {
        const cached = characterCache.get(userId);
        if (cached) return cached;

        const characters = await prisma.character.findMany({
            where: { userId },
        });
        characterCache.set(userId, characters);
        return characters;
    },
    async removeCharacter(userId: string, characterIds: string[]) {
        let characters = await this.getUserCharacters(userId) ?? [];
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