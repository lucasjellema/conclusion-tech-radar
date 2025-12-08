// D3 Radar Visualization

import { t } from './i18n.js';
import { ensureCategoryColors, ensureCompanyColors, getPhaseColor } from './radar/radar-colors.js';
import { renderCompanyLegend } from './radar/radar-legend.js';
import { calculateBlipPositions } from './radar/radar-layout.js';

let svg, width, height, radius;
let g;
let currentData = null;
let resizeObserver = null;
let isOptimized = false;

export function toggleOptimization() {
    isOptimized = !isOptimized;
    if (currentData) updateRadar(currentData);
    return isOptimized;
}

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
                g.attr('transform', `translate(${0.4 * width},${height / 2})`);
            }
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (svg) {
                    svg.attr('width', width).attr('height', height);
                    g.attr('transform', `translate(${0.4 * width},${height / 2})`);
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
                g.attr('transform', `translate(${0.4 * width},${height / 2})`);
            }
            if (resizeTimerWin) clearTimeout(resizeTimerWin);
            resizeTimerWin = setTimeout(() => {
                if (svg) {
                    svg.attr('width', width).attr('height', height);
                    g.attr('transform', `translate(${0.4 * width},${height / 2})`);
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

    let { blips, categories, phases } = data;

    // 1. Draw Segments (Categories)
    const showSegments = document.getElementById('toggle-segments') ? document.getElementById('toggle-segments').checked : true;

    // If optimized, filter out empty categories and phases
    if (isOptimized) {
        // Find all used categories and phases from blips
        const usedCategories = new Set(blips.map(b => b.category));
        const usedPhases = new Set(blips.map(b => (b.rating.fase || '').toLowerCase()));

        categories = categories.filter(c => usedCategories.has(c));
        phases = phases.filter(p => usedPhases.has(p));
    }

    // If there are no active phases, don't draw rings or blips
    if (!phases || phases.length === 0) return;

    // Compute angle slice based on number of categories
    const angleSlice = Math.PI * 2 / (categories.length || 1);

    // Count blips per phase for proportional ring sizing
    const blipCounts = {};
    phases.forEach(p => blipCounts[p] = 0);
    blips.forEach(b => {
        const phase = (b.rating.fase || '').toLowerCase();
        if (blipCounts[phase] !== undefined) blipCounts[phase]++;
    });

    // Calculate proportional ring radii based on blip counts
    const totalBlips = blips.length || 1;
    const MIN_RING_WIDTH = radius * 0.1; // Minimum 10% of radius for visibility
    const ringRadii = [];
    let cumulativeRadius = 0;

    phases.forEach((phase, i) => {
        const proportion = blipCounts[phase] / totalBlips;
        const ringWidth = Math.max(MIN_RING_WIDTH, proportion * radius);
        cumulativeRadius += ringWidth;
        ringRadii.push(cumulativeRadius);
    });

    // Normalize to fit within total radius
    const scale = radius / cumulativeRadius;
    for (let i = 0; i < ringRadii.length; i++) {
        ringRadii[i] *= scale;
    }

    // For backward compatibility, keep ringRadius as the average (used in some places)
    const ringRadius = radius / (phases.length || 1);

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
            .attr("r", (d, i) => ringRadii[i])
            .style("fill", "none")
            .style("stroke", "var(--ring-color)");

        // Ring Labels
        g.selectAll(".ring-label")
            .data(phases)
            .enter()
            .append("text")
            .attr("class", "legend-text")
            .attr("y", (d, i) => -ringRadii[i] + 15)
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

    // 3. Calculate Blip Positions using polar grid distribution
    calculateBlipPositions(blips, phases, categories, ringRadii, angleSlice);

    const companyColorMap = ensureCompanyColors(blips);
    // annotate blips with companyColor for use in tooltips etc.
    for (const b of blips) b.companyColor = companyColorMap[b.company] || '#999';

    // Domain -> symbol mapping
    const DOMAIN_SYMBOLS = {
        'Cloud & Mission Critical': d3.symbolSquare,
        'Strategy & Business Consultany': d3.symbolTriangle,
        'Enterprise Applications': d3.symbolDiamond,
        'Data & AI': d3.symbolStar,
        'Experience & Software': d3.symbolCircle
    };

    // 4. Draw Blips (with domain-shaped symbols and company colors)
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
    const SYMBOL_SIZE = Math.max(30, Math.PI * Math.pow(config.dotRadius + 2, 2));

    // Toggle: show logos in blips if the visibility control is checked
    const showLogos = !!document.getElementById('toggle-blip-logos') && document.getElementById('toggle-blip-logos').checked;
    const ICON_SIZE = Math.max(18, config.dotRadius * 4);

    if (showLogos) {
        // Debug: log attempt to load logos so users can inspect console when Network shows nothing
        try { console.debug('[radar] showLogos enabled - preparing to load logos for', blips.length, 'blips'); } catch (e) { }
        // When logos are enabled, render the company logo image centered on the blip.
        // If no logo is available, fall back to colored symbol.
        blipNodes.each(function (d, i) {
            const node = d3.select(this);
            // Prefer technology logo (from technologies.json) over company logo
            const logoUrl = d.logo || d.logoUrl || d.companyLogo || '';
            if (logoUrl) {
                try { console.debug('[radar] attempting logo for tech=', d.identifier || d.name, 'company=', d.company, logoUrl); } catch (e) { }
                // Preload the image to detect load failure and avoid broken icons.
                const imgEl = new Image();
                // Do not force CORS; loading without crossOrigin matches how modal <img> works
                imgEl.onload = function () {
                    // draw subtle stroke behind the image
                    node.append('circle')
                        .attr('r', ICON_SIZE / 2 + 2)
                        .style('fill', 'none')
                        .style('stroke', '#fff')
                        .style('stroke-width', 1.2);

                    const img = node.append('image')
                        .attr('width', ICON_SIZE)
                        .attr('height', ICON_SIZE)
                        .attr('x', -ICON_SIZE / 2)
                        .attr('y', -ICON_SIZE / 2)
                        .attr('preserveAspectRatio', 'xMidYMid meet');
                    img.attr('href', logoUrl).attr('xlink:href', logoUrl);
                    try { console.debug('[radar] logo loaded for tech=', d.identifier || d.name, 'company=', d.company, logoUrl); } catch (e) { }
                };
                imgEl.onerror = function () {
                    // fallback: render colored domain-shaped symbol
                    try { console.debug('[radar] logo failed to load for tech=', d.identifier || d.name, 'company=', d.company, logoUrl); } catch (e) { }
                    node.append('path')
                        .attr('d', () => {
                            const sym = DOMAIN_SYMBOLS[d.companyDomain] || d3.symbolCircle;
                            return d3.symbol().type(sym).size(SYMBOL_SIZE)();
                        })
                        .style('fill', companyColorMap[d.company] || '#999')
                        .style('stroke', '#fff')
                        .style('stroke-width', 1.2);
                };
                imgEl.src = logoUrl;
            } else {
                // fallback to colored symbol
                node.append('path')
                    .attr('d', () => {
                        const sym = DOMAIN_SYMBOLS[d.companyDomain] || d3.symbolCircle;
                        return d3.symbol().type(sym).size(SYMBOL_SIZE)();
                    })
                    .style('fill', companyColorMap[d.company] || '#999')
                    .style('stroke', '#fff')
                    .style('stroke-width', 1.2);
            }
        });
    } else {
        // Default: colored domain-shaped symbols
        blipNodes.append('path')
            .attr('d', d => {
                const sym = DOMAIN_SYMBOLS[d.companyDomain] || d3.symbolCircle;
                return d3.symbol().type(sym).size(SYMBOL_SIZE)();
            })
            .style('fill', d => companyColorMap[d.company] || '#999')
            .style('stroke', '#fff')
            .style('stroke-width', 1.2);
    }

    // Add small text label to blip
    blipNodes.append("text")
        .attr("x", 8)
        .attr("y", 4)
        .text(d => d.name)
        .style("font-size", "10px")
        .style("fill", "var(--text-color)")
        .style("pointer-events", "none");

    // Domain legend (shapes)
    try {
        svg.selectAll('.domain-legend').remove();
        const domainList = Object.keys(DOMAIN_SYMBOLS);
        const legend = svg.append('g').attr('class', 'domain-legend').attr('transform', `translate(12,12)`);
        const item = legend.selectAll('g').data(domainList).enter().append('g').attr('transform', (d, i) => `translate(0, ${i * 22})`);
        item.append('path')
            .attr('d', d => {
                const sym = DOMAIN_SYMBOLS[d] || d3.symbolCircle;
                return d3.symbol().type(sym).size(80)();
            })
            .attr('transform', 'translate(8,8)')
            .style('fill', 'rgba(200,200,200,0.15)')
            .style('stroke', 'var(--text-color)')
            .style('stroke-width', 1);

        item.append('text')
            .text(d => d)
            .attr('x', 30)
            .attr('y', 12)
            .style('fill', 'var(--text-color)')
            .style('font-size', '12px');
    } catch (e) {
        // ignore legend errors
    }

    renderCompanyLegend(blips);
}

// Event Handlers (Dispatched to UI)
function handleMouseOver(event, d) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <h4>${d.name}</h4>
        <div class="tooltip-meta">
            <span>${d.rating.bedrijf}</span>
            <span>•</span>
            <span style="color: ${d.companyColor}">${d.rating.fase.toUpperCase()}</span>
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
