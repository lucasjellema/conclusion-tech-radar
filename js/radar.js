// D3 Radar Visualization

import { t } from './i18n.js';
import { getCompanyByName, getRatingCountsByCategoryForCompany, getRatingsForCompany } from './data.js';

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

function renderCompanyLegend(blips) {
    let legendContainer = document.getElementById('company-legend');
    if (!legendContainer) {
        const radarContainer = document.getElementById('radar').parentElement;
        // Ensure parent has relative positioning for absolute child
        if (getComputedStyle(radarContainer).position === 'static') {
            radarContainer.style.position = 'relative';
        }
        legendContainer = document.createElement('div');
        legendContainer.id = 'company-legend';
        legendContainer.className = 'company-legend';
        radarContainer.appendChild(legendContainer);
    }
    // 1. Filter companies by visible blips
    const companyCounts = {};
    const companyMeta = {}; // Store metadata (logo, domain)

    blips.forEach(blip => {
        const company = blip.company;
        if (!company) {
            return;
        }
        companyCounts[company] = (companyCounts[company] || 0) + 1;
        if (!companyMeta[company]) {
            companyMeta[company] = {
                name: company,
                logo: blip.companyLogo,
                domain: blip.companyDomain,
                color: blip.companyColor,
                homepage: blip.companyHomepage
            };
        }
    });

    const sortedCompanies = Object.keys(companyCounts).sort((a, b) => {
        // Sort by count (desc)
        const countDiff = companyCounts[b] - companyCounts[a];
        if (countDiff !== 0) return countDiff;
        // Then by name (asc)
        return a.localeCompare(b);
    });

    legendContainer.innerHTML = '';

    if (sortedCompanies.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'legend-item';
        emptyMsg.style.cursor = 'default';
        emptyMsg.style.color = '#94a3b8';
        emptyMsg.textContent = 'No companies visible';
        legendContainer.appendChild(emptyMsg);
        return;
    }

    sortedCompanies.forEach(company => {
        const meta = companyMeta[company];
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.dataset.company = company;

        // Domain symbol mapping (same as radar)
        const DOMAIN_SYMBOLS = {
            'Cloud & Mission Critical': 'square',
            'Strategy & Business Consultany': 'triangle',
            'Enterprise Applications': 'diamond',
            'Data & AI': 'star',
            'Experience & Software': 'circle'
        };

        // Add blip symbol (SVG) - 2.5x size
        const symbolSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        symbolSvg.setAttribute('width', '40');
        symbolSvg.setAttribute('height', '40');
        symbolSvg.setAttribute('viewBox', '-20 -20 40 40');
        symbolSvg.style.marginRight = '8px';
        symbolSvg.style.flexShrink = '0';

        const symbolShape = DOMAIN_SYMBOLS[meta.domain] || 'circle';
        let pathData = '';

        // Generate path data for each shape (scaled 2.5x)
        switch (symbolShape) {
            case 'circle':
                pathData = 'M 0,-12.5 A 12.5,12.5 0 1,1 0,12.5 A 12.5,12.5 0 1,1 0,-12.5';
                break;
            case 'square':
                pathData = 'M -10,-10 L 10,-10 L 10,10 L -10,10 Z';
                break;
            case 'triangle':
                pathData = 'M 0,-12.5 L 10.825,6.25 L -10.825,6.25 Z';
                break;
            case 'diamond':
                pathData = 'M 0,-12.5 L 12.5,0 L 0,12.5 L -12.5,0 Z';
                break;
            case 'star':
                // 5-pointed star
                const points = [];
                for (let i = 0; i < 10; i++) {
                    const radius = i % 2 === 0 ? 12.5 : 5;
                    const angle = (i * Math.PI / 5) - Math.PI / 2;
                    points.push(`${radius * Math.cos(angle)},${radius * Math.sin(angle)}`);
                }
                pathData = `M ${points.join(' L ')} Z`;
                break;
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', meta.color || '#999');
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '1');
        symbolSvg.appendChild(path);
        item.appendChild(symbolSvg);

        // Logo or Symbol
        if (meta.logo) {
            const img = document.createElement('img');
            img.src = meta.logo;
            img.className = 'legend-logo';
            img.alt = company;
            item.appendChild(img);
        }

        // Name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'legend-name';
        nameSpan.textContent = company;
        item.appendChild(nameSpan);

        // Events
        item.addEventListener('mouseenter', () => {
            highlightCompany(company);
            // Show tooltip
            const tEl = document.getElementById('tooltip');
            tEl.innerHTML = `<strong>${company}</strong><div style="margin-top:4px; font-size:0.8rem; color:#94a3b8">(${meta.domain})</div>`;
            tEl.classList.remove('hidden');
            // Position tooltip near the legend item (to the left)
            const rect = item.getBoundingClientRect();
            tEl.style.left = (rect.left - tEl.offsetWidth + 8) + 'px'; // 10px gap to the left
            tEl.style.top = (rect.top + 0.3 * rect.height - tEl.offsetHeight / 2) + 'px'; // Vertically a little higher than the center
        });
        item.addEventListener('mouseleave', () => {
            resetHighlight();
            document.getElementById('tooltip').classList.add('hidden');
        });
        item.addEventListener('click', () => {
            const meta = getCompanyByName(company) || { name: company };
            const counts = getRatingCountsByCategoryForCompany(company);
            const ratings = getRatingsForCompany(company);
            const modalData = {
                type: 'company',
                name: meta.name || company,
                description: meta.description || '',
                logo: meta.logo || '',
                homepage: meta.homepage || '',
                domain: meta.domain || '',
                ratingCounts: counts,
                ratings: ratings
            };
            document.dispatchEvent(new CustomEvent('open-modal', { detail: modalData }));
        });
        legendContainer.appendChild(item);
    });
}

