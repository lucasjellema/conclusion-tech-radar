// radar-layout.js
// Calculates blip positions using a polar grid distribution

export function calculateBlipPositions(blips, phases, categories, ringRadii, angleSlice) {
    // Group blips by sector (ring + category) for better distribution
    const sectorBlips = {};
    for (const blip of blips) {
        const phaseIndex = phases.indexOf((blip.rating.fase || '').toLowerCase());
        const catIndex = categories.indexOf(blip.category);

        if (catIndex === -1 || phaseIndex === -1) {
            console.warn(`[layout] Skipping blip ${blip.identifier || blip.name} - phase: ${blip.rating.fase}, cat: ${blip.category}`);
            continue;
        }

        // Use proportional ring radii from the array
        const innerR = phaseIndex === 0 ? 0 : ringRadii[phaseIndex - 1];
        const outerR = ringRadii[phaseIndex];
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

    // Distribute blips within each sector using improved polar distribution
    Object.values(sectorBlips).forEach(sectorBlipList => {
        if (sectorBlipList.length === 0) return;

        const firstBlip = sectorBlipList[0];
        const innerR = firstBlip.innerR;
        const outerR = firstBlip.outerR;
        const startAngle = firstBlip.startAngle;
        const endAngle = firstBlip.endAngle;

        const count = sectorBlipList.length;

        // Calculate optimal grid dimensions for better space utilization
        // Favor angular distribution over radial to spread blips more
        const ringWidth = outerR - innerR;
        const arcLength = (endAngle - startAngle) * ((innerR + outerR) / 2);

        // Determine radial levels based on ring width and blip count
        // Use fewer radial levels to spread blips more across the ring
        const radialLevels = Math.max(1, Math.min(
            Math.ceil(count / 4), // At least 4 blips per radial level
            Math.ceil(ringWidth / 40) // Or based on available radial space
        ));
        const angularDivisions = Math.ceil(count / radialLevels);

        // Available space with reduced margins for better utilization
        const radialMargin = Math.min(20, ringWidth * 0.15);
        const radialSpace = ringWidth - radialMargin;
        const angularMargin = Math.min(0.1, (endAngle - startAngle) * 0.1);
        const angularSpace = endAngle - startAngle - angularMargin;

        // Grid spacing
        const radialStep = radialSpace / Math.max(1, radialLevels);
        const angularStep = angularSpace / Math.max(1, angularDivisions);

        // Distribute blips in polar grid
        sectorBlipList.forEach((blip, idx) => {
            const radialLevel = Math.floor(idx / angularDivisions);
            const angularPos = idx % angularDivisions;

            // Base position in polar grid - spread more evenly
            let r = innerR + radialMargin / 2 + (radialLevel + 0.5) * radialStep;
            let theta = startAngle + angularMargin / 2 + (angularPos + 0.5) * angularStep;

            // Add jitter to avoid perfect grid (more natural)
            // Increase jitter for better distribution
            r += (Math.random() - 0.5) * Math.min(radialStep * 0.5, 15);
            theta += (Math.random() - 0.5) * Math.min(angularStep * 0.4, 0.15);

            // Clamp to bounds with smaller margins
            const minR = innerR + 12;
            const maxR = outerR - 12;
            r = Math.max(minR, Math.min(maxR, r));
            theta = Math.max(startAngle + 0.03, Math.min(endAngle - 0.03, theta));

            // Convert to Cartesian
            blip.x = r * Math.cos(theta);
            blip.y = r * Math.sin(theta);
            blip.r = r;
            blip.theta = theta;
        });
    });
}
