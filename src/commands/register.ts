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
} from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { formatRank } from '../data/rankings';
import { prisma } from '../index.js';
import { getCanonicalId } from '../utils/fflogs';
import { Character } from '../generated/prisma/client';

interface PendingVerification {
    lodestoneUrl: string;
    characterId: string;
    verificationKey: string;
}

// Pending verifications: userId -> { lodestoneUrl, characterId, verificationKey }
const pendingVerifications: Record<string, PendingVerification> = {};

// ─── Lodestone scraper ────────────────────────────────────────────────────────

/**
 * Fetches a Lodestone character page and returns { name, world, bio } or throws.
 * @param {string} lodestoneUrl  e.g. https://na.finalfantasyxiv.com/lodestone/character/12345678/
 */
async function fetchLodestoneCharacter(lodestoneUrl: string): Promise<{ name: string; world: string; bio: string }> {
    const res = await fetch(lodestoneUrl, {
        headers: {
            // Mimic a real browser to reduce chance of being blocked
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    if (!res.ok) throw new Error(`Lodestone returned HTTP ${res.status}.`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $('p.frame__chara__name').first().text().trim();
    const world = $('p.frame__chara__world').first().text().trim()
        .replace(/\s*\[.*?\]/, ''); // strip datacenter, e.g. "Behemoth [Primal]" -> "Behemoth"
    const bio = $('div.character__selfintroduction').first().text().trim();

    if (!name) throw new Error('Could not find character on that Lodestone page. Is the URL correct?');

    return { name, world, bio };
}

/**
 * Extracts and validates a Lodestone character URL.
 * Returns the canonical URL, or null if invalid.
 */
function parseLodestoneUrl(input: string): { url: string; characterId: string } | null {
    try {
        const url = new URL(input.trim());
        const match = url.pathname.match(/^\/lodestone\/character\/(\d+)\/?$/);
        if (!match) return null;
        // Normalise to a clean URL regardless of region subdomain
        return { url: `${url.origin}/lodestone/character/${match[1]}/`, characterId: match[1] };
    } catch {
        return null;
    }
}

/** Generate a short random verification key */
function generateVerificationKey(): string {
    // return 'AYO-' + randomBytes(4).toString('hex').toUpperCase();

    // TODO USE THE RANDOM VALUE AFTER TESTS
    return "AYO-9T9CWR";
}

async function unregisterUser(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    try {
        await prisma.user.delete({
            where: { id: interaction.user.id },
        });
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('You have been un-registered.')
                    .setColor(0xED4245)
                    .setDescription('You no longer have a character registered.'),
            ],
            components: [],
        });
    } catch (err) {
        console.error('[register] Un-register error:', err);
    }
}

async function deleteCharacter(interaction: ButtonInteraction | StringSelectMenuInteraction, characterIds: string[]): Promise<void> {
    try {
        await prisma.character.deleteMany({
            where: { id: { in: characterIds } },
        });
        const characters = await prisma.character.findMany({
            where: { userId: interaction.user.id },
        });

        if (characters.length === 0) {
            return unregisterUser(interaction);
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Character Deleted')
                    .setColor(0xED4245)
                    .setDescription('Your character has been deleted.'),
            ],
            components: [],
        });
    } catch (err) {
        console.error('[register] Delete character error:', err);
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Error Deleting Character')
                    .setColor(0xED4245)
                    .setDescription('Could not delete character. Please try again.'),
            ],
            components: [],
        });
    }
}


function buildAddOrDeleteCharacterSelect(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('register_add_character_btn')
            .setLabel('Add Character')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('register_delete_character_btn')
            .setLabel('Delete Character')
            .setStyle(ButtonStyle.Danger),
    );
}

