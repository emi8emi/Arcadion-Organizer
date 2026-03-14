const { SlashCommandBuilder, MessageFlags } = require('discord.js');
import { prisma } from '../index.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team')
        .setDescription('Manage your FFXIV competitive team.')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new competitive group.')
                .addStringOption(opt => opt.setName('name').setDescription('The name of your team').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('invite')
                .setDescription('Invite a player to your team.')
                .addUserOption(opt => opt.setName('player').setDescription('The player to invite').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('join')
                .setDescription('Accept a pending invite to a team.')
                .addStringOption(opt => opt.setName('team_name').setDescription('The team name to join').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Kick a member from your team (Captain only).')
                .addUserOption(opt => opt.setName('player').setDescription('The player to kick').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('leave')
                .setDescription('Leave your current team.'))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('View your team roster and MMR.')),

    async execute(interaction) {
        const user = await prisma.user.findUnique({ where: { id: interaction.user.id } });
        if (!user) {
            return interaction.reply({ content: 'You must use `/register` first.', flags: [MessageFlags.Ephemeral] });
        }
        const subCmd = interaction.options.getSubcommand();

        // ==================== CREATE ====================
        if (subCmd === 'create') {
            const teamName = interaction.options.getString('name');

            const existingMember = await prisma.teamMember.findFirst({ where: { userId: interaction.user.id } });
            if (existingMember) return interaction.reply({ content: 'You are already in a team! Use `/team leave` first.', flags: [MessageFlags.Ephemeral] });

            const existingTeam = await prisma.team.findUnique({ where: { name: teamName } });
            if (existingTeam) return interaction.reply({ content: 'A team with that name already exists.', flags: [MessageFlags.Ephemeral] });

            const newTeam = await prisma.team.create({
                data: {
                    name: teamName,
                    ownerId: interaction.user.id,
                    members: { create: { userId: interaction.user.id } }
                }
            });

            return interaction.reply({ content: `Team **${newTeam.name}** has been created! You are the captain. Use \`/team invite\` to add members.`, flags: [MessageFlags.Ephemeral] });
        }

        // ==================== INVITE ====================
        if (subCmd === 'invite') {
            const targetUser = interaction.options.getUser('player');

            // Must be a captain
            const myMember = await prisma.teamMember.findFirst({
                where: { userId: interaction.user.id },
                include: { team: true }
            });
            if (!myMember || myMember.team.ownerId !== interaction.user.id) {
                return interaction.reply({ content: 'You must be the Captain of a team to invite players.', flags: [MessageFlags.Ephemeral] });
            }

            // Check team size (max 8)
            const memberCount = await prisma.teamMember.count({ where: { teamId: myMember.teamId } });
            if (memberCount >= 8) return interaction.reply({ content: 'Your team is already full (8/8).', flags: [MessageFlags.Ephemeral] });

            // Check if invited player is registered
            const invitedUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
            if (!invitedUser) return interaction.reply({ content: `${targetUser.username} is not registered. They need to use \`/register\` first.`, flags: [MessageFlags.Ephemeral] });

            // Check if already invited
            const existingInvite = await prisma.teamInvite.findUnique({
                where: { teamId_userId: { teamId: myMember.teamId, userId: targetUser.id } }
            });
            if (existingInvite && existingInvite.status === 'PENDING') {
                return interaction.reply({ content: `${targetUser.username} already has a pending invite to your team.`, flags: [MessageFlags.Ephemeral] });
            }

            // Check if already in the team
            const alreadyMember = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: myMember.teamId, userId: targetUser.id } }
            });
            if (alreadyMember) return interaction.reply({ content: `${targetUser.username} is already on your team.`, flags: [MessageFlags.Ephemeral] });

            // Create or update invite
            await prisma.teamInvite.upsert({
                where: { teamId_userId: { teamId: myMember.teamId, userId: targetUser.id } },
                update: { status: 'PENDING' },
                create: { teamId: myMember.teamId, userId: targetUser.id }
            });

            // DM the target user
            try {
                await targetUser.send(`✉️ You have been invited to join the team **${myMember.team.name}**! Join using \`/team join team_name:${myMember.team.name}\``);
            } catch (err) {
                console.log(`Could not DM user ${targetUser.id}:`, err);
            }

            return interaction.reply({ content: `📩 ${targetUser} has been invited to **${myMember.team.name}**! They can accept with \`/team join team_name:${myMember.team.name}\`.`, flags: [MessageFlags.Ephemeral] });
        }

        // ==================== JOIN ====================
        if (subCmd === 'join') {
            const teamName = interaction.options.getString('team_name');

            // Check if already in a team
            const existingMember = await prisma.teamMember.findFirst({ where: { userId: interaction.user.id } });
            if (existingMember) return interaction.reply({ content: 'You are already in a team! Use `/team leave` first.', flags: [MessageFlags.Ephemeral] });

            // Find team
            const team = await prisma.team.findUnique({ where: { name: teamName } });
            if (!team) return interaction.reply({ content: `No team named "${teamName}" exists.`, flags: [MessageFlags.Ephemeral] });

            // Check for pending invite
            const invite = await prisma.teamInvite.findUnique({
                where: { teamId_userId: { teamId: team.id, userId: interaction.user.id } }
            });
            if (!invite || invite.status !== 'PENDING') {
                return interaction.reply({ content: `You don't have a pending invite to **${teamName}**. Ask the captain to send one.`, flags: [MessageFlags.Ephemeral] });
            }

            // Check team size
            const memberCount = await prisma.teamMember.count({ where: { teamId: team.id } });
            if (memberCount >= 8) return interaction.reply({ content: `**${teamName}** is already full (8/8).`, flags: [MessageFlags.Ephemeral] });

            // Accept & join
            await prisma.teamInvite.update({
                where: { id: invite.id },
                data: { status: 'ACCEPTED' }
            });

            await prisma.teamMember.create({
                data: { teamId: team.id, userId: interaction.user.id }
            });

            return interaction.reply({ content: `✅ You have joined **${teamName}**! (${memberCount + 1}/8)`, flags: [MessageFlags.Ephemeral] });
        }

        // ==================== KICK ====================
        if (subCmd === 'kick') {
            const targetUser = interaction.options.getUser('player');

            const myMember = await prisma.teamMember.findFirst({
                where: { userId: interaction.user.id },
                include: { team: true }
            });
            if (!myMember || myMember.team.ownerId !== interaction.user.id) {
                return interaction.reply({ content: 'Only the Captain can kick members.', flags: [MessageFlags.Ephemeral] });
            }

            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ content: 'You cannot kick yourself. Use `/team leave` instead.', flags: [MessageFlags.Ephemeral] });
            }

            const targetMember = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: myMember.teamId, userId: targetUser.id } }
            });
            if (!targetMember) return interaction.reply({ content: `${targetUser.username} is not on your team.`, flags: [MessageFlags.Ephemeral] });

            await prisma.teamMember.delete({ where: { id: targetMember.id } });

            return interaction.reply({ content: `🚫 **${targetUser.username}** has been kicked from **${myMember.team.name}**.`, flags: [MessageFlags.Ephemeral] });
        }

        // ==================== LEAVE ====================
        if (subCmd === 'leave') {
            const member = await prisma.teamMember.findFirst({
                where: { userId: interaction.user.id },
                include: { team: true }
            });
            if (!member) return interaction.reply({ content: 'You are not in a team.', flags: [MessageFlags.Ephemeral] });

            await prisma.teamMember.delete({ where: { id: member.id } });

            // If captain leaves, transfer ownership or delete team
            if (member.team.ownerId === interaction.user.id) {
                const remaining = await prisma.teamMember.findMany({ where: { teamId: member.teamId } });
                if (remaining.length === 0) {
                    // Delete all invites and the team
                    await prisma.teamInvite.deleteMany({ where: { teamId: member.teamId } });
                    await prisma.team.delete({ where: { id: member.teamId } });
                    return interaction.reply({ content: `You left and **${member.team.name}** has been disbanded (no remaining members).`, flags: [MessageFlags.Ephemeral] });
                } else {
                    // Transfer to the first remaining member
                    await prisma.team.update({
                        where: { id: member.teamId },
                        data: { ownerId: remaining[0].userId }
                    });
                    return interaction.reply({ content: `You left **${member.team.name}**. Captaincy has been transferred to <@${remaining[0].userId}>.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            return interaction.reply({ content: `You have left **${member.team.name}**.`, flags: [MessageFlags.Ephemeral] });
        }

        // ==================== INFO ====================
        if (subCmd === 'info') {
            const member = await prisma.teamMember.findFirst({
                where: { userId: interaction.user.id },
                include: { team: { include: { members: { include: { user: true } } } } }
            });
            if (!member) return interaction.reply({ content: 'You are not in a team.', flags: [MessageFlags.Ephemeral] });

            const team = member.team;
            const roster = team.members.map(m => {
                const isCaptain = m.userId === team.ownerId ? ' 👑' : '';
                return `• ${m.user.username}${isCaptain}`;
            }).join('\n');

            return interaction.reply({
                content: `**${team.name}** (Team MMR: ${team.teamMmr})\n` +
                    `Members (${team.members.length}/8):\n${roster}`,
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
