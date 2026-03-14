/**
 * FFXIV Fights Database
 * Contains raid encounters organized by tier.
 */

export interface Fight {
    name: string;
    value: string;
    fflogs_id: number[] | undefined;
    progPoints: ProgPoint[];
}

export interface RaidTier {
    tier: string;
    fights: Fight[];
}

export enum ProgPointE {
    Phase,
    Percentage,
    Ability,
    Clear,
    None
}

export type ProgPointValue =
    | { type: ProgPointE.Phase; phase: number }
    | { type: ProgPointE.Percentage; fightPercentage: number }
    | { type: ProgPointE.Ability; abilityName: string }
    | { type: ProgPointE.Clear; }
    | { type: ProgPointE.None; }

export interface ProgPoint {
    name: string;
    value: ProgPointValue;
    difficulty?: number; // no idea how to gauge this yet, probably a range from 0-100 [0 = no prog goal, 100 = clear]
}

export type PhaseProgPoint = Extract<ProgPointValue, { type: ProgPointE.Phase }>;
export type PercentageProgPoint = Extract<ProgPointValue, { type: ProgPointE.Percentage }>;
export type AbilityProgPoint = Extract<ProgPointValue, { type: ProgPointE.Ability }>;
export type ClearProgPoint = Extract<ProgPointValue, { type: ProgPointE.Clear }>;
export type NoneProgPoint = Extract<ProgPointValue, { type: ProgPointE.None }>;

// VERY IMPORTANT THING
// THERE IS A LIMIT OF 25 OPTIONS IN DISCORD SELECT MENUS, SO LIMIT THE PROGPOINT OPTIONS TO 25
// DO NOT FORGET THIS

// ==================== ProgPoint Creators ====================
// default progpoints
const NONE_PROG_POINT: ProgPoint = {
    name: 'None',
    value: { type: ProgPointE.None },
    difficulty: 0
}
const CLEAR_PROG_POINT: ProgPoint = {
    name: 'Clear',
    value: { type: ProgPointE.Clear },
    difficulty: 100
}
// ability progpoints
const createAbilityProgPoint = (abilityName: string, difficulty?: number): ProgPoint => {
    return {
        name: abilityName,
        value: { type: ProgPointE.Ability, abilityName },
        difficulty: difficulty
    }
}
const PARTY_SYNERGY_PROG_POINT: ProgPoint = createAbilityProgPoint('Party Synergy', 20)
// phases progpoints
const createPhaseProgPoint = (phase: number, difficulty?: number): ProgPoint => {
    return {
        name: `P${phase}`,
        value: { type: ProgPointE.Phase, phase },
        difficulty: difficulty
    }
}
const P1_PROG_POINT: ProgPoint = createPhaseProgPoint(1, 20)
const P2_PROG_POINT: ProgPoint = createPhaseProgPoint(2, 40)
const P3_PROG_POINT: ProgPoint = createPhaseProgPoint(3, 60)
const P4_PROG_POINT: ProgPoint = createPhaseProgPoint(4, 80)
const P5_PROG_POINT: ProgPoint = createPhaseProgPoint(5, 100)

// percentage progpoints
const createPercentageProgPoint = (percentage: number, difficulty?: number): ProgPoint => {
    return {
        name: `${percentage}%`,
        value: { type: ProgPointE.Percentage, fightPercentage: percentage },
        difficulty: difficulty
    }
}
const EXAMPLE_PERCENTAGE_PROG_POINT: ProgPoint = createPercentageProgPoint(100, 20) // percentage - difficulty


export const DEFAULT_PROG_POINTS: ProgPoint[] = [
    CLEAR_PROG_POINT,  // Ready to clear
    NONE_PROG_POINT // No prog objective
];


