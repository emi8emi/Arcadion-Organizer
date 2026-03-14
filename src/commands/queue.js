const { SlashCommandBuilder, MessageFlags } = require('discord.js');
import { prisma } from '../index.js';

// In-memory queue storage for simplicity. In production, this might be in Redis.
const mmrQueues = {
    SPEEDRUN: { 8: [], mixed: [] },
    SURVIVAL: { 8: [], mixed: [] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Queue up for a competitive match.')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('The mode you want to play')
                .setRequired(true)
                .addChoices(
                    { name: 'Speedrun', value: 'SPEEDRUN' },
                    { name: 'Survival', value: 'SURVIVAL' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Queue as a full premade 8-man team, or mixed PUG.')
                .setRequired(true)
                .addChoices(
                    { name: '8-Man Premade', value: '8' },
                    { name: 'Mixed PUG', value: 'mixed' }
                ))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('The role you are queuing as (required for Mixed PUG)')
                .addChoices(
                    { name: 'Tank', value: 'Tank' },
                    { name: 'Healer', value: 'Healer' },
                    { name: 'Melee DPS', value: 'Melee' },
                    { name: 'Phys Ranged DPS', value: 'Pranged' },
                    { name: 'Caster DPS', value: 'Caster' }
                )),

    async execute(interaction) {
        const user = await prisma.user.findUnique({ where: { id: interaction.user.id } });
        if (!user) return interaction.reply({ content: 'You must `/register` first.', flags: [MessageFlags.Ephemeral] });

        const mode = interaction.options.getString('mode');
        const type = interaction.options.getString('type');
        const role = interaction.options.getString('role');

        if (type === '8') {
            const member = await prisma.teamMember.findFirst({
                where: { userId: interaction.user.id },
                include: { team: true }
            });
            if (!member || member.team.ownerId !== interaction.user.id) {
                return interaction.reply({ content: 'You must be the Captain of a Team to queue as an 8-Man Premade.', flags: [MessageFlags.Ephemeral] });
            }

            // Check if team is already queued
            const isQueued = mmrQueues[mode]['8'].find(q => q.teamId === member.teamId);
            if (isQueued) return interaction.reply({ content: 'Your team is already in the queue!', flags: [MessageFlags.Ephemeral] });

            // Add to queue
            const queueEntry = {
                teamId: member.teamId,
                teamName: member.team.name,
                mmr: member.team.teamMmr,
                channelId: interaction.channelId
            };

            mmrQueues[mode]['8'].push(queueEntry);
            await interaction.reply({ content: `Team **${member.team.name}** has entered the 8-Man ${mode} queue! (Average MMR: ${member.team.teamMmr}). Waiting for an opponent...`, flags: [MessageFlags.Ephemeral] });

            // Attempt to strictly matchmake the 8-man queue
            await attempt8ManMatchmaking(interaction.client, mode, interaction.channelId);
        }
        else if (type === 'mixed') {
            if (!role) {
                return interaction.reply({ content: 'You must specify the `role` you are playing when queuing as a Mixed PUG.', flags: [MessageFlags.Ephemeral] });
            }
            // Determine MMR for that specific role
            let playerMmr = 1500;
            // if (role === 'Tank') playerMmr = user.tankMmr;
            // if (role === 'Healer') playerMmr = user.healerMmr;
            // if (role === 'Melee') playerMmr = user.meleeMmr;
            // if (role === 'Pranged') playerMmr = user.prangedMmr;
            // if (role === 'Caster') playerMmr = user.casterMmr;

            // Prevent duplicate queuing
            const isQueuedAsSolo = mmrQueues[mode]['mixed'].find(q => q.userId === interaction.user.id);
            if (isQueuedAsSolo) return interaction.reply({ content: 'You are already in the solo queue!', flags: [MessageFlags.Ephemeral] });

            mmrQueues[mode]['mixed'].push({
                userId: user.id,
                username: user.username,
                role: role,
                mmr: playerMmr,
                channelId: interaction.channelId
            });

            await interaction.reply({ content: `${user.username} entered the PUG ${mode} queue as a **${role}**! (MMR: ${playerMmr}). Players in PUG queue: ${mmrQueues[mode]['mixed'].length}`, flags: [MessageFlags.Ephemeral] });

            // (Matchmaking logic for filling PUGs would go here)
        }
    }
};

// Simplified Matchmaking Logic
async function attempt8ManMatchmaking(client, mode, channelId) {
    const queue = mmrQueues[mode]['8'];
    if (queue.length >= 2) {
        // Pop the first two teams
        const teamA = queue.shift();
        const teamB = queue.shift();

        const channel = await client.channels.fetch(channelId);

        // Generate Webhook/Match ID
        // (In a real scenario, you'd create a channel/webhook dynamically here)
        const matchId = require('crypto').randomUUID();

        // Create Database Match
        await prisma.match.create({
            data: {
                id: matchId,
                status: 'IN_PROGRESS',
                mode: mode,
                teamAId: teamA.teamId,
                teamBId: teamB.teamId,
                startTime: new Date()
            }
        });

        const raids = ["P5S", "P8S Phase 2", "The Omega Protocol (Ultimate)", "M4S", "TOP"];
        const randomRaid = raids[Math.floor(Math.random() * raids.length)];

        channel.send(`🚨 **MATCH FOUND!** 🚨\n\n🛡️ **${teamA.teamName}** [${teamA.mmr}]\n⚔️ **VS**\n🛡️ **${teamB.teamName}** [${teamB.mmr}]\n\n⚠️ **Raid:** ${randomRaid}\n\n**Instructions:** Captains, please type \`/matchmaker start ${matchId}\` in your FFXIV chat using the Dalamud Plugin right now! May the best team win.`);
    }
}
