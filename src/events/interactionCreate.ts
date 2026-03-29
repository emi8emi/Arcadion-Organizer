import { Events, MessageFlags, Interaction, Client, CacheType, ChannelType } from 'discord.js';

import * as pveCommand from '../commands/pve.js';
import * as registerCommand from '../commands/register.js';
import * as userPanelCommand from '../commands/userPanel.js';
import * as eventsCommand from '../commands/events.js';
import * as eventsPanelCommand from '../commands/eventsPanel.js';
import { userService } from '../services/userService.js';

// IDs that belong to the pve UI flow
const PVE_COMPONENT_IDS = [
    'pve_select_fight',
    'pve_select_prog',
    'pve_confirm',
    'pve_cancel',
];

const REGISTER_COMPONENT_IDS = [
    'register_lodestone_modal',
    'register_verify',
    'register_cancel',
    'register_skip_btn',
    'register_add_character_btn',
    'register_delete_character_btn',
    'register_delete_character_select',
];

const USERPANEL_COMPONENT_IDS = [
    'panel_view_profile_btn',
    'panel_unregister_btn',
    'panel_unregister_confirm_btn',
    'panel_unregister_cancel_btn',
];

const EVENTS_COMPONENT_IDS = [
    'events_create',
    'events_create_tier',
    'events_create_fight_id',
    'events_create_modal',
    'events_cancel',
    'events_cancel_confirm',
    'events_cancel_select',
    'events_edit',
    'events_close',
    'delete_all_events'
];

const EVENTS_PANEL_COMPONENT_IDS = [
    'events_panel_party',
    'events_cancel_btn',
    'events_sign_up_btn_',
    'events_sign_up_role_select_',
    'events_sign_up_modal_',
    'events_sign_up_job_btn_',
    'events_sign_up_job_modal_',
    'events_sign_up_confirm_btn_',
    'events_sign_up_confirmation_modal_'
];

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction<CacheType>, client: Client) {

        // ── Autocomplete ─────────────────────────────────────────────────────
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error('Autocomplete error:', error);
            }
            return;
        }

        // ── Slash commands ───────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                }
            }
            return;
        }

        // ── Register components (buttons / select menus) ────────────────────
        if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && REGISTER_COMPONENT_IDS.includes(interaction.customId)) {
            try {
                await registerCommand.handleComponent(interaction);
            } catch (err) {
                console.error('[register]', err);
                const msg = { content: '❌ Something went wrong.', flags: [MessageFlags.Ephemeral] } as const;
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
            }
            return;
        }

        // ── User Panel components (buttons / select menus) ────────────────────
        if ((interaction.isButton() || interaction.isStringSelectMenu()) && USERPANEL_COMPONENT_IDS.includes(interaction.customId)) {
            try {
                await userPanelCommand.handlePanelInteraction(interaction as any);
            } catch (err) {
                console.error('[user panel]', err);
                const msg = { content: '❌ Something went wrong.', flags: [MessageFlags.Ephemeral] } as const;
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg as any);
            }
            return;
        }

        // ── Event components (buttons / select menus / modal submits) ────────────────────
        if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && EVENTS_COMPONENT_IDS.includes(interaction.customId)) {
            try {
                await eventsCommand.handleComponent(interaction as any);
            } catch (err) {
                console.error('[events]', err);
                const msg = { content: '❌ Something went wrong.', flags: [MessageFlags.Ephemeral] } as const;
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
            }
            return;
        }

        // ── Event panel components (buttons / select menus / modal submits) ────────────────────
        if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && EVENTS_PANEL_COMPONENT_IDS.some(id => interaction.customId.startsWith(id))) {
            try {
                await eventsPanelCommand.handleComponent(interaction as any);
            } catch (err) {
                console.error('[events panel]', err);
                const msg = { content: '❌ Something went wrong.', flags: [MessageFlags.Ephemeral] } as const;
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
            }
            return;
        }

        // ── PvE UI components (select menus + buttons) ───────────────────────
        if (
            (interaction.isStringSelectMenu() || interaction.isButton()) &&
            (PVE_COMPONENT_IDS.includes(interaction.customId))
        ) {
            try {
                await pveCommand.handleComponent(interaction);
            } catch (err) {
                console.error('[pve component]', err);
                const msg = { content: '❌ Something went wrong.', flags: [MessageFlags.Ephemeral] } as const;
                interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
            }
            return;
        }
    },
};

