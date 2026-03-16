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