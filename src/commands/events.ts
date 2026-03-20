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
} from 'discord.js'
import { FIGHTS, FIGHTS_ARRAY, getFightName, FIGHTS_WITH_TIERS, FIGHTS_WITH_TIERS_ARRAY, TIERS, getFightsFromTier } from '../data/fights.js';
import { Event, EventSession } from '../generated/prisma/client.js';
import { eventService, EventSessionStatus, EventStatus } from '../services/eventService.js';
import { buildRegisterWithSkip } from './register.js';
import { userService } from '../services/userService.js';
import { client } from '../index.js';
import { buildCreateEventModal, buildEventPanelMessage, buildEventsCreatorPanelMessage, buildSessionOrganizerPanelMessage, buildSessionSignUpPanelMessage } from './eventsPanel.js';
import { dateHelper } from '../utils/generalHelpers.js';
import { error } from 'node:console';

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
                                .setValue(f.value)
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
        await interaction.showModal(buildCreateEventModal());

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

        // Validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
            await interaction.reply({ content: 'Invalid date format. Please use exactly YYYY-MM-DD.', flags: [MessageFlags.Ephemeral] });
            return false;
        }

        const startDate = new Date(`${startDateStr}T00:00:00Z`);
        const endDate = new Date(`${endDateStr}T00:00:00Z`);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            await interaction.reply({ content: 'Invalid date. Please enter valid calendar dates.', flags: [MessageFlags.Ephemeral] });
            return false;
        }
        if (endDate < startDate) {
            await interaction.reply({ content: 'End date cannot be before start date.', flags: [MessageFlags.Ephemeral] });
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
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                sessionDates.push(new Date(currentDate));
                // Add 1 day safely
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }

            // Create Event in database
            const event: Event = await eventService.createEvent({
                guildId: interaction.guildId!,
                creatorId: interaction.user.id,
                fightId: fightId,
                categoryId: category.id,
                description: description,
                startDate: startDate,
                endDate: endDate,
            });

            const channelsCreated = await createInitialChannels(event, sessionDates, interaction, category);

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
    else if (interaction.isStringSelectMenu() && interaction.customId === 'events_cancel_select') {
        const eventId = interaction.values[0];

        await interaction.deferUpdate();

        try {
            // Delete session channels and update status to cancelled
            await deleteChannels(interaction, [eventId], true);
            await eventService.updateEventStatus(eventId, EventStatus.CANCELLED, true);
        } catch (error) {
            console.error('Failed to delete Discord channels for event:', error);
        }

        await interaction.editReply({
            content: 'Event and associated channels deleted successfully.',
            components: [],
        });
        return true;
    }
    // -- /events view | button ------------------------------
    else if (interaction.isButton() && interaction.customId === 'events_view') {
        const events = await eventService.getEventsByGuildId(interaction.guildId!);
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

    return false;
}

async function createInitialChannels(
    event: Event,
    sessionDates: Date[],
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    category?: CategoryChannel) {
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
    const fortyEightHoursFromNow = dateHelper.addHours(today, 48);
    let channelsCreated = 0;

    const creatorPanel = await interaction.guild!.channels.create({
        name: `panel-${getEventLabel(event)}`,
        type: ChannelType.GuildText,
        parent: category.id,
    });
    const message = buildEventsCreatorPanelMessage();
    await creatorPanel.send({ ...message, flags: [MessageFlags.SuppressNotifications] });
    await eventService.updateEventPanelChannelId(event.id, creatorPanel.id);
    channelsCreated++;

    await Promise.all(sessionDates.map(async (date) => {
        const snapshotAt = dateHelper.addHours(today, -2);
        let channelId = null;

        let organinzerPanelMessageId = null;
        let signupPanelMessageId = null;
        if (date <= fortyEightHoursFromNow) {
            const { sessionChannel, organinzerPanelMessage, signupPanelMessage } = await buildSessionChannel(interaction, category, date);
            channelId = sessionChannel.id;
            organinzerPanelMessageId = organinzerPanelMessage.id;
            signupPanelMessageId = signupPanelMessage.id;
            channelsCreated++;
        }

        await eventService.createEventSession({
            eventId: event.id,
            channelId: channelId,
            date: date,
            snapshotAt: snapshotAt,
            controlPanelMessageId: organinzerPanelMessageId,
            signUpPanelId: signupPanelMessageId,
        });
    }));
    return channelsCreated;
}

