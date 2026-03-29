import {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
    ButtonInteraction,
    StringSelectMenuInteraction,
    LabelBuilder,
    PermissionFlagsBits,
    ChannelType,
    CategoryChannel,
    Client,
    Guild,
    GuildBasedChannel,
    TextChannel,
    Message,
    ComponentType,
} from 'discord.js'
import { FIGHTS, FIGHTS_ARRAY, getFightName, FIGHTS_WITH_TIERS, FIGHTS_WITH_TIERS_ARRAY, TIERS, getFightsFromTier } from '../data/fights.js';
import { Event, EventSession } from '../generated/prisma/client.js';
import { eventService, EventSessionStatus, EventStatus } from '../services/eventService.js';
import { buildRegisterWithSkip } from './register.js';
import { userService } from '../services/userService.js';
import { client } from '../index.js';
import { buildCreateEventModal, buildEventPanelMessage, buildEventsCreatorPanelMessage, buildEventsHelperPanelMessage, buildSessionOrganizerPanelMessage, buildSessionSignUpPanelMessage } from './eventsPanel.js';
import { dateHelper } from '../utils/generalHelpers.js';
import { error } from 'node:console';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';

export enum TIME_SLOTS {

}


export const data = new SlashCommandBuilder()
    .setName('events')
    .setDescription('Manage events')
    .addSubcommand(sub =>
        sub.setName('create').setDescription('Create a new event'))
    .addSubcommand(sub =>
        sub.setName('edit').setDescription('Edit an existing event'))
    .addSubcommand(sub =>
        sub.setName('close').setDescription('Close an existing event'))
    .addSubcommand(sub =>
        sub.setName('panel').setDescription('Show the organizer panel'))
    .addSubcommand(sub =>
        sub.setName('delete_all_events').setDescription('Delete all events'));


async function validateOrganizer(interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction): Promise<boolean> {
    const userId = interaction.user.id;
    const role = interaction.guild?.roles.cache.find(role => role.name.toLowerCase() === 'organizer');
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!role) {
        await interaction.reply({
            content: 'Organizer role not found.',
            flags: [MessageFlags.Ephemeral],
        });
        return false;
    }

    if (!interaction.guild?.members.cache.get(userId)?.roles.cache.has(role.id) && !isAdmin) {
        await interaction.reply({
            content: 'You do not have permission to perform this action.',
            flags: [MessageFlags.Ephemeral],
        });
        return false;
    }
    return true;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!await validateOrganizer(interaction)) return;

    const subcommand = interaction.options.getSubcommand();

    // -- /events create ----------------------------
    if (subcommand === 'create') {
        await showTierSelection(interaction);
    }

    // -- /events edit -----------------------------
    else if (subcommand === 'edit') {

    }

    // -- /events close ------------------------------
    else if (subcommand === 'close') {

    }

    // -- /events panel ----------------------------
    else if (subcommand === 'panel') {
        await interaction.reply(buildEventPanelMessage());
    }

    // -- /events delete_all_events ----------------
    else if (subcommand === 'delete_all_events') {
        await interaction.reply({
            content: "Deleting all events...",
            flags: [MessageFlags.Ephemeral]
        });
        await deleteAllEvents(interaction);
    }
}

// helpers



export async function showTierSelection(interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    const embed = {
        embeds: [
            new EmbedBuilder()
                .setTitle('Tier Selection')
                .setColor(0x5865F2)
                .setDescription(
                    'Select a tier to create an event for.\n\n' +
                    '⚠️ There is a limit of 25 options on discord, \n\n' +
                    'make sure the tier you selected has less than 25 fights.'
                ),
        ],
        components: [tiersSelection],
    };

    if (interaction.isChatInputCommand()) {
        await interaction.reply({
            ...embed,
            flags: [MessageFlags.Ephemeral],
        });
    } else {
        const isEphemeral = interaction.message.flags.has(MessageFlags.Ephemeral);
        if (isEphemeral) {
            await interaction.update(embed);
        } else {
            await interaction.reply({
                ...embed,
                flags: [MessageFlags.Ephemeral],
            });
        }
    }
}

