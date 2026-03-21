import { Events, Client } from 'discord.js';
import { eventsCron } from '../services/eventsCron';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        await eventsCron.tickDaily();
        await eventsCron.scheduleNextSnapshot();
        console.log(`Ready! Logged in as ${client.user?.tag}`);
    },
};