function highlightCompany(companyName) {
    d3.selectAll('.blip')
        .classed('dimmed', true)
        .filter(d => d.company === companyName)
        .classed('dimmed', false)
        .classed('highlighted', true)
        .raise();
}

function resetHighlight() {
    d3.selectAll('.blip')
        .classed('highlighted', false)
        .classed('dimmed', false);
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

    const BASE_SEGMENT_COLORS = [
        "rgba(59, 130, 246, 0.3)",
        "rgba(16, 185, 129, 0.3)",
        "rgba(245, 158, 11, 0.3)",
        "rgba(239, 68, 68, 0.3)",
        "rgba(139, 92, 246, 0.3)"];

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

    // Compute ring radius and angle slice based on number of active phases/categories
    const angleSlice = Math.PI * 2 / (categories.length || 1);
    const ringRadius = radius / (phases.length || 1);

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
                    color = (function (c) { return c.replace('rgb', 'rgba').replace(')', ',0.28)'); })((d3.color(color).formatRgb()));
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

    // 3. Calculate Blip Positions using polar grid distribution
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

    // Prepare company color mapping per-domain and domain->symbol mapping
    function loadCompanyColorMap() {
        try {
            const raw = sessionStorage.getItem('radarCompanyColors');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveCompanyColorMap(map) {
        try {
            sessionStorage.setItem('radarCompanyColors', JSON.stringify(map));
        } catch (e) {
            // ignore
        }
    }

    function ensureCompanyColors(blipsList) {
        const map = loadCompanyColorMap();
        const BASE_COMPANY_COLORS = d3.schemeCategory10.slice();
        // gather companies by domain
        const domainMap = {};
        for (const b of blipsList) {
            const domain = b.companyDomain || 'Other';
            domainMap[domain] = domainMap[domain] || new Set();
            domainMap[domain].add(b.company);
        }

        for (const [domain, companiesSet] of Object.entries(domainMap)) {
            const companies = Array.from(companiesSet);
            // preserve any existing assignments for these companies
            let nextIdx = 0;
            for (const c of companies) {
                if (!Object.hasOwn(map, c)) {
                    let color;
                    if (nextIdx < BASE_COMPANY_COLORS.length) {
                        color = BASE_COMPANY_COLORS[nextIdx];
                        nextIdx++;
                    } else {
                        const idx = Object.keys(map).length;
                        color = d3.interpolateRainbow((idx % 12) / 12);
                    }
                    map[c] = color;
                }
            }
        }
        saveCompanyColorMap(map);
        return map;
    }

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
