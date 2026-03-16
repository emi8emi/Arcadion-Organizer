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
} from 'discord.js'
import { FIGHTS, FIGHTS_ARRAY, getFightName, FIGHTS_WITH_TIERS, FIGHTS_WITH_TIERS_ARRAY, TIERS, getFightsFromTier } from '../data/fights.js';
import { Event, EventSession } from '../generated/prisma/client.js';
import { eventService, EventSessionStatus, EventStatus } from '../services/eventService.js';
import { buildRegisterWithSkip } from './register.js';
import { userService } from '../services/userService.js';
import { client } from '../index.js';


export const data = new SlashCommandBuilder()
    .setName('events')
    .setDescription('Manage events')
    .addSubcommand(sub =>
        sub.setName('create').setDescription('Create a new event'))
    .addSubcommand(sub =>
        sub.setName('edit').setDescription('Edit an existing event'))
    .addSubcommand(sub =>
        sub.setName('end').setDescription('End an existing event'))
    .addSubcommand(sub =>
        sub.setName('panel').setDescription('Show the organizer panel'));


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

    // -- /events end ------------------------------
    else if (subcommand === 'end') {

    }

    // -- /events panel ----------------------------
    else if (subcommand === 'panel') {
        await interaction.reply(buildEventPanelMessage());
    }
}

// helpers

function buildEventPanelMessage() {
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


// ignore this for now
function buildCreateEventModal() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

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
        .setValue(formatDate(today))
        .setRequired(true);

    const startDateLabel = new LabelBuilder()
        .setLabel('Start Date')
        .setTextInputComponent(startDateInput);

    const endDateInput = new TextInputBuilder()
        .setCustomId('events_create_end_date')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YYYY-MM-DD')
        .setValue(formatDate(tomorrow))
        .setRequired(true);

    const endDateLabel = new LabelBuilder()
        .setLabel('End Date')
        .setTextInputComponent(endDateInput);

    modal.addLabelComponents(startDateLabel, endDateLabel);

    return modal;
}

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
        const events = await eventService.getEvents({
            guildId: interaction.guildId!,
            creatorId: interaction.user.id,
            status: EventStatus.OPEN,
        });

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

        const event = await eventService.getEventById(eventId, true);

        if (!event) {
            await interaction.editReply({
                content: 'Event not found.',
                components: [],
            });
            return false;
        }

        try {
            // Delete session channels and update status to cancelled
            await deleteInactiveEventChannels(true, [eventId]);

            // Delete category channel
            // if (event.categoryId) {
            //     const category = await interaction.guild?.channels.fetch(event.categoryId).catch(() => null);
            //     if (category) {
            //         await category.delete();
            //     }
            // }
        } catch (error) {
            console.error('Failed to delete Discord channels for event:', error);
        }

        await eventService.deleteEventById(eventId);

        await interaction.editReply({
            content: 'Event and associated channels deleted successfully.',
            components: [],
        });
        return true;
    }
    // -- /events view | button ------------------------------
    else if (interaction.isButton() && interaction.customId === 'events_view') {
        const events = await eventService.getEvents({
            guildId: interaction.guildId!,
        });
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

async function createInitialChannels(event: Event, sessionDates: Date[], interaction: ChatInputCommandInteraction | ModalSubmitInteraction, category?: CategoryChannel) {
    if (!category) {
        const tempCategory = await interaction.guild!.channels.fetch(event.categoryId!);
        if (!tempCategory) {
            throw new Error('Category not found');
        }
        category = tempCategory as CategoryChannel;
    }

    // Create channels only for sessions happening within the next 48 hours
    // to avoid hitting Discord's 50 channels per category limit.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fortyEightHoursFromNow = new Date(today.getTime() + (48 * 60 * 60 * 1000));
    let channelsCreated = 0;

    const creatorPanel = await interaction.guild!.channels.create({
        name: `panel-${getEventLabel(event)}`,
        type: ChannelType.GuildText,
        parent: category.id,
    });

    for (const date of sessionDates) {
        const snapshotAt = new Date(today.getTime() - (2 * 60 * 60 * 1000));
        let channelId = null;

        if (date <= fortyEightHoursFromNow) {
            const sessionChannelName = `session-${date.toISOString().split('T')[0]}`;
            const sessionChannel = await interaction.guild!.channels.create({
                name: sessionChannelName,
                type: ChannelType.GuildText,
                parent: category.id,
            });
            channelId = sessionChannel.id;
            channelsCreated++;
        }

        await eventService.createEventSession({
            eventId: event.id,
            channelId: channelId,
            date: date,
            snapshotAt: snapshotAt,
        });
    }
    return channelsCreated;
}

export async function createEventChannels(client: Client) {
    const today: Date = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));

    const events = await eventService.getActiveEvents();

    const sessions = await eventService.getActiveEventSessions(events.map(event => event.id));

    for (const event of events) {
        const guild = await client.guilds.fetch(event.guildId);
        if (!guild) {
            continue;
        }
        const category = await guild.channels.fetch(event.categoryId!);
        if (!category) {
            continue;
        }
        if (sessions.filter(session => session.eventId === event.id).length !== 0) {
            continue;
        }


        const sessionChannelName = `session-${today.toISOString().split('T')[0]}`;
        const sessionChannel = await guild.channels.create({
            name: sessionChannelName,
            type: ChannelType.GuildText,
            parent: category.id,
        });
        await eventService.createEventSession({
            eventId: event.id,
            channelId: sessionChannel.id,
            date: today,
            snapshotAt: event.snapshotAt ?? new Date(today.getTime() - (24 * 60 * 60 * 1000)),
        });

    }

}

export async function deleteInactiveEventChannels(cancel: boolean = false, eventIds?: string[]) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));

        const status = cancel ? EventSessionStatus.CANCELLED : EventSessionStatus.COMPLETED;
        const rawEvents = await eventService.getEventsByStatus([EventStatus.CLOSED, EventStatus.OPEN, EventStatus.CANCELLED]);
        const events = eventIds ? rawEvents.filter(event => eventIds.includes(event.id)) : rawEvents;

        const rawSessions = await eventService.getActiveEventSessionByStatus(events.map(event => event.id), [EventSessionStatus.CLOSED, EventSessionStatus.OPEN]);
        const openSessions = rawSessions.filter(session => session.status === EventSessionStatus.OPEN && session.date < yesterday);
        const closedSessions = rawSessions.filter(session => session.status === EventSessionStatus.CLOSED && session.date < yesterday);
        const sessionsToUpdate = cancel ? rawSessions : [...openSessions, ...closedSessions];

        for (const event of events) {
            const guild = await client.guilds.fetch(event.guildId);
            if (guild && event.categoryId) {
                for (const session of sessionsToUpdate.filter(session => session.eventId === event.id)) {
                    if (session.channelId) {
                        const channel = await guild.channels.fetch(session.channelId).catch(() => null);
                        if (channel) {
                            await eventService.updateEventSessionStatus(session.id, status);
                            await channel.delete();
                        }
                    }
                }
            }
            if (cancel && event.status === EventStatus.OPEN) {
                await eventService.updateEvent(event.id, { ...event, status: EventStatus.CANCELLED });
            }
        }
    } catch (error) {
        console.error('Failed to delete Discord channels for event:', error);
    }
}

function getEventLabel(event: Event) {
    return `${getFightName(event.fightId) || 'Unknown Fight'} - ${event.description.substring(0, 100)}`;
}
