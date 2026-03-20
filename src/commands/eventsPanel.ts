import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction, SlashCommandBuilder, ChatInputCommandInteraction, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { EventParty, EventPartyMember } from "../generated/prisma/client";
import { dateHelper } from "../utils/generalHelpers";
import { characterService } from "../services/characterService";
import { EventSessionStatus } from "../services/eventService";
import { userService } from "../services/userService";
import { getRoleEmoji } from "../data/jobs";

const organizerRole = "Organizer";

export const data = new SlashCommandBuilder()
    .setName('test_event')
    .setDescription('Show the event panel')
    .addSubcommand(sub =>
        sub.setName('party').setDescription('Show the party panel'));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const subcommand = interaction.options.getSubcommand();

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

    // -- /events panel ----------------------------
    if (subcommand === 'party') {
        await interaction.reply(await buildSessionPartyMessage(exampleParty));
    }
}

interface PartyWithMembers {
    party: EventParty,
    members: EventPartyMember[]
}

// test data
const party: EventParty = {
    id: '1',
    sessionId: '1',
    status: EventSessionStatus.OPEN,
    balanceScore: 0,
    isPartial: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    startTime: dateHelper.today(),
    timeslotBucket: new Date()
};

const partyMembers: EventPartyMember[] = [
    {
        id: '1',
        partyId: '1',
        userId: '964310117480824882',
        role: 'TANK',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '1',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '2',
        partyId: '1',
        userId: '964310117480824882',
        role: 'HEALER',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '2',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '3',
        partyId: '1',
        userId: '964310117480824882',
        role: 'PRANGED',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '3',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '4',
        partyId: '1',
        userId: '964310117480824882',
        role: 'CASTER',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '4',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '5',
        partyId: '1',
        userId: '964310117480824882',
        role: 'TANK',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '5',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '6',
        partyId: '1',
        userId: '964310117480824882',
        role: 'HEALER',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '6',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '7',
        partyId: '1',
        userId: '964310117480824882',
        role: 'MELEE',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: '7',
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
    {
        id: '8',
        partyId: '1',
        userId: '964310117480824882',
        role: 'MELEE',
        createdAt: new Date(),
        updatedAt: new Date(),
        isHelper: false,
        characterId: null,
        job: "",
        tankModifier: null,
        fakeMelee: false
    },
];

const pwm: PartyWithMembers = {
    party: party,
    members: partyMembers
}

// MAX 8 PARTIES PER MESSAGE
const exampleParty: PartyWithMembers[] = [
    pwm, pwm, pwm, pwm, pwm, pwm, pwm, pwm
]


export function buildEventPanelMessage() {
    const embed = new EmbedBuilder()
        .setTitle('Event Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage events.\n\n' +
            '➕ **Create Event** — Create a new event.\n' +
            '➖ **Cancel Event** — Cancel an event.\n' +
            '🔍 **View Event** — View an event.\n'
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_create')
            .setLabel('Create Event')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('events_cancel')
            .setLabel('Cancel Event')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('events_view')
            .setLabel('View Event')
            .setEmoji('🔍')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}


export function buildCreateEventModal() {
    const today = dateHelper.today();
    const tomorrow = dateHelper.tomorrow();

    const modal = new ModalBuilder()
        .setCustomId('events_create_modal')
        .setTitle('Create Event');

    const descriptionInput = new TextInputBuilder()
        .setCustomId('events_create_description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Event Description')
        .setRequired(true);

    const descriptionLabel = new LabelBuilder()
        .setLabel('Event Description')
        .setTextInputComponent(descriptionInput)

    modal.addLabelComponents(descriptionLabel);

    const startDateInput = new TextInputBuilder()
        .setCustomId('events_create_start_date')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YYYY-MM-DD')
        .setValue(dateHelper.getDate(today))
        .setRequired(true);

    const startDateLabel = new LabelBuilder()
        .setLabel('Start Date')
        .setTextInputComponent(startDateInput);

    const endDateInput = new TextInputBuilder()
        .setCustomId('events_create_end_date')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YYYY-MM-DD')
        .setValue(dateHelper.getDate(tomorrow))
        .setRequired(true);

    const endDateLabel = new LabelBuilder()
        .setLabel('End Date')
        .setTextInputComponent(endDateInput);

    modal.addLabelComponents(startDateLabel, endDateLabel);

    return modal;
}


// ─── Creator panel message builder ────────────────────────────────────────────────────

export function buildEventsCreatorPanelMessage() {
    const warning = `⚠️ **Warning:** All admins and users with the ${organizerRole} role have access to this panel.`;

    const embed = new EmbedBuilder()
        .setTitle('💣 Event Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage this event.\n\n' +
            '🧯 **Add Organizer** — Add an organizer to this event.\n' +
            '🔥 **Remove Organizer** — Remove an organizer from this event.\n' +
            '💥 **Cancel Event** — Cancel this event.\n',
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_add_organizer_btn')
            .setLabel('Add Organizer')
            .setEmoji('🧯')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('events_remove_organizer_btn')
            .setLabel('Remove Organizer')
            .setEmoji('🔥')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('events_cancel_event_btn')
            .setLabel('Cancel Event')
            .setEmoji('💥')
            .setStyle(ButtonStyle.Danger),
    );

    return { content: warning, embeds: [embed], components: [row] };
}


// ─── Session organizer sign-up panel message builder ────────────────────────────────────────────────────

export function buildSessionOrganizerPanelMessage(closed: boolean = false) {
    const warning = `⚠️ **Warning:** Only admins, users with the ${organizerRole} role and the event's organizers can use this panel.`;

    const embed = new EmbedBuilder()
        .setTitle('📅 Organizer Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage this session.\n\n' +
            '❗ **Ping Organizers** — Ping all organizers of this event.\n' +
            `🔒 **${closed ? 'Open' : 'Close'} Session** — ${closed ? 'Open' : 'Close'} this session.\n` +
            // TODO: validate the reversible warning, and consider enabling this button only when the session is closed
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

export function buildSessionSignUpPanelMessage() {
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

async function buildSessionPartyMessage(partyWithMembers: PartyWithMembers[]) {
    let containers: ContainerBuilder[] = [];

    const label = new TextDisplayBuilder()
        .setContent(`### Time Slot: ${dateHelper.getTime(partyWithMembers[0].party.startTime)}`)
    // containers.push(component);

    let idx = 0;
    for (const partyW of partyWithMembers) {
        const party = partyW.party;
        const partyMembers = partyW.members;

        let partyDescription = "";
        const charactersIds = partyMembers.map(m => m.characterId).filter(id => id !== null && id !== undefined);
        const characters = await characterService.getCharactersByIds(charactersIds);
        for (const member of partyMembers) {
            const character = characters.find(c => c.id === member.characterId);
            if (!character) {
                partyDescription += `- ${getRoleEmoji(member.role)} @${(await userService.getUserById(member.userId))?.username}\n`;
            } else {
                partyDescription += `- ${getRoleEmoji(member.role)} ${character.name} @ ${character.world}\n`;
            }
        }

        const container = new ContainerBuilder()
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `### **🪞 ${party.isPartial ? 'Partial' : 'Full'} Party** at: ${dateHelper.getTime(party.startTime)}\n` +
                                `**Status:** \`${party.status}\` | **Score:** ${party.balanceScore}`
                            )
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(partyDescription)
                    )
                    // This puts the button directly inside the "card" section
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`edit_party_${party.id}_${idx}`)
                            .setEmoji('✏️')
                            .setLabel('Edit')
                            .setStyle(ButtonStyle.Primary)
                    )
            );

        containers.push(container);
        idx++;
    }

    const flags = MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications;

    return { components: [label, ...containers], flags: flags };
}

// handle component
export async function handleComponent(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction) {

    const customId = interaction.customId;
    // -- /events panel ----------------------------
    if (customId === 'events_panel_party') {
        interaction.reply(await buildSessionPartyMessage(exampleParty));
    }
}