function buildDeleteCharacterSelect(characters: Character[]): ActionRowBuilder<StringSelectMenuBuilder> {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('register_delete_character_select')
        .setPlaceholder('Select a character to delete...')
        .addOptions(
            characters.map(char =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${char.name} @ ${char.world}`)
                    .setValue(char.id)
            )
        )
        .setMinValues(1)
        .setMaxValues(characters.length);
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
// ─── Module export ────────────────────────────────────────────────────────────

export const data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your FFXIV character for MMR matchmaking.');

// ─── Slash command entry ──────────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Already registered?
    const existing = await prisma.user.findUnique({
        where: { id: interaction.user.id },
        include: { characters: true },
    });

    if (existing) {
        const characters = existing.characters;
        const charInfo = characters.length > 0 ? `\n**Characters:** ${characters.map((char: { name: any; world: any; }) => `${char.name} @ ${char.world}`).join(', ')}` : '';
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Already Registered')
                    .setColor(0x5865F2)
                    .setDescription(
                        `You already have a profile.${charInfo}\n\n` +
                        `\n\n**Click the button below to add or delete a character.**`
                    ),
            ],
            components: [buildAddOrDeleteCharacterSelect()],
            flags: [MessageFlags.Ephemeral],
        });
        return;
    }

    // Open a modal to collect the Lodestone URL
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
        .setTextInputComponent(urlInput)

    modal.addLabelComponents(urlLabel);
    await interaction.showModal(modal);
}

// ─── Component / modal handler ────────────────────────────────────────────
export async function handleComponent(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction): Promise<void> {
    const userId = interaction.user.id;

    // ── Step 1: Modal submitted — validate URL, issue verification key ───
    if (interaction.isModalSubmit() && interaction.customId === 'register_lodestone_modal') {
        const raw = interaction.fields.getTextInputValue('lodestone_url');
        const parsed = parseLodestoneUrl(raw);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Checking your lodestone...')
                    .setColor(0x57F287)
                    .setDescription(
                        'Please wait...'
                    ),
            ],
            components: [],
        });

        if (!parsed) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Invalid URL')
                        .setColor(0xED4245)
                        .setDescription(
                            'That doesn\'t look like a valid Lodestone character URL.\n\n' +
                            'It should look like:\n`https://na.finalfantasyxiv.com/lodestone/character/12345678/`'
                        ),
                ],
                flags: [MessageFlags.Ephemeral],
            });
            return;
        }

        const verificationKey = generateVerificationKey();
        pendingVerifications[userId] = {
            lodestoneUrl: parsed.url,
            characterId: parsed.characterId,
            verificationKey,
        };

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Verify Your Character — Step 2 of 2')
                    .setColor(0xFEE75C)
                    .setDescription(
                        '**To confirm this character belongs to you:**\n\n' +
                        `1. Go to your [Lodestone profile](${parsed.url})\n` +
                        `2. Click **Edit Profile** and paste the key below into your **Character Profile** (bio) field\n` +
                        `3. Save, then press **Verify** below\n\n` +
                        `> You can remove the key from your bio after verification.`
                    )
                    .addFields({ name: 'Your Verification Key', value: `\`\`\`${verificationKey}\`\`\`` }),
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('register_verify')
                        .setLabel('✅ Verify')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('register_cancel')
                        .setLabel('✖ Cancel')
                        .setStyle(ButtonStyle.Danger),
                ),
            ],
            flags: [MessageFlags.Ephemeral],
        });
    }

    // ── Step 2: Verify button — scrape Lodestone and check for the key ───
    else if (interaction.isButton() && interaction.customId === 'register_verify') {
        await interaction.deferUpdate();

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Registering Character...')
                    .setColor(0x57F287)
                    .setDescription(
                        'Please wait while we register your character...'
                    ),
            ],
            components: [],
        });

        const session = pendingVerifications[userId];
        if (!session) {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Session Expired')
                        .setColor(0xED4245)
                        .setDescription('Your session expired. Please run `/register` again.'),
                ],
                components: [],
            });
            return;
        }

        // await interaction.deferUpdate();

        try {
            const { name, world, bio } = await fetchLodestoneCharacter(session.lodestoneUrl);

            if (!bio.includes(session.verificationKey)) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Verification Failed')
                            .setColor(0xED4245)
                            .setDescription(
                                `The key \`${session.verificationKey}\` was **not found** in **${name}**'s profile bio.\n\n` +
                                `Make sure you saved the profile on Lodestone, then try again.`
                            ),
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('register_verify')
                                .setLabel('🔄 Try Again')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('register_cancel')
                                .setLabel('✖ Cancel')
                                .setStyle(ButtonStyle.Danger),
                        ),
                    ],
                });
                return;
            }

            // ── Verified! Create user + character in DB ──────────────────

            const existing = await prisma.user.findUnique({
                where: { id: interaction.user.id },
                include: { characters: true },
            });


            if (!existing) {
                const fflogsCanonicalId = await getCanonicalId(name, world);
                await prisma.user.create({
                    data: {
                        id: interaction.user.id,
                        username: interaction.user.username,
                        characters: {
                            create: { name, world, fflogsCanonicalId },
                        },
                    },
                });
            } else {
                const charExists = existing.characters.some((c: { name: string; world: string; }) => c.name === name && c.world === world);
                if (!charExists) {
                    const fflogsCanonicalId = await getCanonicalId(name, world);
                    await prisma.user.update({
                        where: { id: interaction.user.id },
                        data: {
                            characters: {
                                create: { name, world, fflogsCanonicalId },
                            },
                        },
                    });
                } else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Character Already Registered')
                                .setColor(0xED4245)
                                .setDescription(
                                    `This character is already linked to your profile.`
                                ),
                        ],
                        components: [],
                    });
                    return;
                }
            }

            delete pendingVerifications[userId];

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Registration Complete!')
                        .setColor(0x57F287)
                        .setDescription(
                            `Welcome, **${name}** @ **${world}**!\n\n` +
                            `Your character has been linked to your discord account.\n` +
                            `You can now remove the verification key from your Lodestone bio.`
                        ),
                ],
                components: [],
            });

        } catch (err: any) {
            console.error('[register] Lodestone fetch error:', err);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Error Fetching Lodestone')
                        .setColor(0xED4245)
                        .setDescription(
                            `Could not load your Lodestone page. This can happen if:\n` +
                            `- The URL is incorrect\n` +
                            `- Lodestone is temporarily unavailable\n\n` +
                            `Error: \`${err.message}\``
                        ),
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId('register_verify')
                            .setLabel('🔄 Try Again')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('register_cancel')
                            .setLabel('✖ Cancel')
                            .setStyle(ButtonStyle.Danger),
                    ),
                ],
            });
        }
    }

    // ── Cancel ────────────────────────────────────────────────────────────
    else if (interaction.isButton() && interaction.customId === 'register_cancel') {
        delete pendingVerifications[userId];
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Registration Cancelled')
                    .setColor(0xED4245)
                    .setDescription('You can run `/register` again whenever you\'re ready.'),
            ],
            components: [],
        });
    }

    // ── Register: Add Character button ───────────────────────────────────
    else if (interaction.isButton() && interaction.customId === 'register_add_character_btn') {
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
            .setTextInputComponent(urlInput)

        modal.addLabelComponents(urlLabel);
        await interaction.showModal(modal);
    }

    // ── Register: Delete Character (start) button ───────────────────────
    else if (interaction.isButton() && interaction.customId === 'register_delete_character_btn') {
        const characters = await prisma.character.findMany({
            where: { userId: interaction.user.id },
        });

        const select = buildDeleteCharacterSelect(characters);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Select a Character to Delete')
                    .setColor(0xED4245)
                    .setDescription('Select the character you want to delete.'),
            ],
            components: [select],
            flags: [MessageFlags.Ephemeral],
        });
    }

    // ── Register: Delete Character (execute) select menu ─────────────────
    else if (interaction.isStringSelectMenu() && interaction.customId === 'register_delete_character_select') {
        await deleteCharacter(interaction as StringSelectMenuInteraction, interaction.values);
    }
}
