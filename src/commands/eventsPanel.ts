import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction, SlashCommandBuilder, ChatInputCommandInteraction, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, StringSelectMenuBuilder, LabelModalData, ModalData, Interaction, StringSelectMenuOptionBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder, TextChannel } from "discord.js";
import { Character, EventParty, EventPartyMember, EventSession, Role, Job, EventSignup, Prisma, Willingness } from "../generated/prisma/client";
import { dateHelper } from "../utils/generalHelpers";
import { characterService } from "../services/characterService";
import { eventService, EventSessionStatus } from "../services/eventService";
import { userService } from "../services/userService";
import { CASTER_JOBS, getRoleEmoji, HEALER_JOBS, JobWithModifier, LIMITED_JOBS, MELEE_JOBS, PRANGED_JOBS, TANK_JOBS, createJobWithModifier } from "../data/jobs";
import { DateTime } from 'luxon';
import { sessionCache } from "../cache/sessionCache";
import { getFightName, getFightProgPoints } from "../data/fights";
import { UserSelect } from "../generated/prisma/models";

const organizerRole = "Organizer";

export interface PendingSignUp {
    sessionId: string;
    userId: string;
    characters?: Character[];
    characterId?: string;
    roles?: Role[];
    selectedJobs?: JobWithModifier[];
    willingness?: Willingness;
    availableTime: { from: DateTime, until: DateTime, timezone: string };
    dailyLimit?: number;
    isHelper?: boolean;
    helperProgPoints?: string[];
    progPoint?: string;
}

const TIMEZONES = [
    { label: 'UTC', iana: 'UTC' },
    { label: 'Eastern (ET)', iana: 'America/New_York' },
    { label: 'Central (CT)', iana: 'America/Chicago' },
    { label: 'Mountain (MT)', iana: 'America/Denver' },
    { label: 'Pacific (PT)', iana: 'America/Los_Angeles' },
    { label: 'London (GMT/BST)', iana: 'Europe/London' },
    { label: 'Brasília (BRT)', iana: 'America/Sao_Paulo' },
    { label: 'Central Europe', iana: 'Europe/Paris' },
    { label: 'Sydney (AEST)', iana: 'Australia/Sydney' },
    { label: 'Japan (JST)', iana: 'Asia/Tokyo' },
];

function ianaToLabel(iana: string) {
    return TIMEZONES.find(tz => tz.iana === iana)?.label;
}

function labelToIana(label: string) {
    return TIMEZONES.find(tz => tz.label === label)?.iana;
}

const mapWillingnessToLabel = (willingness: Willingness) => {
    switch (willingness) {
        case Willingness.NONE:
            return 'No.';
        case Willingness.VERY_LOW:
            return 'Not really...';
        case Willingness.LOW:
            return 'A lil';
        case Willingness.MEDIUM:
            return 'More than a lil';
        case Willingness.HIGH:
            return 'Yes';
        case Willingness.VERY_HIGH:
            return 'Yes!!!';
    }
};

const pendingSignUps: Record<string, PendingSignUp> = {};

