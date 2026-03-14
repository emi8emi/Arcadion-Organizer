const { SlashCommandBuilder, MessageFlags } = require('discord.js');
import { prisma } from '../index.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showrank')
        .setDescription('Toggle your rank visibility.'),

    async execute(interaction) {
        let user = await prisma.user.findUnique({
            where: { id: interaction.user.id }
        });

        if (user) {
            user.showRank = !user.showRank;
            await prisma.user.update({
                where: { id: interaction.user.id },
                data: { showRank: user.showRank }
            });
            return interaction.reply({
                content: 'Your rank visibility has been toggled. ' + (user.showRank ? 'You will now show your rank in the queue.' : 'You will no longer show your rank in the queue.'),
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.reply({
            content: 'You are not registered. Please use /register first.',
            flags: [MessageFlags.Ephemeral]
        });
    }
};
