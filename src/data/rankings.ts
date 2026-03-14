/**
 * FFXIV Themed ranking tiers and ELO conversion logic.
 */

export interface Rank {
    name: string;
    minMmr: number;
    emoji: string;
}

export const RANKS: Rank[] = [
    { name: 'Warrior of Light', minMmr: 2500, emoji: '💎' },
    { name: 'Diamond', minMmr: 2200, emoji: '🔷' },
    { name: 'Platinum', minMmr: 2000, emoji: '🛡️' },
    { name: 'Gold', minMmr: 1800, emoji: '🥇' },
    { name: 'Scion', minMmr: 1600, emoji: '🥈' },
    { name: 'Adventurer', minMmr: 1400, emoji: '🥉' },
    { name: 'Sprout', minMmr: 0, emoji: '🧱' }
];

/**
 * Converts a numerical MMR value into a themed Rank object.
 * @param mmr 
 * @returns {Rank}
 */
export function getRankFromMmr(mmr: number): Rank {
    // Ranks are ordered from highest to lowest for easy matching
    return RANKS.find(rank => mmr >= rank.minMmr) || RANKS[RANKS.length - 1];
}

/**
 * Returns a formatted string for the user's rank (e.g., "💎 Warrior of Light")
 */
export function formatRank(mmr: number): string {
    const rank = getRankFromMmr(mmr);
    return `${rank.emoji} ${rank.name}`;
}