async function buildSessionChannel(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction,
    category: CategoryChannel,
    date: Date): Promise<{ sessionChannel: TextChannel, organinzerPanelMessage: Message, signupPanelMessage: Message }> {
    const sessionChannel = await createSessionChannel(interaction.guild!, category, date);

    const organinzerPanel = buildSessionOrganizerPanelMessage();
    const organinzerPanelMessage = await sessionChannel.send({ ...organinzerPanel, flags: [MessageFlags.SuppressNotifications] });

    const signupPanel = buildSessionSignUpPanelMessage();
    const signupPanelMessage = await sessionChannel.send({ ...signupPanel, flags: [MessageFlags.SuppressNotifications] });
    return { sessionChannel, organinzerPanelMessage, signupPanelMessage };
}

async function createSessionChannel(guild: Guild, category: CategoryChannel, date: Date) {
    const sessionChannelName = `session-${date.toISOString().split('T')[0]}`;
    const sessionChannel = await guild.channels.create({
        name: sessionChannelName,
        type: ChannelType.GuildText,
        parent: category.id,
    });
    return sessionChannel;
}

export async function createNextDayEventChannels(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction,
    events: Event[],
    when: Date = dateHelper.addDays(dateHelper.tomorrow(), 1)
): Promise<number> {
    let channelsCreated = 0;
    const guild = interaction.guild;
    if (!guild) {
        return 0;
    }

    await Promise.all(events.map(async (event) => {
        const categoryId = event.categoryId;
        if (!categoryId) {
            return;
        }
        const category = await guild.channels.fetch(categoryId) as CategoryChannel;
        if (!category) {
            return;
        }

        const { sessionChannel, organinzerPanelMessage, signupPanelMessage } = await buildSessionChannel(interaction, category, when);
        await eventService.createEventSession({
            eventId: event.id,
            channelId: sessionChannel.id,
            date: when,
            snapshotAt: dateHelper.addHours(when, -2),
            controlPanelMessageId: organinzerPanelMessage.id,
            signUpPanelId: signupPanelMessage.id,
        });
        channelsCreated++;
    }));
    return channelsCreated;
}

async function deleteChannels(
    interaction: StringSelectMenuInteraction | ChatInputCommandInteraction | ButtonInteraction,
    eventIds?: string[],
    deleteCategory: boolean = false) {
    const guild: Guild | null = interaction.guild;
    if (!guild) {
        throw Error("Guild not found");
    }
    const events = eventIds ?
        await eventService.getEventsByIds(eventIds, true)
        : await eventService.getEventsByGuildId(guild.id, true);


    if (!events) {
        throw Error("Events not found");
    }

    for (const event of events) {
        if (!event) {
            throw Error("Event not found");
        }

        if (!event.categoryId) {
            return;
        }

        try {
            await Promise.all(event.eventSessions.map(async (session) => {
                if (session.channelId) {
                    await guild.channels.delete(session.channelId).catch((error) => {
                        if (error.code === 10003) {
                            return null;
                        }
                        throw error;
                    });
                }
            }));
            if (event.panelChannelId) {
                await guild.channels.delete(event.panelChannelId).catch((error) => {
                    if (error.code === 10003) {
                        return null;
                    }
                    throw error;
                });
            }
            if (deleteCategory) {
                if (event.categoryId) {
                    await guild.channels.delete(event.categoryId).catch((error) => {
                        if (error.code === 10003) {
                            return null;
                        }
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
                            await eventService.updateEventSessionStatus(session.id, EventSessionStatus.COMPLETED);
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
    const closedEvents = await eventService.getEventsByGuildId(guildId);
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
    const allEvents = await eventService.getEventsByGuildId(guild);
    if (allEvents.length === 0) {
        interaction.editReply("No events found.");
        return;
    }
    const eventsToDelete = allEvents.map(event => event.id);
    await deleteChannels(interaction, eventsToDelete, true);
    await eventService.deleteEventById(eventsToDelete);
    interaction.editReply("All events deleted.");
}