import { Interaction, CacheType, ChannelType } from "discord.js";
import { userService } from "../services/userService.js";
import { User } from "../generated/prisma/client.js";

const cache = new Map<string, User | null>();

export const userCache = {
    async get(userId: string): Promise<User | null> {
        return cache.get(userId) || null;
    },
    async set(userId: string, user: User): Promise<void> {
        cache.set(userId, user);
    },
    async delete(userId: string): Promise<void> {
        cache.delete(userId);
    },
    async clear(): Promise<void> {
        cache.clear();
    }
};