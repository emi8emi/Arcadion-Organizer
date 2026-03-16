import { prisma } from "../index.js";
import { Character } from "../generated/prisma/client.js";

interface CreateUserOptions {
    userId: string;
    username: string;
    characters?: CharacterOptions[];
}

interface CharacterOptions {
    name: string;
    world: string;
    fflogsCanonicalId: string | null;
}

const userService = {
    async getUser(userId: string, includeCharacters: boolean = false) {
        return await prisma.user.findUnique({
            where: { id: userId },
            include: { characters: includeCharacters },
        });
    },
    async createUser(options: CreateUserOptions) {
        return await prisma.user.create({
            data: { id: options.userId, username: options.username, characters: { create: options.characters } },
        });
    },
    async deleteUser(userId: string) {
        return await prisma.user.delete({
            where: { id: userId },
        });
    },
    async updateUser(userId: string, data: any) {
        return await prisma.user.update({
            where: { id: userId },
            data,
        });
    },
    async addCharacter(userId: string, character: CharacterOptions) {
        return await prisma.user.update({
            where: { id: userId },
            data: { characters: { create: character } },
        });
    },
    async getCharacters(userId: string) {
        return await prisma.character.findMany({
            where: { userId },
        });
    },
    async removeCharacter(userId: string, characterIds: string[]) {
        return await prisma.user.update({
            where: { id: userId },
            data: { characters: { deleteMany: { id: { in: characterIds } } } },
        });
    },
    async removeAllCharacters(userId: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: { characters: { deleteMany: {} } },
        });
    },
}

export default userService;