export const FIGHTS_WITH_TIERS: Record<string, RaidTier> = {
    // ==================== Dawntrail (7.x) ====================
    'AAC Light-heavyweight (Savage)': {
        tier: 'Dawntrail',
        fights: [
            {
                name: 'M1S - Black Cat', value: 'm1s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [93]
            },
            {
                name: 'M2S - Honey B. Lovely', value: 'm2s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [94]
            },
            {
                name: 'M3S - Brute Bomber', value: 'm3s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [95]
            },
            {
                name: 'M4S - Wicked Thunder', value: 'm4s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [96]
            },
        ]
    },
    'AAC Cruiserweight (Savage)': {
        tier: 'Dawntrail',
        fights: [
            {
                name: 'M5S - Dancing Green', value: 'm5s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [97]
            },
            {
                name: 'M6S - Sugar Riot', value: 'm6s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [98]
            },
            {
                name: 'M7S - Brute Abombinator', value: 'm7s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [99]
            },
            {
                name: 'M8S - Howling Blade', value: 'm8s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [100]
            },
        ]
    },
    'AAC Heavyweight (Savage)': {
        tier: 'Dawntrail',
        fights: [
            {
                name: 'M9S - Vamp Fatale',
                value: 'm9s',
                progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [101]
            },
            {
                name: 'M10S - Red Hot and Deep Blue',
                value: 'm10s',
                progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [102]
            },
            {
                name: 'M11S - The Tyrant',
                value: 'm11s',
                progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [103]
            },
            {
                name: 'M12S - Lindwurm',
                value: 'm12s',
                progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [104, 105]
            },
        ]
    },

    // ==================== Endwalker (6.x) ====================
    'Pandaemonium: Anabaseios (Savage)': {
        tier: 'Endwalker',
        fights: [
            {
                name: 'P9S - Kokytos', value: 'p9s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [88]
            },
            {
                name: 'P10S - Pandaemonium', value: 'p10s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [89]
            },
            {
                name: 'P11S - Themis', value: 'p11s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [90]
            },
            {
                name: 'P12S - Athena', value: 'p12s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [91, 92]
            },
        ]
    },

    'Pandaemonium: Abyssos (Savage)': {
        tier: 'Endwalker',
        fights: [
            {
                name: 'P5S - Proto-Carbuncle', value: 'p5s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [83]
            },
            {
                name: 'P6S - Hegemone', value: 'p6s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [84]
            },
            {
                name: 'P7S - Agdistis', value: 'p7s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [85]
            },
            {
                name: 'P8S - Hephaistos', value: 'p8s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [86, 87]
            },
        ]
    },

    'Pandaemonium: Asphodelos (Savage)': {
        tier: 'Endwalker',
        fights: [
            {
                name: 'P1S - Erichthonios', value: 'p1s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [78]
            },
            {
                name: 'P2S - Hippokampos', value: 'p2s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [79]
            },
            {
                name: 'P3S - Phoinix', value: 'p3s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [80]
            },
            {
                name: 'P4S - Hesperos', value: 'p4s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [81, 82]
            },
        ]
    },

    'Eden\'s Promise (Savage)': {
        tier: 'Shadowbringers',
        fights: [
            {
                name: 'E9S - Cloud of Darkness', value: 'e9s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [73]
            },
            {
                name: 'E10S - Shadowkeeper', value: 'e10s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [74]
            },
            {
                name: 'E11S - Fatebreaker', value: 'e11s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [75]
            },
            {
                name: 'E12S - Oracle of Darkness', value: 'e12s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [76, 77]
            },
        ]
    },

    'Eden\'s Verse (Savage)': {
        tier: 'Shadowbringers',
        fights: [
            {
                name: 'E5S - Ramuh', value: 'e5s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [69]
            },
            {
                name: 'E6S - Ifrit/Garuda', value: 'e6s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [70]
            },
            {
                name: 'E7S - Idol of Darkness', value: 'e7s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [71]
            },
            {
                name: 'E8S - Shiva', value: 'e8s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [72]
            },
        ]
    },

    'Eden\'s Gate (Savage)': {
        tier: 'Shadowbringers',
        fights: [
            {
                name: 'E1S - Eden Prime', value: 'e1s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [65]
            },
            {
                name: 'E2S - Voidwalker', value: 'e2s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [66]
            },
            {
                name: 'E3S - Leviathan', value: 'e3s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [67]
            },
            {
                name: 'E4S - Titan', value: 'e4s', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [68]
            },
        ]
    },

    // ==================== Ultimates ====================
    'Ultimates': {
        tier: 'Ultimate',
        fights: [
            {
                name: 'The Unending Coil of Bahamut (Ultimate)', value: 'ucob', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1073]
            },
            {
                name: 'The Weapon\'s Refrain (Ultimate)', value: 'uwu', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1074]
            },
            {
                name: 'The Epic of Alexander (Ultimate)', value: 'tea', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1075]
            },
            {
                name: 'Dragonsong\'s Reprise (Ultimate)', value: 'dsr', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1076]
            },
            {
                name: 'The Omega Protocol (Ultimate)', value: 'top', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    createAbilityProgPoint('Party Synergy', 20),
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1077]
            },
            {
                name: 'Futures Rewritten (Ultimate)', value: 'fru', progPoints: [
                    P1_PROG_POINT,
                    P2_PROG_POINT,
                    P3_PROG_POINT,
                    P4_PROG_POINT,
                    P5_PROG_POINT,
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1079]
            },
        ]
    },

    // ==================== Extreme Trials ====================
    'Extreme Trials (Dawntrail)': {
        tier: 'Dawntrail',
        fights: [
            {
                name: 'Worqor Lar Dor (Extreme)', value: 'ex1_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1071]
            },
            {
                name: 'Everkeep (Extreme)', value: 'ex2_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1072]
            },
            {
                name: 'Interphos (Extreme)', value: 'ex3_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1078]
            },
            {
                name: 'Extreme Trial 4 (DT)', value: 'ex4_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1080]
            },
            {
                name: 'Extreme Trial 5 (DT)', value: 'ex5_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1081]
            },
            {
                name: 'Extreme Trial 6 (DT)', value: 'ex6_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1082]
            },
            {
                name: 'Extreme Trial 7 (DT)', value: 'ex7_dt', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1083]
            },
        ]
    },

    'Extreme Trials (Endwalker)': {
        tier: 'Endwalker',
        fights: [
            {
                name: 'The Minstrel\'s Ballad: Zodiark\'s Fall', value: 'ex1_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1058]
            },
            {
                name: 'The Minstrel\'s Ballad: Hydaelyn\'s Call', value: 'ex2_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1059]
            },
            {
                name: 'The Minstrel\'s Ballad: Endsinger\'s Aria', value: 'ex3_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1063]
            },
            {
                name: 'Storm\'s Crown (Extreme)', value: 'ex4_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1066]
            },
            {
                name: 'Mount Ordeals (Extreme)', value: 'ex5_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1067]
            },
            {
                name: 'The Voidcast Savior (Extreme)', value: 'ex6_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1069]
            },
            {
                name: 'The Abyssal Fracture (Extreme)', value: 'ex7_ew', progPoints: [
                    CLEAR_PROG_POINT,
                    NONE_PROG_POINT
                ],
                fflogs_id: [1070]
            },
        ]
    }
};

