/**
 * FFXIV Worlds (Servers) organized by Data Center.
 */

export const WORLDS: Record<string, string[]> = {
    // ==================== North America ====================
    'Aether': ['Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren'],
    'Primal': ['Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros'],
    'Crystal': ['Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera'],
    'Dynamis': ['Halicarnassus', 'Maduin', 'Marilith', 'Seraph', 'Cuchulainn', 'Kraken', 'Rafflesia', 'Golem'],

    // ==================== Europe ====================
    'Chaos': ['Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Phantom', 'Ragnarok', 'Sagittarius', 'Spriggan'],
    'Light': ['Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark'],
    'Shadow': ['Innocence', 'Pixie', 'Titania', 'Tycoon'],

    // ==================== Japan ====================
    'Elemental': ['Aegis', 'Atomos', 'Carbuncle', 'Gungnir', 'Kujata', 'Typhon', 'Unicorn', 'Tonberry'],
    'Gaia': ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
    'Mana': ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
    'Meteor': ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Valefor', 'Yojimbo', 'Zeromus', 'Brigid'],

    // ==================== Oceania ====================
    'Materia': ['Bismarck', 'Ravana', 'Sephirot', 'Sophia', 'Zurvan']
};

/**
 * Returns a flat list of all world names alphabetically.
 */
export function getAllWorlds(): string[] {
    const all: string[] = [];
    for (const worlds of Object.values(WORLDS)) {
        all.push(...worlds);
    }
    return all.sort();
}


/**
 * Mapping of Data Centers to regions.
 */
const DC_TO_REGION: Record<string, string> = {
    'Aether': 'NA',
    'Primal': 'NA',
    'Crystal': 'NA',
    'Dynamis': 'NA',
    'Chaos': 'EU',
    'Light': 'EU',
    'Shadow': 'EU',
    'Elemental': 'JP',
    'Gaia': 'JP',
    'Mana': 'JP',
    'Meteor': 'JP',
    'Materia': 'OC'
};

/**
 * Returns the region for a given world name.
 */
export function getWorldRegion(worldName: string): string | null {
    for (const [dc, worlds] of Object.entries(WORLDS)) {
        if (worlds.includes(worldName)) {
            return DC_TO_REGION[dc] || null;
        }
    }
    return null;
}
