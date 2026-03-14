
const ROLE_LIMITS = {
    Tank: 2,
    Healer: 2,
    Melee: 2,
    Pranged: 1,
    Caster: 1,
};

function isCompatible(userAId, userBId, userChars, userBlacklists) {
    const charsA = userChars[userAId] || [];
    const blA = userBlacklists[userAId] || [];
    const charsB = userChars[userBId] || [];
    const blB = userBlacklists[userBId] || [];

    const aBlocksB = charsB.some(char =>
        blA.some(b => b.name === char.name && b.world === char.world)
    );
    if (aBlocksB) return false;

    const bBlocksA = charsA.some(char =>
        blB.some(b => b.name === char.name && b.world === char.world)
    );
    if (bBlocksA) return false;

    return true;
}

function findValidParty(pool, currentIndices, startIdx, currentRoles, userChars, userBlacklists) {
    if (currentIndices.length === 8) return currentIndices;

    const needed = {};
    for (const [role, limit] of Object.entries(ROLE_LIMITS)) {
        const diff = limit - (currentRoles[role] || 0);
        if (diff > 0) needed[role] = diff;
    }

    const available = {};
    for (let i = startIdx; i < pool.length; i++) {
        const r = pool[i].role;
        available[r] = (available[r] || 0) + 1;
    }

    for (const [role, count] of Object.entries(needed)) {
        if ((available[role] || 0) < count) return null;
    }

    for (let i = startIdx; i < pool.length; i++) {
        const candidate = pool[i];
        if ((currentRoles[candidate.role] || 0) >= ROLE_LIMITS[candidate.role]) continue;

        let compatible = true;
        for (const idx of currentIndices) {
            if (!isCompatible(candidate.userId, pool[idx].userId, userChars, userBlacklists)) {
                compatible = false;
                break;
            }
        }
        if (!compatible) continue;

        const nextRoles = { ...currentRoles, [candidate.role]: (currentRoles[candidate.role] || 0) + 1 };
        const result = findValidParty(pool, [...currentIndices, i], i + 1, nextRoles, userChars, userBlacklists);
        if (result) return result;
    }

    return null;
}

// --- TEST CASE ---

const testQueue = [
    { userId: '1', role: 'Tank' },
    { userId: '2', role: 'Tank' },
    { userId: '3', role: 'Tank' }, // Should be skipped for first group (limit 2)
    { userId: '4', role: 'Healer' },
    { userId: '5', role: 'Healer' },
    { userId: '6', role: 'Melee' },
    { userId: '7', role: 'Melee' },
    { userId: '8', role: 'Pranged' },
    { userId: '9', role: 'Caster' }, // Valid group: 1, 2, 4, 5, 6, 7, 8, 9
];

const userChars = {
    '1': [{ name: 'char1', world: 'w1' }],
    '2': [{ name: 'char2', world: 'w1' }],
    '3': [{ name: 'char3', world: 'w1' }],
    '4': [{ name: 'char4', world: 'w1' }],
    '5': [{ name: 'char5', world: 'w1' }],
    '6': [{ name: 'char6', world: 'w1' }],
    '7': [{ name: 'char7', world: 'w1' }],
    '8': [{ name: 'char8', world: 'w1' }],
    '9': [{ name: 'char9', world: 'w1' }],
};

const userBlacklists = {
    '1': [{ name: 'char4', world: 'w1' }], // User 1 blocks User 4
};

// With User 1 blocking User 4, the algorithm MUST skip one of them.
// Pool:
// 0: U1 Tank
// 1: U2 Tank
// 2: U3 Tank
// 3: U4 Healer (Blocked by U1)
// 4: U5 Healer
// 5: U6 Melee
// 6: U7 Melee
// 7: U8 Pranged
// 8: U9 Caster

console.log('Running Matchmaking Test...');
const result = findValidParty(testQueue, [], 0, { Tank: 0, Healer: 0, Melee: 0, Pranged: 0, Caster: 0 }, userChars, userBlacklists);

if (result) {
    console.log('Match found! Indices:', result);
    console.log('User IDs:', result.map(i => testQueue[i].userId));
    // Expectation: If U1 is picked, U4 cannot be picked. If U4 is required (only 2 healers available), U1 must be skipped.
    // In this test queue: 
    // Healers available: U4, U5 (Only 2). BOTH are required for a group of 8.
    // Since U4 is required, U1 must be skipped.
    // Valid group: U2(Tank), U3(Tank), U4(Healer), U5(Healer), U6(Melee), U7(Melee), U8(Pranged), U9(Caster)
} else {
    console.log('No match found (Unexpected if enough players are compatible).');
}
