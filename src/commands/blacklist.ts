const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { getAllWorlds } = require('../data/worlds.js');
import { prisma } from '../index.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage your character blacklist to prevent players from joining your groups.')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a character to your blacklist.')
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Character First and Last Name')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('world')
                        .setDescription('The world server')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a character from your blacklist.')
                .addStringOption(opt =>
                    opt.setName('character')
                        .setDescription('The character to remove (Name @ World)')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all characters in your blacklist.')),

    async autocomplete(interaction) {
        const sub = interaction.options.getSubcommand();
        const focusedValue = interaction.options.getFocused().toLowerCase();

        if (sub === 'add') {
            const allWorlds = getAllWorlds();
            const filtered = allWorlds
                .filter(w => w.toLowerCase().includes(focusedValue))
                .slice(0, 25);
            await interaction.respond(filtered.map(w => ({ name: w, value: w })));
        } else if (sub === 'remove') {
            const blacklist = await prisma.blacklist.findMany({
                where: { blockerId: interaction.user.id }
            });

            const filtered = blacklist
                .map(b => ({ name: `${b.blockedName} @ ${b.blockedWorld}`, value: b.id }))
                .filter(c => c.name.toLowerCase().includes(focusedValue))
                .slice(0, 25);
            await interaction.respond(filtered);
        }
    },

    async execute(interaction) {
        const user = await prisma.user.findUnique({ where: { id: interaction.user.id } });
        if (!user) return interaction.reply({ content: 'You must `/register` first.', flags: [MessageFlags.Ephemeral] });

        const subCmd = interaction.options.getSubcommand();

        // ==================== ADD ====================
        if (subCmd === 'add') {
            const name = interaction.options.getString('name');
            const world = interaction.options.getString('world');

            // Optional: Block users from blacklisting themselves if they are registered
            const myChars = await prisma.character.findMany({ where: { userId: interaction.user.id } });
            const isMe = myChars.some(c => c.name.toLowerCase() === name.toLowerCase() && c.world.toLowerCase() === world.toLowerCase());

            if (isMe) {
                return interaction.reply({
                    content: `❌ You cannot blacklist your own characters.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            try {
                await prisma.blacklist.create({
                    data: {
                        blockerId: interaction.user.id,
                        blockedName: name,
                        blockedWorld: world
                    }
                });

                await interaction.reply({
                    content: `✅ Blacklisted **${name}** @ **${world}**. They will no longer be able to join your groups.`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (err) {
                if (err.code === 'P2002') { // Unique constraint failed
                    return interaction.reply({
                        content: `ℹ️ **${name}** @ **${world}** is already on your blacklist.`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                throw err;
            }
        }

        // ==================== REMOVE ====================
        if (subCmd === 'remove') {
            const blacklistId = interaction.options.getString('character');

            try {
                const deleted = await prisma.blacklist.delete({
                    where: {
                        id: blacklistId,
                        blockerId: interaction.user.id // Extra safety
                    }
                });

                await interaction.reply({
                    content: `✅ Removed **${deleted.blockedName}** @ **${deleted.blockedWorld}** from your blacklist.`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (err) {
                return interaction.reply({
                    content: `❌ Could not find that character on your blacklist.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }

        // ==================== LIST ====================
        if (subCmd === 'list') {
            const blacklist = await prisma.blacklist.findMany({
                where: { blockerId: interaction.user.id }
            });

            if (blacklist.length === 0) {
                return interaction.reply({
                    content: `Your blacklist is currently empty.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🚫 Your Blacklist')
                .setColor(0xFF0000)
                .setDescription(blacklist.map(b => `• **${b.blockedName}** @ ${b.blockedWorld}`).join('\n'))
                .setFooter({ text: `Total: ${blacklist.length}` });

            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    }
};

