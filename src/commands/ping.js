const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        await interaction.reply({
            content: 'Pinging...',
            flags: [MessageFlags.Ephemeral]
        });

        await interaction.editReply({
            content: `Pong! Latency is ${Math.round(interaction.client.ws.ping)}ms`,
        });
    }
};
