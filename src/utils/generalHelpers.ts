import { EventSignupRoles } from "../generated/prisma/client";


const ROLES = [
    { name: 'TANK', emoji: '🛡️' },
    { name: 'HEALER', emoji: '💚' },
    { name: 'MELEE', emoji: '⚔️' },
    { name: 'PRANGED', emoji: '🏹' },
    { name: 'CASTER', emoji: '🔮' },
];

export function getRoleEmoji(role: EventSignupRoles | string): string {
    if (typeof role === 'string') {
        return ROLES.find(r => r.name === role)?.emoji ?? '❓';
    }
    return ROLES.find(r => r.name === role.role)?.emoji ?? '❓';
}


export const dateHelper = {
    fomatTimeOut: (date: Date): string => {
        return date.toISOString().split('T')[0];
    },
    today: (time: boolean = false): Date => {
        const d = new Date();
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    tomorrow: (time: boolean = false): Date => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    yesterday: (time: boolean = false): Date => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        if (!time) d.setHours(0, 0, 0, 0);
        return d;
    },
    addHours: (date: Date, hours: number): Date => {
        const d = new Date(date);
        d.setHours(d.getHours() + hours);
        return d;
    },
    addDays: (date: Date, days: number): Date => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },
}
