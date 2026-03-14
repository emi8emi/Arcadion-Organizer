import { getWorldRegion } from '../src/data/worlds';

const testCases = [
    { world: 'Jenova', expected: 'NA' },
    { world: 'Cerberus', expected: 'EU' },
    { world: 'Tonberry', expected: 'JP' },
    { world: 'Materia', expected: null }, // Meteria is a DC, not a world
    { world: 'Ravana', expected: 'OC' },
    { world: 'NonExistent', expected: null }
];

testCases.forEach(({ world, expected }) => {
    const result = getWorldRegion(world);
    console.log(`World: ${world.padEnd(12)} | Expected: ${String(expected).padEnd(5)} | Result: ${String(result).padEnd(5)} | ${result === expected ? '✅' : '❌'}`);
});
