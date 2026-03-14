import {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ButtonInteraction,
    Client,
    TextChannel,
    Guild,
    PermissionFlagsBits,
    ChannelType,
    CategoryChannel,
    CommandInteraction,
} from 'discord.js';
import { FIGHTS_WITH_TIERS, getAllFightChoices, getFightName, getFightProgPoints } from '../data/fights';
import { getRankFromMmr, formatRank } from '../data/rankings';
import { getAllWorlds } from '../data/worlds';
import { prisma } from '../index.js';

interface QueuedPlayer {
    userId: string;
    username: string;
    role: string;
    mmr: number;
    showRank: boolean;
    fight: string;
    progPoint: string;
    joinedAt: number;
}

interface PendingSession {
    fight?: string;
    progPoint?: string;
    role?: string;
}

interface Role {
    name: string;
    value: string;
    emoji: string;
}

type UserCharacters = Record<string, { name: string; world: string }[]>;
type UserBlacklists = Record<string, { name: string; world: string }[]>;

// In-memory PvE queue: keyed by `${fightValue}_${progPoint}`
const pveQueues: Record<string, QueuedPlayer[]> = {};

// Stored separately to avoid polluting pveQueues iteration
let boardMessageId: string | null = null;

// Track pending UI sessions: userId -> { fight, progPoint, role }
const pendingSessions: Record<string, PendingSession> = {};

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLES: Role[] = [
    { name: 'Tank', value: 'Tank', emoji: '🛡️' },
    { name: 'Healer', value: 'Healer', emoji: '💚' },
    { name: 'Melee DPS', value: 'Melee', emoji: '⚔️' },
    { name: 'Phys Ranged', value: 'Pranged', emoji: '🏹' },
    { name: 'Caster DPS', value: 'Caster', emoji: '🔮' },
];

function getRoleEmoji(role: string): string {
    return ROLES.find(r => r.value === role)?.emoji ?? '❓';
}

/**
 * Build the main queue panel embed shown in the channel.
 * Lists every active queue bucket with current members.
 */
function buildQueueEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ PvE Queue')
        .setColor(0x5865F2)
        .setTimestamp()
        .setFooter({ text: 'Use /pve to join or leave.' });

    const activeQueues = Object.entries(pveQueues).filter(([, m]) => m.length > 0);

    if (activeQueues.length === 0) {
        embed.setDescription('*No one is currently in the queue.*');
        return embed;
    }

    for (const [, members] of activeQueues) {
        if (members.length === 0) continue;
        const { fight, progPoint } = members[0];
        const fightName = getFightName(fight);
        const lines = members.map(m =>
            `${getRoleEmoji(m.role)} <@${m.userId}> — **${m.role}** ${m.showRank ? "*(" + formatRank(m.mmr) + ")*" : ''}`
        );
        embed.addFields({
            name: `${fightName} · ${progPoint}  [Current players: ${members.length}]`,
            value: lines.join('\n'),
        });
    }

    return embed;
}

/**
 * Post or refresh the public queue board in the channel.
 * Stores the message ID so we can edit it on future updates.
 */
async function refreshQueueBoard(client: Client, channelId: string): Promise<void> {
    try {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        if (!channel) return;

        const embed = buildQueueEmbed();

        if (boardMessageId) {
            try {
                const msg = await channel.messages.fetch(boardMessageId);
                await msg.edit({ embeds: [embed] });
                return;
            } catch {
                // Message was deleted — fall through to send a new one
            }
        }

        const msg = await channel.send({ embeds: [embed] });
        boardMessageId = msg.id;
    } catch (err) {
        console.error('[pve] Failed to refresh queue board:', err);
    }
}

// ─── Step builders ───────────────────────────────────────────────────────────

/** Step 1 — Fight select menu */
function buildFightSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
    const allFights = getAllFightChoices().slice(0, 25); // Discord cap
    const menu = new StringSelectMenuBuilder()
        .setCustomId('pve_select_fight')
        .setPlaceholder('Select a fight...')
        .addOptions(
            allFights.map(f =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(f.name)
                    .setValue(f.value)
            )
        );
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/** Step 2 — Prog point select menu */
function buildProgSelect(fight: string): ActionRowBuilder<StringSelectMenuBuilder> {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('pve_select_prog')
        .setPlaceholder('Select your prog point...')
        .addOptions(
            getFightProgPoints(fight).map(p =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(p.name)
                    .setValue(JSON.stringify(p.value))
            )
        );
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/** Step 3 — Role buttons */
function buildRoleButtons(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ROLES.map(r =>
            new ButtonBuilder()
                .setCustomId(`pve_role_${r.value}`)
                .setLabel(`${r.emoji} ${r.name}`)
                .setStyle(ButtonStyle.Secondary)
        )
    );
    return row;
}

