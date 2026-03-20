import { Job, Role } from "../generated/prisma/client";

const ROLES_EMOJI = [
    { name: 'TANK', emoji: '🛡️' },
    { name: 'HEALER', emoji: '💚' },
    { name: 'MELEE', emoji: '⚔️' },
    { name: 'PRANGED', emoji: '🏹' },
    { name: 'CASTER', emoji: '🔮' },
    { name: 'LIMITED', emoji: '❓' },
];

export const HEALER_TYPE = {
    'WHM': 'REGEN', 'AST': 'REGEN',
    'SCH': 'SHIELD', 'SGE': 'SHIELD',
};

export enum Modifiers {
    MT = 'MT',
    OT = 'OT',
    BOTH = 'BOTH',
    FILL_MELEE = 'FILL_MELEE',
    FILL_PRANGED = 'FILL_PRANGED',
    FILL_CASTER = 'FILL_CASTER',
};

export enum TankModifier {
    MT = Modifiers.MT,
    OT = Modifiers.OT,
    BOTH = Modifiers.BOTH,
};

export enum FillModifier {
    FILL_MELEE = Modifiers.FILL_MELEE,
    FILL_PRANGED = Modifiers.FILL_PRANGED,
    FILL_CASTER = Modifiers.FILL_CASTER,
};

export const FILL_SLOT: Record<FillModifier, Role> = {
    [FillModifier.FILL_MELEE]: 'MELEE',
    [FillModifier.FILL_PRANGED]: 'PRANGED',
    [FillModifier.FILL_CASTER]: 'CASTER',
};

export const ROLE_MAP: Record<Job, Role> = {
    'PLD': 'TANK',
    'WAR': 'TANK',
    'DRK': 'TANK',
    'GNB': 'TANK',
    'WHM': 'HEALER',
    'SCH': 'HEALER',
    'AST': 'HEALER',
    'SGE': 'HEALER',
    'MNK': 'MELEE',
    'DRG': 'MELEE',
    'NIN': 'MELEE',
    'SAM': 'MELEE',
    'RPR': 'MELEE',
    'BRD': 'PRANGED',
    'MCH': 'PRANGED',
    'DNC': 'PRANGED',
    'BLM': 'CASTER',
    'SMN': 'CASTER',
    'RDM': 'CASTER',
    'BLU': 'LIMITED',
};

export function getRoleEmoji(role: Role | string): string {
    if (typeof role === 'string') {
        return ROLES_EMOJI.find(r => r.name === role)?.emoji ?? '❓';
    }
    return ROLES_EMOJI.find(r => r.name === role)?.emoji ?? '❓';
};