// radar-layout.js
// Calculates blip positions using a polar grid distribution

export function calculateBlipPositions(blips, phases, categories, ringRadius, angleSlice) {
    // Group blips by sector (ring + category) for better distribution
    const sectorBlips = {};
    for (const blip of blips) {
        const phaseIndex = phases.indexOf((blip.rating.fase || '').toLowerCase());
        const catIndex = categories.indexOf(blip.category);

        if (catIndex === -1) continue;
        if (phaseIndex === -1) continue;

        const innerR = phaseIndex * ringRadius;
        const outerR = (phaseIndex + 1) * ringRadius;
        const startAngle = catIndex * angleSlice - Math.PI / 2;
        const endAngle = (catIndex + 1) * angleSlice - Math.PI / 2;

        blip.innerR = innerR;
        blip.outerR = outerR;
        blip.startAngle = startAngle;
        blip.endAngle = endAngle;

        const key = `${phaseIndex}_${catIndex}`;
        if (!sectorBlips[key]) {
            sectorBlips[key] = [];
        }
        sectorBlips[key].push(blip);
    }

    // Distribute blips within each sector using polar grid
    Object.values(sectorBlips).forEach(sectorBlipList => {
        if (sectorBlipList.length === 0) return;

        const firstBlip = sectorBlipList[0];
        const innerR = firstBlip.innerR;
        const outerR = firstBlip.outerR;
        const startAngle = firstBlip.startAngle;
        const endAngle = firstBlip.endAngle;

        // Calculate grid dimensions in polar coordinates
        const count = sectorBlipList.length;
        const radialLevels = Math.ceil(Math.sqrt(count));
        const angularDivisions = Math.ceil(count / radialLevels);

        // Available space with margins
        const radialSpace = outerR - innerR - 30;
        const angularSpace = endAngle - startAngle - 0.15;

        // Grid spacing
        const radialStep = radialSpace / Math.max(1, radialLevels);
        const angularStep = angularSpace / Math.max(1, angularDivisions);

        // Distribute blips in polar grid
        sectorBlipList.forEach((blip, idx) => {
            const radialLevel = Math.floor(idx / angularDivisions);
            const angularPos = idx % angularDivisions;

            // Base position in polar grid
            let r = innerR + 15 + (radialLevel + 0.5) * radialStep;
            let theta = startAngle + 0.075 + (angularPos + 0.5) * angularStep;

            // Add small jitter to avoid perfect grid (more natural)
            r += (Math.random() - 0.5) * Math.min(radialStep * 0.3, 8);
            theta += (Math.random() - 0.5) * Math.min(angularStep * 0.3, 0.08);

            // Clamp to bounds
            r = Math.max(innerR + 15, Math.min(outerR - 15, r));
            theta = Math.max(startAngle + 0.05, Math.min(endAngle - 0.05, theta));

            // Convert to Cartesian
            blip.x = r * Math.cos(theta);
            blip.y = r * Math.sin(theta);
            blip.r = r;
            blip.theta = theta;
        });
    });
}