export const data = new SlashCommandBuilder()
    .setName('events_panel')
    .setDescription('Show the event panel')
    .addSubcommand(sub =>
        sub.setName('party').setDescription('Show the party panel'))
    .addSubcommand(sub =>
        sub.setName('admin').setDescription('Show the admin panel'))

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const subcommand = interaction.options.getSubcommand();

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

    // -- /events panel ----------------------------
    if (subcommand === 'party') {
        await interaction.reply(await buildSessionPartyMessage(exampleParty));
    }

    if (subcommand === 'admin') {
        const organizerPanelMessage = buildEventsCreatorPanelMessage();
        await interaction.reply({ ...organizerPanelMessage, flags: [MessageFlags.SuppressNotifications] });
        const helperPanelMessage = buildEventsHelperPanelMessage();
        await (interaction.channel as TextChannel).send({ ...helperPanelMessage, flags: [MessageFlags.SuppressNotifications] });
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

// TODO: Update when discord.js implements radiogroups
export async function buildCreateEventModal() {
    const today = dateHelper.today();
    const tomorrow = dateHelper.tomorrow();
    let actualModal;

    const timezoneOptions = await buildTimezoneSelect('events_create_timezone');

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
    actualModal = modal.toJSON();
    actualModal.components.push(timezoneOptions as any);

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

    const snapshotInput = new TextInputBuilder()
        .setCustomId('events_create_snapshot')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('01-02:00')
        .setValue('01-02:00')
        .setRequired(true);

    const snapshotLabel = new LabelBuilder()
        .setLabel('Formation offset (d-hh:mm)')
        .setTextInputComponent(snapshotInput);

    modal.addLabelComponents(startDateLabel, endDateLabel, snapshotLabel);
    actualModal.components.push(snapshotLabel.toJSON(), startDateLabel.toJSON(), endDateLabel.toJSON());

    return actualModal;
}


// ─── Creator panel message builder ────────────────────────────────────────────────────

export function buildEventsCreatorPanelMessage() {
    const warning = `⚠️ **Warning:** All admins and users with the ${organizerRole} role have access to this panel.`;

    const embed = new EmbedBuilder()
        .setTitle('💣 Event Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage this event.\n\n' +
            '🧯 **Add Organizers** — Add organizers to this event.\n' +
            '🗻 **Add Helpers** — Add helpers to this event.\n' +
            '💥 **Cancel Event** — Cancel this event.\n',
        );

    const organizerRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('events_add_organizers')
            .setPlaceholder('🧯 Add Organizers')
            .setMinValues(1)
            .setMaxValues(25),
    );

    const helpersRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('events_add_helpers')
            .setPlaceholder('🗻 Add Helpers')
            .setMinValues(1)
            .setMaxValues(25),
    );

    return { content: warning, embeds: [embed], components: [organizerRow, helpersRow] };
}

// ─── Helper panel message builder ────────────────────────────────────────────────────

export function buildEventsHelperPanelMessage() {
    const warning = `⚠️ **Warning:** You can select up to 25 roles for each category.`;

    const embed = new EmbedBuilder()
        .setTitle('💣 Event Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage the helpers of this event.\n\n' +
            '🧯 **Add Organizers** — Add organizers to this event.\n' +
            '🗻 **Add Helpers** — Add helpers to this event.\n',
        );

    const organizerRoleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
            .setMinValues(0)
            .setMaxValues(25)
            .setCustomId('events_select_organizer_role')
            .setPlaceholder('🧯 Select roles to add as organizers'),
    );

    const helperRoleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
            .setMinValues(0)
            .setMaxValues(25)
            .setCustomId('events_select_helper_role')
            .setPlaceholder('🗻 Select roles to add as helpers'),
    );

    const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('events_cancel_btn')
            .setLabel('Cancel Event')
            .setEmoji('💥')
            .setStyle(ButtonStyle.Danger),
    );

    return { content: warning, components: [organizerRoleRow, helperRoleRow, buttonsRow] };
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

export function buildSessionSignUpPanelMessage(sessionId: string) {
    const embed = new EmbedBuilder()
        .setTitle('📝 Session Sign-up Panel')
        .setColor(0x5865F2)
        .setDescription(
            `✍️ **Sign-Up** — Sign-up for this session.\n` +
            `❌ **Cancel** — Cancel for this session.\n`
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`events_sign_up_btn_${sessionId}`)
            .setLabel('Sign-Up')
            .setEmoji('✍️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`events_cancel_sign_up_btn_${sessionId}`)
            .setLabel('Cancel')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row] };
}


// TODO: update when discord.js implements checkboxes

// ─── Session sign-up step 1 builder ────────────────────────────────────────────────────