export const FIGHTS: Record<string, Fight> = Object.fromEntries(Object.values(FIGHTS_WITH_TIERS).flatMap(tier => tier.fights.map(fight => [fight.value, fight])))

export const FIGHTS_WITH_TIERS_ARRAY: RaidTier[] = Object.values(FIGHTS_WITH_TIERS);
export const FIGHTS_ARRAY: Fight[] = Object.values(FIGHTS);
export const TIERS: string[] = Array.from(new Set(Object.values(FIGHTS_WITH_TIERS).map(tier => tier.tier)));

/**
 * Returns a flat list of all fights for use in slash command choices.
 * Discord limits choices to 25, so we may need autocomplete for larger lists.
 */
export function getAllFightChoices(): Fight[] {
    const choices: Fight[] = [];
    for (const tierData of FIGHTS_WITH_TIERS_ARRAY) {
        for (const fight of tierData.fights) {
            choices.push({
                name: fight.name, value: fight.value, progPoints: fight.progPoints,
                fflogs_id: fight.fflogs_id
            });
        }
    }
    return choices;
}

export function getFightID(name: string): number[] | undefined {
    const found = FIGHTS[name];
    if (found && found.fflogs_id !== undefined) return found.fflogs_id;
    return undefined;
}

export function getFightsFromTier(tier: string): Fight[] {
    let validFights: Fight[] = [];
    Object.entries(FIGHTS_WITH_TIERS).forEach(([key, value]) => {
        if (value.tier === tier) {
            validFights.push(...value.fights);
        }
    })
    return validFights;
}

/**
 * Get a fight's display name from its value key.
 */
export function getFightName(idx: string): string | undefined {
    const found = FIGHTS[idx];
    if (found) return found.name;
    return undefined;
}

export function getFightProgPoints(value: string): ProgPoint[] {
    const found = FIGHTS[value];
    if (found) return found.progPoints;
    return DEFAULT_PROG_POINTS;
}

export function getProgPoint(fightName: string, name: string): ProgPoint {
    const found = FIGHTS[fightName].progPoints.find(point => point.name.toLowerCase() === name.toLowerCase());
    if (found) return found;
    return NONE_PROG_POINT;
}

export function getAllFightProgPoints(): ProgPoint[] {
    const progPoints: ProgPoint[] = [];
    for (const tierData of Object.values(FIGHTS_WITH_TIERS)) {
        for (const fight of tierData.fights) {
            progPoints.push(...fight.progPoints);
        }
    }
    return progPoints;
}