const tiersSelection = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId('events_create_tier')
        .setPlaceholder('Tier')
        .addOptions(
            TIERS.map(tier =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(tier)
                    .setValue(tier)
            )
        )
)

let selectedFightId: Map<string, string> = new Map();

// handle component
export async function handleComponent(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction): Promise<boolean> {
    if (!await validateOrganizer(interaction)) return false;
    const user = await userService.validateUser(interaction, [buildRegisterWithSkip()]);
    if (!user) {
        return false;
    }

    // -- /events create | button ----------------------------
    // Button handler — just show the tier select
    if (interaction.isButton() && interaction.customId === 'events_create') {
        await showTierSelection(interaction);
        return true;
    }
    // Select handler — tier was chosen, update to show fight select
    else if (interaction.isStringSelectMenu() && interaction.customId === 'events_create_tier') {
        const selectedTier = interaction.values[0];
        const fights = getFightsFromTier(selectedTier);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Fight Selection')
                    .setColor(0x5865F2)
                    .setDescription(
                        'Select a fight to create an event for.\n\n' +
                        'Current Tier: ' + selectedTier + '\n\n' +
                        '⚠️ There is a limit of 25 options on discord, \n\n' +
                        'make sure the tier you selected has less than 25 fights.'
                    ),
            ],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('events_create_fight_id')
                        .setPlaceholder('Fight')
                        .addOptions(fights.map(f =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(f.name)
                                .setValue(f.id)
                        ))
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('events_create')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary)
                )
            ],
        });
        return true;
    }

    // Select handler — fight was chosen, show modal for remaining fields
    else if (interaction.isStringSelectMenu() && interaction.customId === 'events_create_fight_id') {
        const selectedFight = interaction.values[0];
        selectedFightId.set(interaction.user.id, selectedFight);
        await interaction.showModal(await buildCreateEventModal());

        try {
            await interaction.editReply({
                content: `Fight ${selectedFight} selected. Please fill out the form in the modal.`,
                embeds: [],
                components: []
            });
        } catch (error) {
            console.error('Failed to clear the select menu message:', error);
        }
    }

    // -- /events create | modal submit ----------------------------
    else if (interaction.isModalSubmit() && interaction.customId === 'events_create_modal') {
        if (!selectedFightId.has(interaction.user.id)) {
            await interaction.reply({
                content: 'No fight selected.',
                flags: [MessageFlags.Ephemeral],
            });
            return false;
        }



        const description = interaction.fields.getTextInputValue('events_create_description');
        const startDateStr = interaction.fields.getTextInputValue('events_create_start_date');
        const endDateStr = interaction.fields.getTextInputValue('events_create_end_date');
        const snapshotStr = interaction.fields.getTextInputValue('events_create_snapshot');
        const components = (interaction.components as any[])
        const timezoneIana = components.find(c => c.component?.customId === 'events_create_timezone')?.component?.value;
        // Validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
            await interaction.reply({ content: 'Invalid date format. Please use exactly YYYY-MM-DD.', flags: [MessageFlags.Ephemeral] });
            return false;
        }

        const timeRegex = /^\d{2}-\d{2}:\d{2}$/;
        if (!timeRegex.test(snapshotStr)) {
            await interaction.reply({ content: 'Invalid time format. Please use exactly dd-HH:mm.', flags: [MessageFlags.Ephemeral] });
            return false;
        }

        const startDate = DateTime.fromFormat(startDateStr, 'yyyy-MM-dd', { zone: timezoneIana });
        const endDate = DateTime.fromFormat(endDateStr, 'yyyy-MM-dd', { zone: timezoneIana });
        if (!startDate.isValid || !endDate.isValid) {
            await interaction.reply({ content: 'Invalid date. Please enter valid calendar dates.', flags: [MessageFlags.Ephemeral] });
            return false;
        }
        if (endDate < startDate) {
            await interaction.reply({ content: 'End date cannot be before start date.', flags: [MessageFlags.Ephemeral] });
            return false;
        }

        const timeNow = DateTime.now().setZone(timezoneIana);
        const [daysStr, snapshotTime] = snapshotStr.split('-');
        const snapshotDays = parseInt(daysStr);
        const [snapshotHour, snapshotMinute] = snapshotTime.split(':').map(Number);
        const snapshotMoment = startDate.minus({ days: snapshotDays }).set({ hour: snapshotHour, minute: snapshotMinute });

        if (snapshotMoment < timeNow) {
            await interaction.reply({ content: 'Invalid start date. The time snapshot for today has already passed.', flags: [MessageFlags.Ephemeral] });
            return false;
        }


        const fightId = selectedFightId.get(interaction.user.id)!;
        const fightName = getFightName(fightId) || 'Event';

        // Defer reply since channel creation may take a moment
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const organizerRole = interaction.guild!.roles.cache.find(role => role.name.toLowerCase() === 'organizer');

            const permissionOverwrites: any[] = [
                {
                    id: interaction.guildId!,
                    deny: [PermissionFlagsBits.ViewChannel],
                    type: 0 // Role
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                    type: 1 // Member
                }
            ];

            if (organizerRole) {
                permissionOverwrites.push({
                    id: organizerRole.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                    type: 0 // Role
                });
            }

            const categoryName = fightName === 'Event' || fightName.toLowerCase().includes('event')
                ? fightName.substring(0, 100)
                : `${fightName.substring(0, 80)} Event`;

            // Create Discord Category
            const category = await interaction.guild!.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: permissionOverwrites
            });

            // Prepare dates
            const sessionDates: Date[] = [];
            let currentDate = startDate.toUTC();
            while (currentDate <= endDate.toUTC()) {
                if (DateTime.now().toUTC().day - endDate.toUTC().day < 1) {
                    console.log('Skipping date:', currentDate.toFormat('yyyy-MM-dd'));
                    currentDate = currentDate.plus({ days: 1 });
                    continue;
                }
                sessionDates.push(currentDate.toJSDate());
                // Add 1 day safely
                currentDate = currentDate.plus({ days: 1 });
            }

            // Create Event in database
            const event: Event = await eventService.createEvent({
                guildId: interaction.guildId!,
                creatorId: interaction.user.id,
                fightId: fightId,
                categoryId: category.id,
                description: description,
                startDate: startDate.toUTC().toJSDate(),
                endDate: endDate.toUTC().toJSDate(),
            });

            const channelsCreated = await createEventSessions(event, sessionDates, interaction, category, snapshotStr);

            await interaction.editReply({
                content: `Event created successfully. Category <#${category.id}> was generated. ${channelsCreated} session channels were created immediately (remaining will be created 1 day before).`,
            });
            return true;
        } catch (error) {
            console.error('Failed creating event/channels:', error);
            await interaction.editReply({
                content: 'Failed to create event or channels. Please ensure the bot has **Manage Channels** permission and try again.',
            });
            return false;
        }
    }

    // -- /events cancel | button ----------------------------
    else if ((interaction.isButton() || interaction.isChatInputCommand()) && interaction.customId === 'events_cancel') {
        const events: (Event & { eventSessions: EventSession[] })[] = await eventService.getCancellableEvents(interaction.user.id);

        if (events.length === 0) {
            await interaction.reply({
                content: 'No events found.',
                flags: [MessageFlags.Ephemeral],
            });
            return false;
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId('events_cancel_select')
            .setPlaceholder('Select an event to cancel')
            .addOptions(
                events.map(event =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${getEventLabel(event)}`)
                        .setValue(event.id)
                )
            );
        await interaction.reply({
            content: 'Select an event to cancel.',
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            flags: [MessageFlags.Ephemeral],
        });
        return true;
    }
    // -- /events cancel | select ----------------------------
    else if ((interaction.isStringSelectMenu() || interaction.isButton()) && (interaction.customId === 'events_cancel_select' || interaction.customId === 'events_cancel_confirm')) {
        let eventId: string;

        if (interaction.isButton()) {
            const channelId = interaction.channelId;
            const event = await eventService.getEventIdByPanelChannelId(channelId);
            if (!event) {
                await interaction.reply({
                    content: 'Event not found.',
                    flags: [MessageFlags.Ephemeral],
                });
                return false;
            }
            eventId = event.id;
            console.log(`[events] Found event ${eventId} for panel channel ${channelId}`);
        } else {
            eventId = interaction.values[0];
        }
        await interaction.deferUpdate();
        try {
            // Delete session channels and update status to cancelled
            await deleteDiscordSession(interaction.guild!, [eventId], true);
            await eventService.updateEventStatus(eventId, EventStatus.CANCELLED, true);
        } catch (error) {
            console.error('Failed to delete Discord channels for event:', error);
        }
        if (interaction.isStringSelectMenu()) {
            await interaction.editReply({
                content: 'Event and associated channels deleted successfully.',
                components: [],
            });
        }
        return true;
    }
    // -- /events view | button ------------------------------
    else if (interaction.isButton() && interaction.customId === 'events_view') {
        const events = await eventService.getEventsByGuildIds([interaction.guildId!]);
        if (events.length === 0) {
            await interaction.reply({
                content: 'No events found.',
                flags: [MessageFlags.Ephemeral],
            });
            return false;
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId('events_view_select')
            .setPlaceholder('Select an event to view')
            .addOptions(
                events.map(event =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(getFightName(event.fightId) || 'Unknown Fight')
                        .setValue(event.id)
                )
            );
        await interaction.reply({
            content: 'Select an event to view.',
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            flags: [MessageFlags.Ephemeral],
        });
        return true;
    }
    // -- /events view | select ------------------------------
    else if (interaction.isStringSelectMenu() && interaction.customId === 'events_view_select') {
        const eventId = interaction.values[0];
        const event = await eventService.getEventById(eventId);
        if (!event) {
            await interaction.update({ content: 'Event not found.', components: [] });
            return false;
        }
        const embed = new EmbedBuilder()
            .setTitle(`Event: ${getFightName(event.fightId) || 'Unknown'}`)
            .setDescription(event.description)
            .addFields(
                { name: 'Start Date', value: event.startDate.toDateString(), inline: true },
                { name: 'End Date', value: event.endDate.toDateString(), inline: true },
                { name: 'Status', value: event.status, inline: true }
            )
            .setColor(0x5865F2);

        await interaction.update({
            content: '',
            embeds: [embed],
            components: [],
        });
        return true;
    }

    // ─── /events panel | button ─────────────────────────────
    else if (interaction.isButton() && interaction.customId === 'events_panel') {
        const eventId = interaction.message.embeds[0].footer?.text.split(' ')[1];
        if (!eventId) {
            await interaction.reply({ content: 'Event not found.', flags: [MessageFlags.Ephemeral] });
            return false;
        }
        const event = await eventService.getEventById(eventId);
        if (!event) {
            await interaction.reply({ content: 'Event not found.', flags: [MessageFlags.Ephemeral] });
            return false;
        }
        const embed = new EmbedBuilder()
            .setTitle(`Event: ${getFightName(event.fightId) || 'Unknown'}`)
            .setDescription(event.description)
            .addFields(
                { name: 'Start Date', value: event.startDate.toDateString(), inline: true },
                { name: 'End Date', value: event.endDate.toDateString(), inline: true },
                { name: 'Status', value: event.status, inline: true }
            )
            .setColor(0x5865F2);

        await interaction.update({
            content: '',
            embeds: [embed],
            components: [],
        });
        return true;
    }

    return false;
}

async function createEventSessions(
    event: Event,
    sessionDates: Date[],
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    category?: CategoryChannel,
    snapshotStr?: string) {
    if (!category) {
        const tempCategory = await interaction.guild!.channels.fetch(event.categoryId!);
        if (!tempCategory) {
            throw new Error('Category not found');
        }
        category = tempCategory as CategoryChannel;
    }

    // Create channels only for sessions happening within the next 48 hours
    // to avoid hitting Discord's 50 channels per category limit.
    const today = dateHelper.today();
    const maxDay = dateHelper.addDays(today, 1);
    let channelsCreated = 0;

    const creatorPanelChannel = await interaction.guild!.channels.create({
        name: `panel-${getEventLabel(event)}`,
        type: ChannelType.GuildText,
        parent: category.id,
    });
    const organizerPanelMessage = buildEventsCreatorPanelMessage();
    await creatorPanelChannel.send({ ...organizerPanelMessage, flags: [MessageFlags.SuppressNotifications] });
    const helperPanelMessage = buildEventsHelperPanelMessage();
    await creatorPanelChannel.send({ ...helperPanelMessage, flags: [MessageFlags.SuppressNotifications] });
    await eventService.updateEventPanelChannelId(event.id, creatorPanelChannel.id);
    channelsCreated++;

    for (const date of sessionDates) {
        let snapshotAt = dateHelper.addHours(date, -2);
        if (snapshotStr) {
            const [daysStr, snapshotTime] = snapshotStr.split('-');
            const days = parseInt(daysStr);
            const [snapshotHour, snapshotMinute] = snapshotTime.split(':').map(Number);
            snapshotAt = DateTime.fromJSDate(date).minus({ days: days }).set({ hour: snapshotHour, minute: snapshotMinute }).toJSDate();
        }
        let channelId = null;

        let organizerPanelMessageId = null;
        let signupPanelMessageId = null;
        let status = EventSessionStatus.UPCOMING;
        const sessionId = randomUUID();
        if (date <= maxDay) {
            status = EventSessionStatus.OPEN;
            try {
                const { sessionChannel, organizerPanelMessage, signupPanelMessage } = await createSessionChannel(interaction.guild!, category, sessionId, date);
                channelId = sessionChannel.id;
                organizerPanelMessageId = organizerPanelMessage?.id ?? null;
                signupPanelMessageId = signupPanelMessage?.id ?? null;
                channelsCreated++;
            } catch (error) {
                console.log(`[createInitialChannels] Failed to create session channel for event ${event.id} on ${date}: ${error}`);
            }
        }

        await eventService.createEventSession({
            id: sessionId,
            eventId: event.id,
            channelId: channelId,
            date: date,
            status: status,
            snapshotAt: snapshotAt,
            controlPanelMessageId: organizerPanelMessageId,
            signUpPanelId: signupPanelMessageId,
        });
    }
    return channelsCreated;
}

async function createSessionChannel(
    guild: Guild,
    category: CategoryChannel,
    sessionId: string,
    date: Date): Promise<{ sessionChannel: TextChannel, organizerPanelMessage: Message | null, signupPanelMessage: Message | null }> {
    let errors: string[] = [];

    let sessionChannel: TextChannel;
    try {
        sessionChannel = await makeSessionChannel(guild, category, date);
    } catch (error) {
        throw new Error(`[createSessionChannel] Failed to create session channel for event on ${date}: ${error}`);
    }

    let organizerPanelMessage = null;
    try {
        const organizerPanel = buildSessionOrganizerPanelMessage();
        organizerPanelMessage = await sessionChannel.send({ ...organizerPanel, flags: [MessageFlags.SuppressNotifications] });
    } catch (error) {
        errors.push(`[createSessionChannel] Failed to create organizer panel for event on ${date}: ${error}`);
    }

    let signupPanelMessage = null;
    try {
        const signupPanel = buildSessionSignUpPanelMessage(sessionId);
        signupPanelMessage = await sessionChannel.send({ ...signupPanel, flags: [MessageFlags.SuppressNotifications] });
    } catch (error) {
        errors.push(`[createSessionChannel] Failed to create signup panel for event on ${date}: ${error}`);
    }

    return { sessionChannel, organizerPanelMessage, signupPanelMessage };
}

async function makeSessionChannel(guild: Guild, category: CategoryChannel, date: Date) {
    const sessionChannelName = `session-${date.toISOString().split('T')[0]}`;
    const sessionChannel = await guild.channels.create({
        name: sessionChannelName,
        type: ChannelType.GuildText,
        parent: category.id,
    });
    return sessionChannel;
}

export async function createUpcomingEventChannels(
    guild: Guild,
    events: (Event & { eventSessions: EventSession[] })[],
    when: Date = dateHelper.addDays(dateHelper.today(), 2)
): Promise<number> {
    let channelsCreated = 0;
    if (!guild) {
        return 0;
    }

    for (const event of events) {
        for (const session of event.eventSessions.filter(session => session.date.getUTCDate() <= when.getUTCDate())) {
            try {
                if (session.status !== EventSessionStatus.UPCOMING && session.status !== EventSessionStatus.CANCELLED) {
                    if (session.status === EventSessionStatus.OPEN || session.status === EventSessionStatus.CLOSED) {
                        if (dateHelper.isSameDay(session.date, when)) {
                            console.warn(`[createNextDayEventChannels] Session for event ${event.id} on ${when} is already ${session.status}`);
                        }
                        continue;
                    }
                    const err: Error = new Error(`[createNextDayEventChannels] No upcoming session found for event ${event.id} on ${when}`);
                    err.name = 'SessionNotFound';
                    throw err;
                }

                const categoryId = event.categoryId;
                if (!categoryId) {
                    continue;
                }

                let category: CategoryChannel;
                try {
                    category = await guild.channels.fetch(categoryId) as CategoryChannel;
                    if (!category) {
                        continue;
                    }
                } catch (error) {
                    console.log(`[createUpcomingEventChannels] Failed to fetch category for event ${event.id}: ${error}`);
                    continue;
                }

                const { sessionChannel, organizerPanelMessage, signupPanelMessage } = await createSessionChannel(guild, category, session.id, session.date);
                await eventService.updateEventSession(
                    session.id,
                    {
                        ...session,
                        status: EventSessionStatus.OPEN,
                        channelId: sessionChannel.id,
                        snapshotAt: dateHelper.addHours(when, -1),
                        controlPanelMessageId: organizerPanelMessage?.id ?? null,
                        signUpPanelId: signupPanelMessage?.id ?? null,
                    });
                channelsCreated++;
            } catch (error) {
                if (error instanceof Error && error.name === 'SessionNotFound') {
                    console.log(error);
                    continue;
                }
                console.log(`[createNextDayEventChannels] Failed to create session channel for event ${event.id} on ${when}: ${error}`);
            }
        }
    }
    return channelsCreated;
}

async function deleteDiscordSession(
    guild: Guild,
    eventIds?: string[],
    deleteCategory: boolean = false) {
    if (!guild) {
        throw Error("Guild not found");
    }
    const events = eventIds ?
        await eventService.getEventsByIds(eventIds, true)
        : await eventService.getEventsByGuildIds([guild.id], undefined, true);


    if (!events) {
        throw Error("Events not found");
    }

    for (const event of events) {
        if (!event) {
            continue;
        }

        if (!event.categoryId) {
            continue;
        }

        if (!event.eventSessions) {
            continue;
        }

        try {
            for (const session of event.eventSessions) {
                if (
                    session.status === EventSessionStatus.COMPLETED
                    || session.status === EventSessionStatus.CANCELLED
                    || session.status === EventSessionStatus.UPCOMING
                ) {
                    continue;
                }
                if (session.channelId) {
                    await guild.channels.delete(session.channelId).catch((error) => {
                        throw error;
                    });
                }
            }
            if (event.panelChannelId) {
                await guild.channels.delete(event.panelChannelId).catch((error) => {
                    throw error;
                });
            }
            if (deleteCategory) {
                if (event.categoryId) {
                    await guild.channels.delete(event.categoryId).catch((error) => {
                        throw error;
                    });
                }
            }
        } catch (error) {
            console.error('[events] Failed to delete Discord channels:', error);
        }
    }
}

export async function deleteInactiveEventChannels(interaction: StringSelectMenuInteraction | ChatInputCommandInteraction | ButtonInteraction) {
    try {
        const yesterday = dateHelper.yesterday();
        const guild = await interaction.guild?.id;
        if (!guild) {
            return;
        }

        const events = await eventService.getEventByDateAndStatus(yesterday, [EventSessionStatus.OPEN, EventSessionStatus.CLOSED], guild, true);

        for (const event of events) {
            if (guild && event.categoryId) {
                for (const session of event.eventSessions) {
                    if (session.channelId) {
                        const channel = await interaction.guild?.channels.fetch(session.channelId).catch(() => null);
                        if (channel) {
                            await eventService.updateEventSessionStatus([session.id], EventSessionStatus.COMPLETED);
                            await channel.delete();
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('[events] Failed to delete Discord channels for event:', error);
    }
}

function getEventLabel(event: Event) {
    return `${getFightName(event.fightId) || 'Unknown Fight'} - ${event.description.substring(0, 100)}`;
}

async function deleteClosedEvents(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guild?.id;
    if (!guildId) {
        return;
    }
    const closedEvents = await eventService.getEventsByGuildIds([guildId]);
    const eventsToDelete = closedEvents.map(event => event.id);
    eventService.deleteEventById(eventsToDelete);
}

async function deleteAllEvents(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return;
    }
    const guild = interaction.guild?.id;
    if (!guild) {
        return;
    }
    // interaction.deferReply();
    const allEvents = await eventService.getEventsByGuildIds([guild]);
    if (allEvents.length === 0) {
        interaction.editReply("No events found.");
        return;
    }
    const eventsToDelete = allEvents.map(event => event.id);
    await deleteDiscordSession(interaction.guild!, eventsToDelete, true);
    await eventService.deleteEventById(eventsToDelete);
    interaction.editReply("All events deleted.");
}

export async function endSessions(sessions: EventSession[], guildId: string) {
    const sessionIds = sessions.map(session => session.id);
    if (sessionIds.length === 0) {
        return;
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        return;
    }

    // TODO: check if we should delete the channels or update the channel to reflect that the session is over
    for (const session of sessions) {
        if (session.channelId) {
            const channel = await guild.channels.fetch(session.channelId).catch(() => null);
            if (channel) {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error(`[events] Failed to delete Discord channels for session: ${session.id}`, error);
                }
            }
        }
    }

    try {
        await eventService.updateEventSessionStatus(sessionIds, EventSessionStatus.COMPLETED);
    } catch (error) {
        console.error(`[events] Failed to update event session status for sessions: ${sessionIds}`, error);
    }
}

export async function startSessions(events: (Event & { eventSessions: EventSession[] })[], guildId: string) {
    try {
        let guild: Guild | null = null;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            console.error(`[events] Failed to fetch guild ${guildId}`, error);
        }
        if (!guild) {
            return;
        }

        await createUpcomingEventChannels(guild, events);
    } catch (error) {
        console.error(`[events] Failed to start sessions for guild ${guildId}`, error);
    }
}
