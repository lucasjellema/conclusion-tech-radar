// D3 Radar Visualization

import { t } from './i18n.js';

let svg, width, height, radius;
let g;
let currentData = null;
let resizeObserver = null;

const config = {
    margin: 50,
    levels: 5,
    labelFactor: 1.25,
    opacityArea: 0.1,
    dotRadius: 6
};

// Phases are provided per-render from the data object so layout can compress

// Note: human-friendly descriptions are provided via i18n files; `t()` is used to fetch them.

export function initRadar(data) {
    config.color = d3.scaleOrdinal(d3.schemeCategory10);

    // Keep last data so we can re-render on resize
    currentData = data;

    const container = document.getElementById('radar');
    resizeCanvas(container);

    // Create or replace svg element
    d3.select('#radar').selectAll('svg').remove();
    svg = d3.select('#radar')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    // Observe container size changes and resize radar accordingly
    try {
        const containerNode = document.querySelector('.radar-container') || container.parentElement || container;
        if (resizeObserver) resizeObserver.disconnect();
        const RESIZE_DEBOUNCE_MS = 150;
        let resizeTimer = null;
        resizeObserver = new ResizeObserver(() => {
            // update measured size immediately, but debounce the expensive re-render
            resizeCanvas(containerNode);
            if (svg) {
                svg.attr('width', width).attr('height', height);
                g.attr('transform', `translate(${width / 2},${height / 2})`);
            }
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (svg) {
                    svg.attr('width', width).attr('height', height);
                    g.attr('transform', `translate(${width / 2},${height / 2})`);
                }
                if (currentData) updateRadar(currentData);
            }, RESIZE_DEBOUNCE_MS);
        });
        resizeObserver.observe(containerNode);
    } catch (e) {
        // ResizeObserver may not be available; fall back to window resize with debounce
        const RESIZE_DEBOUNCE_MS = 150;
        let resizeTimerWin = null;
        globalThis.addEventListener('resize', () => {
            resizeCanvas(container);
            if (svg) {
                svg.attr('width', width).attr('height', height);
                g.attr('transform', `translate(${width / 2},${height / 2})`);
            }
            if (resizeTimerWin) clearTimeout(resizeTimerWin);
            resizeTimerWin = setTimeout(() => {
                if (svg) {
                    svg.attr('width', width).attr('height', height);
                    g.attr('transform', `translate(${width / 2},${height / 2})`);
                }
                if (currentData) updateRadar(currentData);
            }, RESIZE_DEBOUNCE_MS);
        });
    }

    updateRadar(data);
}

function resizeCanvas(container) {
    const rect = container.getBoundingClientRect();
    width = Math.max(0, Math.floor(rect.width)) || 800;
    height = Math.max(0, Math.floor(rect.height)) || 600;
    radius = Math.max(0, Math.min(width, height) / 2 - config.margin);
}

export function updateRadar(data) {
    // Keep reference to last data for responsive re-renders
    currentData = data;
    g.selectAll("*").remove(); // Clear canvas

    const { blips, categories, phases } = data;
    // If there are no active phases, don't draw rings or blips
    if (!phases || phases.length === 0) return;

    // Compute ring radius based on number of active phases so removed phases compress layout
    const ringRadius = radius / phases.length;
    const angleSlice = (Math.PI * 2) / categories.length;

    // 1. Draw Segments (Categories)
    const showSegments = document.getElementById('toggle-segments').checked;

    // Define subtle colors for segments. We keep a stable mapping between
    // category -> color for the duration of the browser session so colors
    // don't shift when categories are hidden/shown or when drilling down.
    const BASE_SEGMENT_COLORS = [
        "rgba(59, 130, 246, 0.3)",
        "rgba(16, 185, 129, 0.3)",
        "rgba(245, 158, 11, 0.3)",
        "rgba(239, 68, 68, 0.3)",
        "rgba(139, 92, 246, 0.3)"];

    // Read or initialize category->color mapping in sessionStorage
    function loadCategoryColorMap() {
        try {
            const raw = sessionStorage.getItem('radarCategoryColors');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveCategoryColorMap(map) {
        try {
            sessionStorage.setItem('radarCategoryColors', JSON.stringify(map));
        } catch (e) {
            // ignore
        }
    }

    function ensureCategoryColors(categoriesList) {
        const map = loadCategoryColorMap();
        // Preserve insertion order for assignment
        const assigned = new Set(Object.keys(map));
        let nextIdx = 0;
        // find next free index in base colors
        while (nextIdx < BASE_SEGMENT_COLORS.length && Array.from(assigned).some(k => map[k] === BASE_SEGMENT_COLORS[nextIdx])) {
            nextIdx++;
        }

            for (const cat of categoriesList) {
                if (!Object.hasOwn(map, cat)) {
                // Pick color from base palette if available, otherwise generate via d3.interpolateRainbow
                let color;
                if (nextIdx < BASE_SEGMENT_COLORS.length) {
                    color = BASE_SEGMENT_COLORS[nextIdx];
                    nextIdx++;
                } else {
                    // Generate a deterministic color based on category index/hash
                    const idx = Object.keys(map).length;
                    color = d3.interpolateRainbow((idx % 12) / 12);
                    // make it semi-transparent to match palette style
                    color = (function(c) { return c.replace('rgb', 'rgba').replace(')', ',0.28)'); })((d3.color(color).formatRgb()));
                }
                map[cat] = color;
            }
        }
        saveCategoryColorMap(map);
        return map;
    }

    const categoryColorMap = ensureCategoryColors(categories);
    const segmentColors = (d) => categoryColorMap[d] || 'rgba(128,128,128,0.2)';

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
            })
            .on("mouseenter", (event, d) => {
                const tEl = document.getElementById('tooltip');
                const key = (d || '').toLowerCase();
                const desc = t(`categories.${key}`, '');
                tEl.innerHTML = `<strong>${d}</strong><div style="margin-top:6px; font-size:0.9rem">${desc}</div>`;
                tEl.classList.remove('hidden');
                tEl.style.pointerEvents = 'none';
                updateTooltipPosition(event);
            })
            .on("mousemove", (event) => {
                updateTooltipPosition(event);
            })
            .on("mouseleave", () => {
                document.getElementById('tooltip').classList.add('hidden');
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
            .text(d => d.toUpperCase())
            .style("cursor", "pointer")
            .on("dblclick", (event, d) => {
                const filterEvent = new CustomEvent('filter-phase', { detail: d });
                document.dispatchEvent(filterEvent);
            })
            .on("mouseenter", (event, d) => {
                const tEl = document.getElementById('tooltip');
                const key = (d || '').toLowerCase();
                const desc = t(`phases.${key}`, '');
                tEl.innerHTML = `<strong>${(d || '').toUpperCase()}</strong><div style="margin-top:6px; font-size:0.9rem">${desc}</div>`;
                tEl.classList.remove('hidden');
                tEl.style.pointerEvents = 'none';
                updateTooltipPosition(event);
            })
            .on("mousemove", (event) => {
                updateTooltipPosition(event);
            })
            .on("mouseleave", () => {
                document.getElementById('tooltip').classList.add('hidden');
            });
    }

    // 3. Calculate Blip Positions
    for (const blip of blips) {
        const phaseIndex = phases.indexOf((blip.rating.fase || '').toLowerCase());
        const catIndex = categories.indexOf(blip.category);

        if (catIndex === -1) return; // Should not happen if data is consistent
        if (phaseIndex === -1) return; // Phase was filtered out

        // Radial bounds for this phase (compressed according to active phases)
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
    }

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