async function buildSignupRoleModal(pendingSignUp: PendingSignUp, allowLimited: boolean = false) {
    let roles = Object.values(Role);
    if (!allowLimited) {
        roles = roles.filter(role => role !== Role.LIMITED);
    }

    const roleOptions = roles.map(role => ({ value: role, label: getRoleEmoji(role) + ' ' + role }));
    const event = await eventService.getEventBySessionId(pendingSignUp.sessionId);
    if (!event) {
        throw new Error('Event not found, try again later.');
    }

    const progPointOptions = getFightProgPoints(event.fightId).map(progPoint => {
        return {
            label: progPoint.name,
            value: progPoint.name,
        };
    });
    const willingnessOptions = Object.values(Willingness).map(willingness => ({
        label: mapWillingnessToLabel(willingness),
        value: willingness,
    }));

    return {
        title: 'Sign Up — Role Selection',
        custom_id: `events_sign_up_modal_${pendingSignUp.sessionId}`,
        components: [
            {
                type: ComponentType.Label,
                label: 'Select your roles',
                component: {
                    type: ComponentType.CheckboxGroup,
                    custom_id: 'events_sign_up_modal_roles',
                    min_values: 1,
                    max_values: roles.length,
                    required: true,
                    options: roleOptions,
                },
            },
            {
                type: ComponentType.Label,
                label: 'Select your progression goal',
                component: {
                    type: ComponentType.RadioGroup,
                    custom_id: `events_sign_up_modal_prog_point`,
                    min_values: 1,
                    max_values: 1,
                    required: true,
                    options: progPointOptions,
                },
            },
            {
                type: ComponentType.Label,
                label: 'Willing to help earlier prog points?',
                component: {
                    type: ComponentType.RadioGroup,
                    custom_id: 'events_sign_up_modal_willingness',
                    required: true,
                    options: willingnessOptions,
                },
            }
        ],
    };
}


// ─── Session sign-up step 2 builder ────────────────────────────────────────────────────

function buildSignupJobModal(pendingSignUp: PendingSignUp, allowLimited: boolean = false) {
    if (!pendingSignUp.roles) {
        throw new Error('No roles selected');
    }

    const tankOptions = TANK_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));
    const healerOptions = HEALER_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));
    const meleeDpsOptions = MELEE_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));
    const physicalRangedDpsOptions = PRANGED_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));
    const magicalRangedDpsOptions = CASTER_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));
    const limitedJobOptions = LIMITED_JOBS.map(job => ({ value: job, label: getRoleEmoji(job) + ' ' + job }));

    return {
        title: 'Sign Up — Job Selection',
        custom_id: `events_sign_up_job_modal_${pendingSignUp.sessionId}`,
        components: [
            ...(!pendingSignUp.roles.includes(Role.TANK) ? [] : [{
                type: ComponentType.Label,
                label: 'Tank',
                component: {
                    type: 22, // CheckboxGroup
                    custom_id: 'jobs_tank',
                    min_values: 1,
                    required: true,
                    options: tankOptions,
                },
            }]),
            ...(!pendingSignUp.roles.includes(Role.HEALER) ? [] : [{
                type: ComponentType.Label,
                label: 'Healer',
                component: {
                    type: 22,
                    custom_id: 'jobs_healer',
                    min_values: 1,
                    required: true,
                    options: healerOptions,
                },
            }]),
            ...(!pendingSignUp.roles.includes(Role.MELEE) ? [] : [{
                type: ComponentType.Label,
                label: 'Melee DPS',
                component: {
                    type: 22,
                    custom_id: 'jobs_melee',
                    min_values: 1,
                    required: true,
                    options: meleeDpsOptions,
                },
            }]),
            ...(!pendingSignUp.roles.includes(Role.PRANGED) ? [] : [{
                type: ComponentType.Label,
                label: 'Physical Ranged DPS',
                component: {
                    type: 22,
                    custom_id: 'jobs_pranged',
                    min_values: 1,
                    required: true,
                    options: physicalRangedDpsOptions,
                },
            }]),
            ...(!pendingSignUp.roles.includes(Role.CASTER) ? [] : [{
                type: ComponentType.Label,
                label: 'Magical Ranged DPS',
                component: {
                    type: 22,
                    custom_id: 'jobs_caster',
                    min_values: 1,
                    required: true,
                    options: magicalRangedDpsOptions,
                },
            }]),
            ...((!pendingSignUp.roles.includes(Role.LIMITED) || !allowLimited) ? [] : [{
                type: ComponentType.Label,
                label: 'Limited Job',

                component: {
                    type: 22,
                    custom_id: 'jobs_limited',
                    min_values: 1,
                    required: true,
                    options: limitedJobOptions,
                },
            }]),
        ],
    };
}

