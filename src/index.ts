import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

import { PrismaClient, User } from './generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaBetterSqlite3({ url: connectionString } as any);
export const prisma = new PrismaClient({ adapter });
export const usersCache = new Map<string, User>();

// Extend the Client type to include commands
declare module 'discord.js' {
    interface Client {
        commands: Collection<string, any>;
    }
}

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter((f: string) => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Using dynamic import for ES modules
        import(`file://${filePath}`).then(module => {
            const command = module.default || module;
            if (command && 'data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }).catch(err => {
            console.error(`Failed to load command at ${filePath}:`, err);
        });
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter((f: string) => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        import(`file://${filePath}`).then(module => {
            const event = module.default || module;
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }).catch(err => {
            console.error(`Failed to load event at ${filePath}:`, err);
        });
    }
}

client.login(process.env.DISCORD_TOKEN);
