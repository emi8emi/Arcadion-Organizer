import { prisma } from "../index.js";
import { Character, User } from "../generated/prisma/client.js";
import { ActionRowBuilder, ButtonBuilder, CacheType, ChannelType, Interaction, MessageFlags } from "discord.js";
import { userCache } from "../cache/userCache.js";
import { characterCache } from "../cache/characterCache.js";
import { CharacterOptions, characterService } from "./characterService.js";

interface CreateUserOptions {
    userId: string;
    username: string;
    characters?: CharacterOptions[];
}

export const userService = {
    async getUser(userId: string, includeCharacters: boolean = false): Promise<User | null> {
        const cachedUser = await userCache.get(userId);
        if (cachedUser) {
            return cachedUser;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { characters: includeCharacters },
        });
        if (user) {
            userCache.set(userId, user);
            if (includeCharacters) {
                characterCache.set(userId, user.characters);
            }
        }
        return user;
    },
    async createUser(options: CreateUserOptions) {
        const user = await prisma.user.create({
            data: { id: options.userId, username: options.username, characters: { create: options.characters } },
        });
        userCache.set(user.id, user);
        if (options.characters) {
            const characters = await characterService.getCharacters(user.id);
            characterCache.set(user.id, characters);
        }
        return user;
    },
    async deleteUser(userId: string) {
        userCache.delete(userId);
        return await prisma.user.delete({
            where: { id: userId },
        });
    },
    // async updateUser(userId: string, data: any) {
    //     return await prisma.user.update({
    //         where: { id: userId },
    //         data,
    //     });
    // },
    async validateUser(interaction: Interaction<CacheType>, components?: ActionRowBuilder<ButtonBuilder>[]): Promise<boolean> {
        const user = await userCache.getOrFetch(interaction.user.id);
        if (!user) {
            const msg = { content: '❌ You are not registered.', flags: [MessageFlags.Ephemeral], components: components } as const;
            if (interaction.isRepliable()) {
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
            }
            return false;
        }
        return true;
    }
};