// ─── Session sign-up step 3 builder ────────────────────────────────────────────────────

async function buildSignupConfirmationModal(pendingSignUp: PendingSignUp) {
    if (!pendingSignUp.selectedJobs) {
        throw new Error('No jobs selected');
    }

    const jobSummary = pendingSignUp.selectedJobs
        .map(job => `${getRoleEmoji(job.actualRole)} ${job.name}`)
        .join(', ');


    return {
        title: 'Sign-Up Confirmation',
        custom_id: `events_sign_up_confirmation_modal_${pendingSignUp.sessionId}`,
        components: [
            {
                type: ComponentType.Label,
                label: `Select your character for this session`,
                description: jobSummary,
                component: {
                    type: ComponentType.StringSelect,
                    custom_id: `events_sign_up_character_select`,
                    placeholder: 'Select your character',
                    options: pendingSignUp.characters!.map(c => ({
                        label: `🥚 ${c.name} @ ${c.world}`,
                        value: c.id,
                    })),
                },
            },
            {
                ...(await buildTimezoneSelect('timezone'))
            },
            {
                type: ComponentType.Label,
                label: 'Available from:',
                description: 'Type the time you are available to play',
                component: {
                    type: ComponentType.TextInput,
                    style: TextInputStyle.Short,
                    custom_id: `events_sign_up_time_from`,
                    placeholder: `${DateTime.now().toFormat('HH:mm')}`,
                    value: pendingSignUp.availableTime.from.toFormat('HH:mm'),
                },
            },
            {
                type: ComponentType.Label,
                label: 'Available until:',
                description: 'Type the time you are available to play',
                component: {
                    type: ComponentType.TextInput,
                    style: TextInputStyle.Short,
                    custom_id: `events_sign_up_time_until`,
                    placeholder: `${DateTime.now().toFormat('HH:mm')}`,
                    value: pendingSignUp.availableTime.until.toFormat('HH:mm'),
                },
            }
        ],
    };
}

// ─── Session sign-up step 4 builder ────────────────────────────────────────────────────
// TODO: "helper" role handling and add willingness
async function buildHelpingModal(pendingSignup: PendingSignUp) {
    return {
        title: "Helper stuff",
        custom_id: `events_sign_up_helper_modal_${pendingSignup.sessionId}`,
        components: [
            {
                type: ComponentType.Label,
                label: "Helping stuff",
                component: {
                    type: ComponentType.TextInput,
                    style: TextInputStyle.Paragraph,
                    custom_id: `events_sign_up_helper_text`,
                    placeholder: `Type the time you are available to play`,
                },
            }
        ],
    }
}

export async function buildTimezoneSelect(customId: string) {
    return {
        type: ComponentType.Label,
        label: 'Your Timezone',
        description: 'Select your timezone.',
        component: {
            type: ComponentType.RadioGroup,
            custom_id: customId,
            required: true,
            options: await buildTimezoneOptions(),
        },
    };
}

