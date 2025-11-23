// D3 Radar Visualization

let svg, width, height, radius;
let g;

const config = {
    margin: 50,
    levels: 5,
    labelFactor: 1.25,
    opacityArea: 0.1,
    dotRadius: 6
};

// Phase mapping to ring index (0 = center)
const phaseMap = {
    'adopt': 0,
    'trial': 1,
    'assess': 2,
    'hold': 3,
    'deprecate': 4 // Outermost
};

export function initRadar(data) {
    config.color = d3.scaleOrdinal(d3.schemeCategory10);
    const container = document.getElementById('radar');
    width = container.clientWidth || 800;
    height = container.clientHeight || 600;
    radius = Math.max(0, Math.min(width, height) / 2 - config.margin);

    svg = d3.select("#radar")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    updateRadar(data);
}

export function updateRadar(data) {
    g.selectAll("*").remove(); // Clear canvas

    const { blips, categories, phases } = data;
    const ringRadius = radius / config.levels;
    const angleSlice = (Math.PI * 2) / categories.length;

    // 1. Draw Segments (Categories)
    const showSegments = document.getElementById('toggle-segments').checked;

    // Define subtle colors for segments
    const segmentColors = d3.scaleOrdinal()
        .domain(categories)
        .range(["rgba(59, 130, 246, 0.3)", "rgba(16, 185, 129, 0.3)", "rgba(245, 158, 11, 0.3)", "rgba(239, 68, 68, 0.3)", "rgba(139, 92, 246, 0.3)"]);

    if (showSegments && categories.length > 0) {
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle((d, i) => i * angleSlice)
            .endAngle((d, i) => (i + 1) * angleSlice);

        g.selectAll(".segment-arc")
            .data(categories)
            .enter()
            .append("path")
            .attr("class", "segment-arc")
            .attr("d", (d, i) => arc(d, i))
            .attr("fill", d => segmentColors(d))
            .style("stroke", "none")
            .style("cursor", "pointer")
            .on("dblclick", (event, d) => {
                const filterEvent = new CustomEvent('filter-category', { detail: d });
                document.dispatchEvent(filterEvent);
            });

        g.selectAll(".segment-line")
            .data(categories)
            .enter()
            .append("line")
            .attr("class", "segment-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d, i) => radius * Math.cos(i * angleSlice - Math.PI / 2))
            .attr("y2", (d, i) => radius * Math.sin(i * angleSlice - Math.PI / 2));

        // Category Labels
        g.selectAll(".category-label")
            .data(categories)
            .enter()
            .append("text")
            .attr("class", "legend-text")
            .attr("x", (d, i) => (radius + 20) * Math.cos(i * angleSlice + angleSlice / 2 - Math.PI / 2))
            .attr("y", (d, i) => (radius + 20) * Math.sin(i * angleSlice + angleSlice / 2 - Math.PI / 2))
            .style("text-anchor", "middle")
            .style("cursor", "pointer")
            .text(d => d)
            .on("dblclick", (event, d) => {
                const filterEvent = new CustomEvent('filter-category', { detail: d });
                document.dispatchEvent(filterEvent);
            });
    }

    // 2. Draw Rings
    const showRings = document.getElementById('toggle-rings').checked;

    if (showRings) {
        g.selectAll(".ring")
            .data(phases)
            .enter()
            .append("circle")
            .attr("class", "ring")
            .attr("r", (d, i) => (i + 1) * ringRadius)
            .style("fill", "none")
            .style("stroke", "var(--ring-color)");

        // Ring Labels
        g.selectAll(".ring-label")
            .data(phases)
            .enter()
            .append("text")
            .attr("class", "legend-text")
            .attr("y", (d, i) => -((i + 1) * ringRadius) + 15)
            .attr("x", 0)
            .text(d => d.toUpperCase());
    }

    // 3. Calculate Blip Positions
    blips.forEach(blip => {
        const phaseIndex = phaseMap[blip.rating.fase.toLowerCase()] || 0;
        const catIndex = categories.indexOf(blip.category);

        if (catIndex === -1) return; // Should not happen if data is consistent

        // Radial bounds for this phase
        const innerR = phaseIndex * ringRadius;
        const outerR = (phaseIndex + 1) * ringRadius;

        // Angular bounds for this category
        // -PI/2 to rotate 0 to top
        const startAngle = catIndex * angleSlice - Math.PI / 2;
        const endAngle = (catIndex + 1) * angleSlice - Math.PI / 2;

        // Random position within the sector
        const r = Math.random() * (outerR - innerR - 20) + innerR + 10;
        const theta = Math.random() * (endAngle - startAngle - 0.2) + startAngle + 0.1;

        blip.x = r * Math.cos(theta);
        blip.y = r * Math.sin(theta);

        // Store color based on phase
        blip.color = getPhaseColor(blip.rating.fase);
    });

    // 4. Draw Blips
    const blipNodes = g.selectAll(".blip")
        .data(blips)
        .enter()
        .append("g")
        .attr("class", "blip")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .on("mouseenter", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseleave", handleMouseOut)
        .on("click", handleClick);

    blipNodes.append("circle")
        .attr("r", config.dotRadius)
        .style("fill", d => d.color);

    // Add small text label to blip
    blipNodes.append("text")
        .attr("x", 8)
        .attr("y", 4)
        .text(d => d.name)
        .style("font-size", "10px")
        .style("fill", "var(--text-color)")
        .style("pointer-events", "none");
}

function getPhaseColor(phase) {
    switch (phase.toLowerCase()) {
        case 'adopt': return 'var(--color-adopt)';
        case 'trial': return 'var(--color-trial)';
        case 'assess': return 'var(--color-assess)';
        case 'hold': return 'var(--color-hold)';
        case 'deprecate': return 'var(--color-deprecated)';
        default: return '#ccc';
    }
}

// Event Handlers (Dispatched to UI)
function handleMouseOver(event, d) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <h4>${d.name}</h4>
        <div class="tooltip-meta">
            <span>${d.rating.bedrijf}</span>
            <span>•</span>
            <span style="color: ${d.color}">${d.rating.fase.toUpperCase()}</span>
        </div>
        <div>${d.tags.join(', ')}</div>
    `;
    tooltip.classList.remove('hidden');
    tooltip.style.pointerEvents = 'none';
    // Initial position
    updateTooltipPosition(event);
}

function handleMouseMove(event) {
    updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = (event.pageX + 25) + 'px';
    tooltip.style.top = (event.pageY + 25) + 'px';
}

function handleMouseOut() {
    document.getElementById('tooltip').classList.add('hidden');
}

function handleClick(event, d) {
    // Dispatch custom event or call UI directly
    const modalEvent = new CustomEvent('open-modal', { detail: d });
    document.dispatchEvent(modalEvent);
}