/** Confirm / Cancel buttons */
function buildConfirmButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('pve_confirm')
            .setLabel('✅ Join Queue')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('pve_cancel')
            .setLabel('✖ Cancel')
            .setStyle(ButtonStyle.Danger),
    );
}

// ─── Module export ────────────────────────────────────────────────────────────

export const data = new SlashCommandBuilder()
    .setName('pve')
    .setDescription('Open the PvE queue interface.')
    .addSubcommand(sub =>
        sub.setName('join')
            .setDescription('Join the PvE queue.'))
    .addSubcommand(sub =>
        sub.setName('leave')
            .setDescription('Leave the PvE queue.'))
    .addSubcommand(sub =>
        sub.setName('status')
            .setDescription('Show current PvE queue status.'));

// ─── Slash command entry point ──────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await prisma.user.findUnique({ where: { id: interaction.user.id } });
    if (!user) {
        return interaction.reply({
            content: '❌ You must `/register` first.',
            flags: [MessageFlags.Ephemeral],
        });
    }

    const sub = interaction.options.getSubcommand();

    // ── /pve join ──────────────────────────────────────────────────────
    if (sub === 'join') {
        // Check if already queued
        for (const members of Object.values(pveQueues)) {
            if (Array.isArray(members) && members.find(m => m.userId === interaction.user.id)) {
                return interaction.reply({
                    content: '⚠️ You are already in a PvE queue. Use `/pve leave` first.',
                    flags: [MessageFlags.Ephemeral],
                });
            }
        }

        // Start fresh session for this user
        pendingSessions[interaction.user.id] = {};

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚔️ Join PvE Queue — Step 1 of 3')
                    .setDescription('**Select the fight you want to queue for.**')
                    .setColor(0x5865F2),
            ],
            components: [buildFightSelect()],
            flags: [MessageFlags.Ephemeral],
        });
    }

    // ── /pve leave ──────────────────────────────────────────────────────
    if (sub === 'leave') {
        let removed = false;
        for (const [, members] of Object.entries(pveQueues)) {
            if (!Array.isArray(members)) continue;
            const idx = members.findIndex(m => m.userId === interaction.user.id);
            if (idx !== -1) {
                const [entry] = members.splice(idx, 1);
                removed = true;
                await refreshQueueBoard(interaction.client, interaction.channelId);
                return interaction.reply({
                    content: `👋 You left the **${getFightName(entry.fight)}** [${entry.progPoint}] queue.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }
        }
        if (!removed) {
            return interaction.reply({
                content: '❌ You are not in any PvE queue.',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }

    // ── /pve status ─────────────────────────────────────────────────────
    if (sub === 'status') {
        return interaction.reply({
            embeds: [buildQueueEmbed()],
            flags: [MessageFlags.Ephemeral],
        });
    }
}

// ─── Component interactions (select menus & buttons) ───────────────────
export async function handleComponent(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const userId = interaction.user.id;
    const id = interaction.customId;

    // ── Fight selected (Step 1) ─────────────────────────────────────────
    if (interaction.isStringSelectMenu() && id === 'pve_select_fight') {
        const fight = interaction.values[0];
        pendingSessions[userId] = { fight };

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚔️ Join PvE Queue — Step 2 of 3')
                    .setDescription(`Fight: **${getFightName(fight)}**\n\n**Select your prog point.**`)
                    .setColor(0x5865F2),
            ],
            components: [buildProgSelect(interaction.values[0])],
        });
    }

    // ── Prog point selected (Step 2) ────────────────────────────────────
    else if (interaction.isStringSelectMenu() && id === 'pve_select_prog') {
        const progPoint = interaction.values[0];
        pendingSessions[userId] = { ...pendingSessions[userId], progPoint };
        const { fight } = pendingSessions[userId];

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚔️ Join PvE Queue — Step 2 of 3') // Fix: Should probably be "Step 3 of 3" but following JS
                    .setDescription(
                        `Fight: **${getFightName(fight || '')}**\n` +
                        `Prog Point: **${progPoint}**\n\n` +
                        `**Select your role.**`
                    )
                    .setColor(0x5865F2),
            ],
            components: [buildRoleButtons()],
        });
    }

    // ── Role button pressed (Step 3 → confirm) ──────────────────────────
    else if (interaction.isButton() && id.startsWith('pve_role_')) {
        const role = id.replace('pve_role_', '');
        pendingSessions[userId] = { ...pendingSessions[userId], role };
        const { fight, progPoint } = pendingSessions[userId];

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚔️ Confirm Queue Entry')
                    .setColor(0x57F287)
                    .addFields(
                        { name: 'Fight', value: getFightName(fight || '') ?? 'Unknown', inline: true },
                        { name: 'Prog Point', value: progPoint || 'Unknown', inline: true },
                        { name: 'Role', value: `${getRoleEmoji(role)} ${role}`, inline: true },
                    )
                    .setDescription('Ready to join? Press **Join Queue** to confirm.'),
            ],
            components: [buildConfirmButtons()],
        });
    }

    // ── Confirmed ───────────────────────────────────────────────────────
    else if (interaction.isButton() && id === 'pve_confirm') {
        const session = pendingSessions[userId];
        if (!session?.fight || !session?.progPoint || !session?.role) {
            return interaction.update({
                content: '❌ Session expired. Please run `/pve queue` again.',
                embeds: [],
                components: [],
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        // const mmrMap: Record<string, number | null> = {
        //     Tank: user.tankMmr, Healer: user.healerMmr,
        //     Melee: user.meleeMmr, Pranged: user.prangedMmr, Caster: user.casterMmr,
        // };
        const playerMmr = 1500;
        const queueKey = `${session.fight}_${session.progPoint}`;

        if (!Array.isArray(pveQueues[queueKey])) pveQueues[queueKey] = [];
        pveQueues[queueKey].push({
            userId,
            username: user.username,
            role: session.role,
            mmr: playerMmr,
            showRank: user.showRank,
            fight: session.fight,
            progPoint: session.progPoint,
            joinedAt: Date.now(),
        });

        delete pendingSessions[userId];

        const queueSize = pveQueues[queueKey].length;

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Joined PvE Queue')
                    .setColor(0x57F287)
                    .setDescription(
                        `You are now in the **${getFightName(session.fight)}** [${session.progPoint}] queue as ` +
                        `${getRoleEmoji(session.role)} **${session.role}**.\n\n` +
                        `Queue size: **${queueSize}/8**`
                    ),
            ],
            components: [],
        });

        // Refresh the public board
        await refreshQueueBoard(interaction.client, interaction.channelId);

        // Form group if full
        if (queueSize >= 2) {
            await formPveGroup(interaction.guild, interaction.client, queueKey, interaction.channelId);
        }
    }

    // ── Cancelled ───────────────────────────────────────────────────────
    else if (interaction.isButton() && id === 'pve_cancel') {
        delete pendingSessions[userId];
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Queue Cancelled')
                    .setDescription('You cancelled joining the queue.')
                    .setColor(0xED4245),
            ],
            components: [],
        });
    }
}

// ─── Group formation ─────────────────────────────────────────────────────────

const ROLE_LIMITS: Record<string, number> = {
    Tank: 2,
    Healer: 2,
    Melee: 2,
    Pranged: 2,
    Caster: 2,
};

/**
 * Checks if a candidate is compatible with an existing group based on blacklists.
 */
function isCompatible(candidate: QueuedPlayer, group: QueuedPlayer[], userChars: UserCharacters, userBlacklists: UserBlacklists): boolean {
    const candidateChars = userChars[candidate.userId] || [];
    const candidateBlacklist = userBlacklists[candidate.userId] || [];

    for (const member of group) {
        const memberChars = userChars[member.userId] || [];
        const memberBlacklist = userBlacklists[member.userId] || [];

        // Does candidate block member?
        const candidateBlocksMember = memberChars.some(char =>
            candidateBlacklist.some(b => b.name === char.name && b.world === char.world)
        );
        if (candidateBlocksMember) return false;

        // Does member block candidate?
        const memberBlocksCandidate = candidateChars.some(char =>
            memberBlacklist.some(b => b.name === char.name && b.world === char.world)
        );
        if (memberBlocksCandidate) return false;
    }
    return true;
}

interface FindResult {
    party: QueuedPlayer[];
    indices: number[];
}

/**
 * Backtracking search to find a valid 8-person party.
 */
function findValidParty(
    queue: QueuedPlayer[],
    startIndex: number,
    currentParty: QueuedPlayer[],
    counts: Record<string, number>,
    userChars: UserCharacters,
    userBlacklists: UserBlacklists
): FindResult | null {
    if (currentParty.length === 8) {
        // Final sanity check: at least one of each DPS type
        if (counts.Melee >= 1 && counts.Pranged >= 1 && counts.Caster >= 1) {
            return { party: [...currentParty], indices: [] };
        }
        return null;
    }

    for (let i = startIndex; i <= queue.length - (8 - currentParty.length); i++) {
        const player = queue[i];
        const { role } = player;

        if (counts[role] >= ROLE_LIMITS[role]) continue;
        if (!isCompatible(player, currentParty, userChars, userBlacklists)) continue;

        currentParty.push(player);
        counts[role]++;

        const result = findValidParty(queue, i + 1, currentParty, counts, userChars, userBlacklists);
        if (result) {
            result.indices.unshift(i);
            return result;
        }

        currentParty.pop();
        counts[role]--;
    }
    return null;
}

function findDevValidParty(
    queue: QueuedPlayer[],
    startIndex: number,
    currentParty: QueuedPlayer[],
    counts: Record<string, number>,
    userChars: UserCharacters,
    userBlacklists: UserBlacklists
): FindResult | null {
    if (currentParty.length === 2) {
        // Final sanity check: at least one of each DPS type
        if (true) {
            console.log("Found a party!");
            return { party: [...currentParty], indices: [] };
        }
        return null;
    }

    for (let i = startIndex; i <= queue.length - (2 - currentParty.length); i++) {
        const player = queue[i];
        const { role } = player;

        if (counts[role] >= ROLE_LIMITS[role]) continue;
        if (!isCompatible(player, currentParty, userChars, userBlacklists)) continue;

        currentParty.push(player);
        counts[role]++;

        const result = findDevValidParty(queue, i + 1, currentParty, counts, userChars, userBlacklists);
        if (result) {
            result.indices.unshift(i);
            return result;
        }

        currentParty.pop();
        counts[role]--;
    }
    return null;
}

/**
 * Forms a group of 8 players while respecting composition and blacklists.
 */
async function formPveGroup(guild: Guild | null, client: Client, queueKey: string, channelId: string): Promise<void> {
    if (!guild) return;

    const queue = pveQueues[queueKey];
    if (!queue || queue.length < 2) return;

    const userIds = queue.map(m => m.userId);

    const [allCharacters, allBlacklists] = await Promise.all([
        prisma.character.findMany({
            where: { userId: { in: userIds } },
            select: { name: true, world: true, userId: true },
        }),
        prisma.blacklist.findMany({
            where: { blockerId: { in: userIds } },
            select: { blockedName: true, blockedWorld: true, blockerId: true },
        }),
    ]);

    const userChars: UserCharacters = {};
    allCharacters.forEach((c: { userId: string | number; name: string; world: string; }) => {
        if (!userChars[c.userId]) userChars[c.userId] = [];
        userChars[c.userId].push({ name: c.name.toLowerCase(), world: c.world.toLowerCase() });
    });

    const userBlacklists: UserBlacklists = {};
    allBlacklists.forEach((b: { blockerId: string | number; blockedName: string; blockedWorld: string; }) => {
        if (!userBlacklists[b.blockerId]) userBlacklists[b.blockerId] = [];
        userBlacklists[b.blockerId].push({ name: b.blockedName.toLowerCase(), world: b.blockedWorld.toLowerCase() });
    });

    const result = findDevValidParty(
        queue,
        0,
        [],
        { Tank: 0, Healer: 0, Melee: 0, Pranged: 0, Caster: 0 },
        userChars,
        userBlacklists
    );

    if (!result) {
        console.log(`[pve] No valid party found for ${queueKey} among ${queue.length} players.`);
        return;
    }

    const { party, indices } = result;

    // Remove selected players from the queue (reverse indices to keep them stable)
    indices.sort((a, b) => b - a).forEach(idx => {
        queue.splice(idx, 1);
    });

    const { fight, progPoint } = party[0];
    const fightName = getFightName(fight);

    const roster = party
        .map(m => `${getRoleEmoji(m.role)} <@${m.userId}> — **${m.role}** ${m.showRank ? "*(" + formatRank(m.mmr) + ")*" : ''}`)
        .join('\n');

    const mentions = party.map(m => `<@${m.userId}>`).join(' ');

    let warningsCategory = guild.channels.cache.find(
        c => c.name === 'warnings' && c.type === ChannelType.GuildCategory
    ) as CategoryChannel | undefined;

    if (!warningsCategory) {
        warningsCategory = await guild.channels.create({
            name: 'warnings',
            type: ChannelType.GuildCategory,
        });
    }

    const partyChannel = await guild.channels.create({
        name: `${fightName}-${progPoint}-${Math.floor(Math.random() * 1000)}`,
        type: ChannelType.GuildText,
        parent: warningsCategory.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            ...party.map(m => ({
                id: m.userId,
                allow: [PermissionFlagsBits.ViewChannel],
            })),
        ],
    });

    const embed = new EmbedBuilder()
        .setTitle('🎉 PvE Group Formed!')
        .setColor(0xFEE75C)
        .addFields(
            { name: 'Fight', value: fightName ?? 'Unknown', inline: true },
            { name: 'Prog Point', value: progPoint || 'Unknown', inline: true },
            { name: 'Roster', value: roster },
        )
        .setTimestamp();

    if (!partyChannel) return;

    await partyChannel.send({ content: `${mentions}`, embeds: [embed] });

    await refreshQueueBoard(client, channelId);
}
