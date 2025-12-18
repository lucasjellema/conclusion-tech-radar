const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADJECTIVES = [
    "Shiny", "Mighty", "Radiant", "Frosty", "Electric", "Silent", "Golden", "Swift",
    "Robust", "Vibrant", "Nebula", "Atomic", "Crimson", "Sleek", "Stealthy", "Infinite"
];

const NOUNS = [
    "Penguin", "Falcon", "Nova", "Cyborg", "Glacier", "Thunder", "Specter", "Voyager",
    "Guardian", "Horizon", "Nebula", "Pulsar", "Phoenix", "Titan", "Zenith", "Oracle"
];

function generateName(hash) {
    const hashInt = parseInt(hash.substring(0, 4), 16);
    const adj = ADJECTIVES[hashInt % ADJECTIVES.length];
    const noun = NOUNS[(hashInt >> 4) % NOUNS.length];
    return `${adj} ${noun}`;
}

try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const name = generateName(hash);
    const timestamp = new Date().toISOString();

    const content = `export const APP_VERSION = {
    label: "${name}",
    hash: "${hash}",
    timestamp: "${timestamp}"
};
`;

    fs.writeFileSync(path.join(__dirname, '../js/version.js'), content);
    console.log(`Updated version to: ${name} (${hash})`);
} catch (error) {
    console.error('Failed to update version:', error.message);
}
