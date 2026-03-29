import { HealerType, Job, Modifier, Role } from "../generated/prisma/client";

const ROLES_EMOJI = [
    { name: 'TANK', emoji: '🛡️' },
    { name: 'HEALER', emoji: '💚' },
    { name: 'MELEE', emoji: '⚔️' },
    { name: 'PRANGED', emoji: '🏹' },
    { name: 'CASTER', emoji: '🔮' },
    { name: 'LIMITED', emoji: '❓' },
];

export type HealerJob = 'WHM' | 'AST' | 'SCH' | 'SGE';
export const HEALER_JOBS: HealerJob[] = ['WHM', 'AST', 'SCH', 'SGE'];

export type TankJob = 'PLD' | 'WAR' | 'DRK' | 'GNB';
export const TANK_JOBS: TankJob[] = ['PLD', 'WAR', 'DRK', 'GNB'];

export type MeleeJob = 'MNK' | 'DRG' | 'NIN' | 'SAM' | 'RPR';
export const MELEE_JOBS: MeleeJob[] = ['MNK', 'DRG', 'NIN', 'SAM', 'RPR'];

export type PrangedJob = 'BRD' | 'MCH' | 'DNC';
export const PRANGED_JOBS: PrangedJob[] = ['BRD', 'MCH', 'DNC'];

export type CasterJob = 'BLM' | 'SMN' | 'RDM';
export const CASTER_JOBS: CasterJob[] = ['BLM', 'SMN', 'RDM'];

export type LimitedJob = 'BLU';
export const LIMITED_JOBS: LimitedJob[] = ['BLU'];

export const HEALER_TYPE_MAP: Record<HealerJob, HealerType> = {
    WHM: HealerType.REGEN,
    AST: HealerType.REGEN,
    SCH: HealerType.SHIELD,
    SGE: HealerType.SHIELD,
};

export const MODIFIERS_MAP: Record<Modifier, Role> = {
    [Modifier.MT]: Role.TANK,
    [Modifier.OT]: Role.TANK,
    [Modifier.BOTH]: Role.TANK,
    [Modifier.FILL_MELEE]: Role.MELEE,
    [Modifier.FILL_RANGED]: Role.PRANGED,
    [Modifier.FILL_CASTER]: Role.CASTER,
};

export const ROLE_MAP: Record<Job, Role> = {
    [Job.PLD]: Role.TANK,
    [Job.WAR]: Role.TANK,
    [Job.DRK]: Role.TANK,
    [Job.GNB]: Role.TANK,
    [Job.WHM]: Role.HEALER,
    [Job.SCH]: Role.HEALER,
    [Job.AST]: Role.HEALER,
    [Job.SGE]: Role.HEALER,
    [Job.MNK]: Role.MELEE,
    [Job.DRG]: Role.MELEE,
    [Job.NIN]: Role.MELEE,
    [Job.SAM]: Role.MELEE,
    [Job.RPR]: Role.MELEE,
    [Job.BRD]: Role.PRANGED,
    [Job.MCH]: Role.PRANGED,
    [Job.DNC]: Role.PRANGED,
    [Job.BLM]: Role.CASTER,
    [Job.SMN]: Role.CASTER,
    [Job.RDM]: Role.CASTER,
    [Job.BLU]: Role.LIMITED,
};

export interface JobWithModifier {
    name: Job;
    modifier: Modifier | null;
    naturalRole: Role;
    actualRole: Role;
}

export function createJobWithModifier(job: Job, modifier: Modifier | null): JobWithModifier {
    return {
        name: job,
        modifier: modifier,
        naturalRole: ROLE_MAP[job],
        actualRole: modifier === null ? ROLE_MAP[job] : MODIFIERS_MAP[modifier],
    };
}

export function getUpdatedRole(job: JobWithModifier): Role {
    if (job.modifier === null) {
        return job.naturalRole;
    }
    return MODIFIERS_MAP[job.modifier];
}


export function getRoleEmoji(role: Role | Job | string): string {
    if (role in Job) {
        return ROLES_EMOJI.find(r => r.name === ROLE_MAP[role as Job])?.emoji ?? '❓';
    }
    if (typeof role === 'string') {
        return ROLES_EMOJI.find(r => r.name === role)?.emoji ?? '❓';
    }
    return ROLES_EMOJI.find(r => r.name === role)?.emoji ?? '❓';
};