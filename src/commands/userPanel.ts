import {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '../index.js';

// ─── Panel message builder ────────────────────────────────────────────────────

export function buildUserPanelMessage() {
    const embed = new EmbedBuilder()
        .setTitle('👤 Player Panel')
        .setColor(0x5865F2)
        .setDescription(
            'Use the buttons below to manage your FFXIV characters registration.\n\n' +
            // '📋 **Register** — Link your FFXIV character to your Discord account.\n' +
            '➕ **Add Character** — Link a character to your profile.\n' +
            '➖ **Remove Character** — Remove a character from your profile.\n' +
            '🔍 **View Profile** — View your registered characters.\n' +
            '🗑️ **Unregister** — Delete your profile and all character links.',
        );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('register_add_character_btn') // reuses existing handler
            .setLabel('Add Character')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('register_delete_character_btn') // reuses existing handler
            .setLabel('Remove Character')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('panel_view_profile_btn')
            .setLabel('View Profile')
            .setEmoji('🔍')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('panel_unregister_btn')
            .setLabel('Unregister')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row] };
}

// ─── Button handlers ──────────────────────────────────────────────────────────

export async function handlePanelInteraction(interaction: ButtonInteraction): Promise<boolean> {
    // ── Register button — starts the same lodestone modal flow ───────────
    if (interaction.customId === 'panel_register_btn') {
        const existing = await prisma.user.findUnique({
            where: { id: interaction.user.id },
            include: { characters: true },
        });

        if (existing) {
            const charInfo = existing.characters.length > 0
                ? `\n**Characters:** ${existing.characters.map(c => `${c.name} @ ${c.world}`).join(', ')}`
                : '';
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Already Registered')
                        .setColor(0x5865F2)
                        .setDescription(`You already have a profile.${charInfo}`),
                ],
                flags: [MessageFlags.Ephemeral],
            });
            return true;
        }

        // Delegate to register flow by triggering the modal directly
        // The modal submit handler in register.ts will handle the rest
        const { ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } = await import('discord.js');
        const modal = new ModalBuilder()
            .setCustomId('register_lodestone_modal')
            .setTitle('Link your FFXIV Character');

        const urlInput = new TextInputBuilder()
            .setCustomId('lodestone_url')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://na.finalfantasyxiv.com/lodestone/character/12345678/')
            .setRequired(true);

        const urlLabel = new LabelBuilder()
            .setLabel('Lodestone Character URL')
            .setTextInputComponent(urlInput);

        modal.addLabelComponents(urlLabel);
        await interaction.showModal(modal);
        return true;
    }

    // ── View Profile button ───────────────────────────────────────────────
    if (interaction.customId === 'panel_view_profile_btn') {
        const user = await prisma.user.findUnique({
            where: { id: interaction.user.id },
            include: { characters: true },
        });

        if (!user) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Not Registered')
                        .setColor(0xED4245)
                        .setDescription('You don\'t have a profile yet. Link a character first.'),
                ],
                flags: [MessageFlags.Ephemeral],
            });
            return true;
        }

        const charList = user.characters.length > 0
            ? user.characters.map(c => `• **${c.name}** @ ${c.world}`).join('\n')
            : '*No characters linked.*';

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Your Profile')
                    .setColor(0x5865F2)
                    .addFields(
                        { name: 'Discord', value: `<@${user.id}>`, inline: true },
                        { name: 'Characters', value: charList },
                    ),
            ],
            flags: [MessageFlags.Ephemeral],
        });
        return true;
    }

    // ── Unregister button — confirmation prompt ───────────────────────────
    if (interaction.customId === 'panel_unregister_btn') {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('⚠️ Confirm Unregister')
                    .setColor(0xED4245)
                    .setDescription('This will delete your profile and all linked characters. This **cannot be undone**.\n\nAre you sure?'),
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('panel_unregister_confirm_btn')
                        .setLabel('Yes, Unregister Me')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('panel_unregister_cancel_btn')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary),
                ),
            ],
            flags: [MessageFlags.Ephemeral],
        });
        return true;
    }

    // ── Unregister confirm ────────────────────────────────────────────────
    if (interaction.customId === 'panel_unregister_confirm_btn') {
        try {
            const user = await prisma.user.findUnique({ where: { id: interaction.user.id }, include: { characters: true } });

            if (!user || user.toBeDeleted) {
                await interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Not Registered')
                            .setColor(0xED4245)
                            .setDescription('You don\'t have a profile yet. Link a character first.'),
                    ],
                    components: [],
                });
                return true;
            }

            await prisma.user.update({
                where: { id: interaction.user.id },
                data: { toBeDeleted: true },
            });
            await prisma.character.deleteMany({
                where: { userId: interaction.user.id },
            });

            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Unregistered')
                        .setColor(0xED4245)
                        .setDescription('Your profile and all linked characters have been deleted.'),
                ],
                components: [],
            });
        } catch (err) {
            console.error('[userpanel] Unregister error:', err);
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Error')
                        .setColor(0xED4245)
                        .setDescription('Could not unregister. You may not have a profile to delete.'),
                ],
                components: [],
            });
        }
        return true;
    }

    // ── Unregister cancel ─────────────────────────────────────────────────
    if (interaction.customId === 'panel_unregister_cancel_btn') {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Cancelled')
                    .setColor(0x5865F2)
                    .setDescription('Unregister cancelled.'),
            ],
            components: [],
        });
        return true;
    }

    return false; // not handled by this module
}

// ─── Slash command ────────────────────────────────────────────────────────────

export const data = new SlashCommandBuilder()
    .setName('userpanel')
    .setDescription('Post the user registration panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

    await interaction.reply(buildUserPanelMessage());
}