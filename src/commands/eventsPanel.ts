import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EventParty, EventPartyMember } from "../generated/prisma/client";
import { getRoleEmoji } from "../utils/messageHelpers";
import { characterService } from "../services/characterService";

const organizerRole = "Organizer";

// ─── Creator panel message builder ────────────────────────────────────────────────────

function buildEventsCreatorPanelMessage() {
    const warning = `⚠️ **Warning:** All admins and users with the ${organizerRole} role have access to this panel.`;

    const embed = new EmbedBuilder()
        .setTitle('💣 Event Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage this event.\n\n' +
            '➕ **Add Organizer** — Add an organizer to this event.\n' +
            '➖ **Remove Organizer** — Remove an organizer from this event.\n' +
            '❌ **Cancel Event** — Cancel this event.\n',
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_add_organizer_btn')
            .setLabel('Add Organizer')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('events_remove_organizer_btn')
            .setLabel('Remove Organizer')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('events_cancel_event_btn')
            .setLabel('Cancel Event')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger),
    );

    return { content: warning, embeds: [embed], components: [row] };
}


// ─── Session organizer sign-up panel message builder ────────────────────────────────────────────────────

function buildSessionOrganizerPanelMessage(closed: boolean = false) {
    const warning = `⚠️ **Warning:** Only admins, users with the ${organizerRole} role and the event's organizers can use this panel.`;

    const embed = new EmbedBuilder()
        .setTitle('📅 Organizer Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage this session.\n\n' +
            '❗ **Ping Organizers** — Ping all organizers of this event.\n' +
            `🔒 **${closed ? 'Open' : 'Close'} Session** — ${closed ? 'Open' : 'Close'} this session.\n` +
            // TODO: update the reversible warning, and consider enabling this button only when the session is closed
            `⚔️ **Force Party Formation** — Force party formation for this session (⚠️ this is PROBABLY not reversible. ⚠️).\n`
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_ping_organizers_btn')
            .setLabel('Ping Organizers')
            .setEmoji('❗')
            .setStyle(ButtonStyle.Primary),
        // this button should toggle the session status between open and closed, and hide/show the channel for users
        new ButtonBuilder()
            .setCustomId('events_toggle_session_btn')
            .setLabel(`${closed ? 'Open' : 'Close'} Session`)
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('events_force_party_formation_btn')
            .setLabel('Force Party Formation')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Danger),
    );

    return { content: warning, embeds: [embed], components: [row] };
}

// ─── Session sign-up panel message builder ────────────────────────────────────────────────────

function buildSessionSignUpPanelMessage() {
    const embed = new EmbedBuilder()
        .setTitle('📝 Session Sign-up Panel')
        .setColor(0x5865F2)
        .setDescription(
            `✍️ **Sign-Up** — Sign-up for this session.\n` +
            `❌ **Cancel** — Cancel for this session.\n`
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_sign_up_btn')
            .setLabel('Sign-Up')
            .setEmoji('✍️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('events_cancel_sign_up_btn')
            .setLabel('Cancel')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row] };
}

// ─── Session party message builder ────────────────────────────────────────────────────

async function buildSessionPartyMessage(party: EventParty, partyMembers: EventPartyMember[]) {
    let partyDescription = "";

    for (const member of partyMembers) {
        const character = (await characterService.getCharacters(member.userId))?.[0];
        if (!character) continue;
        partyDescription += `• ${getRoleEmoji(member.role)} ${character.name} @ ${character.world}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🪞 ${party.isPartial ? 'Partial' : 'Full'} Party`)
        .setColor(0x5865F2)
        .setDescription(
            partyDescription
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_party_formation_btn')
            .setLabel('Party Formation')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Primary),
    );

    return { embeds: [embed], components: [row] };
}