async function buildTimezoneOptions() {
    const dt = DateTime.now().setZone('utc');

    return TIMEZONES.map(tz => {
        const local = dt.setZone(tz.iana);
        const formatted = local.toFormat('EEE d MMM, h:mm a ZZZZ'); // e.g. "Sat 5 Apr, 8:00 PM EDT"
        return {
            value: tz.iana,
            label: tz.label,
            description: formatted,
        };
    });
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

    else if (interaction.isButton() && customId.startsWith('events_sign_up_btn_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            // TODO: ping organizer
            interaction.reply({ content: 'Invalid session ID', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const characters = await characterService.getUserCharacters(interaction.user.id);
        if (!characters || characters.length === 0) {
            interaction.reply({
                content: '❌ You have no characters registered. Please register a character before signing up for an event.',
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        const pendingSignUp = {
            sessionId: sessionId,
            userId: interaction.user.id,
            characters: characters,
            selectedRoles: [],
            selectedJobs: [],
            availableTime: { from: DateTime.now(), until: DateTime.now().plus({ hours: 2 }), timezone: '' }
        }
        pendingSignUps[interaction.user.id] = pendingSignUp;
        await interaction.showModal((await buildSignupRoleModal(pendingSignUp)) as any);
    }

    else if (interaction.isModalSubmit() && customId.startsWith('events_sign_up_modal_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            // TODO: ping organizer
            await interaction.reply({ content: 'Invalid session ID' });
            return;
        }

        const labelComponents = interaction.components.filter(c => c.type === ComponentType.Label) as any[];
        const selectedRoles = labelComponents.find(c => c.component.customId === 'events_sign_up_modal_roles')?.component.values;
        const selectedProgPoint = labelComponents.find(c => c.component.customId === 'events_sign_up_modal_prog_point')?.component.value;
        const selectedWillingness = labelComponents.find(c => c.component.customId === 'events_sign_up_modal_willingness')?.component.value;

        console.log(selectedRoles, selectedProgPoint, selectedWillingness);

        const pendingSignUp: PendingSignUp = {
            ...pendingSignUps[interaction.user.id],
            roles: selectedRoles,
            progPoint: selectedProgPoint,
            willingness: selectedWillingness,
        }
        pendingSignUps[interaction.user.id] = pendingSignUp;

        const continueBtn = new ButtonBuilder()
            .setCustomId(`events_sign_up_job_btn_${sessionId}`)
            .setLabel('Continue to Job Selection')
            .setStyle(ButtonStyle.Primary);

        await interaction.reply({
            content: '✅ Roles recorded! Please continue to select your jobs.',
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(continueBtn)],
            flags: [MessageFlags.Ephemeral]
        });
    }

    else if (interaction.isButton() && customId.startsWith('events_sign_up_job_btn_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            await interaction.reply({ content: 'Invalid session ID', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const pendingSignUp = pendingSignUps[interaction.user.id];
        if (!pendingSignUp) {
            await interaction.reply({ content: 'Sign up session expired. Please start over.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        await interaction.showModal(buildSignupJobModal(pendingSignUp) as any);
    }

    else if (interaction.isModalSubmit() && customId.startsWith('events_sign_up_job_modal_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            // TODO: ping organizer
            await interaction.reply({ content: 'Invalid session ID', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const labelComponents = interaction.components.filter(c => c.type === ComponentType.Label) as any[];

        const selectedJobs: any[] = [];
        for (const label of labelComponents) {
            if (label.component.customId.startsWith('jobs_') && label.component.values) {
                selectedJobs.push(...label.component.values);
            }
        }

        const pendingSignUp = pendingSignUps[interaction.user.id];
        pendingSignUp.selectedJobs = selectedJobs.map(jobName => createJobWithModifier(jobName as Job, null));
        pendingSignUps[interaction.user.id] = pendingSignUp;

        const continueBtn = new ButtonBuilder()
            .setCustomId(`events_sign_up_confirm_btn_${sessionId}`)
            .setLabel('Continue to Character Selection')
            .setStyle(ButtonStyle.Primary);

        await interaction.reply({
            content: '✅ Jobs recorded! Please continue to select your character.',
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(continueBtn)],
            flags: [MessageFlags.Ephemeral]
        });
    }

    else if (interaction.isButton() && customId.startsWith('events_sign_up_confirm_btn_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            await interaction.reply({ content: 'Invalid session ID', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const pendingSignUp = pendingSignUps[interaction.user.id];
        if (!pendingSignUp) {
            await interaction.reply({ content: 'Sign up session expired. Please start over.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        await interaction.showModal((await buildSignupConfirmationModal(pendingSignUp)) as any);
    }

    else if (interaction.isModalSubmit() && customId.startsWith('events_sign_up_confirmation_modal_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            await interaction.reply({ content: 'Invalid session ID', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const pendingSignUp = pendingSignUps[interaction.user.id];
        if (!pendingSignUp) {
            await interaction.reply({ content: 'Sign up session expired. Please start over.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        if (!pendingSignUp.selectedJobs) {
            await interaction.reply({ content: 'Please select jobs first.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const labelComponents = interaction.components.filter(c => c.type === ComponentType.Label) as any[];
        const characterId = labelComponents.find(c => c.component.customId === 'events_sign_up_character_select')?.component.values?.[0];
        if (!characterId) {
            await interaction.reply({ content: 'Please select a character first.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const willingness = labelComponents.find(c => c.component.customId === 'events_sign_up_willingness')?.component.value;

        const timezoneIana = labelComponents.find(c => c.component.customId === 'timezone')?.component.value;
        const timezone = ianaToLabel(timezoneIana!);
        const from = DateTime.fromFormat(interaction.fields.getTextInputValue('events_sign_up_time_from'), 'HH:mm', { zone: timezoneIana });
        const until = DateTime.fromFormat(interaction.fields.getTextInputValue('events_sign_up_time_until'), 'HH:mm', { zone: timezoneIana });

        if (!from.isValid || !until.isValid) {
            await interaction.reply({ content: 'Invalid time format. Please use the format hour:minute.', flags: [MessageFlags.Ephemeral] });
            return;
        }


        const fromUTC = from.toUTC();
        const untilUTC = until.toUTC();

        pendingSignUp.availableTime = {
            from: fromUTC,
            until: untilUTC,
            timezone: timezone!,
        }
        pendingSignUp.characterId = characterId;
        pendingSignUp.willingness = willingness;
        pendingSignUps[interaction.user.id] = pendingSignUp;

        try {
            await eventService.signUpForSession(sessionId, pendingSignUp);
        } catch (error) {
            console.error('Failed to sign up for session:', error);
            await interaction.reply({ content: 'Failed to sign up for session. Please try again later.', flags: [MessageFlags.Ephemeral] });
            return;
        }

        const character = pendingSignUp.characters!.find(c => c.id === pendingSignUp.characterId);
        if (!character) {
            await interaction.reply({ content: 'Character not found.', flags: [MessageFlags.Ephemeral] });
            return;
        }
        const message = {
            content: `Sign up confirmed!\n\n` +
                `ProgPoint: ${pendingSignUp.progPoint}\n` +
                `Character: ${character.name}\n` +
                `Roles: ${pendingSignUp.roles!.join(', ')}\n` +
                `Jobs: ${pendingSignUp.selectedJobs!.map(job => job.name).join(', ')}\n` +
                `Willingness: ${pendingSignUp.willingness}\n` +
                `Available Time: ${DateTime.now().toLocaleString(DateTime.DATE_MED)} | ${from.toLocaleString(DateTime.TIME_24_SIMPLE)} - ${until.toLocaleString(DateTime.TIME_24_SIMPLE)}\n` +
                `Timezone: ${timezone}`,
            components: [],
            flags: [MessageFlags.Ephemeral]
        }

        await interaction.reply({
            content: message.content,
            components: message.components,
            flags: message.flags as any
        });
        delete pendingSignUps[interaction.user.id];
    }

    else if (customId.startsWith('events_cancel_sign_up_btn_')) {
        const sessionId = customId.split('_').pop();
        if (!sessionId) {
            // TODO: ping organizer
            interaction.reply('Invalid session ID');
            return;
        }
        // await eventService.cancelSignUpForSession(sessionId, interaction.user.id);
        // TODO: actually implement this
        interaction.reply('You have cancelled your sign-up for the session (THIS DOES NOTHING YET :D)');
    }

    else if (customId === 'events_cancel_btn') {
        await interaction.reply({
            content: '‼️ Are you sure you want to cancel this event? ‼️',
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('events_cancel_confirm')
                        .setLabel('💥 Yes 💥')
                        .setStyle(ButtonStyle.Danger),
                ),
            ],
            flags: [MessageFlags.Ephemeral]
        });

    }
}