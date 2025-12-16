// radar-legend.js
// Manages the company legend rendering and interaction

import { getCompanyByName, getRatingCountsByCategoryForCompany, getRatingsForCompany } from '../data.js';

export function renderCompanyLegend(blips) {
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
            'Business Consultancy': 'triangle',
            'Enterprise Applications': 'diamond',
            'Data & AI': 'star',
            'Experience, Development & Software': 'circle'
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
        let clickTimer = null;
        item.addEventListener('click', () => {
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
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
                    belangrijksteOnderwerpen: meta.belangrijksteOnderwerpen || '',
                    toelichting: meta.toelichting || '',
                    ratingCounts: counts,
                    ratings: ratings
                };
                document.dispatchEvent(new CustomEvent('open-modal', { detail: modalData }));
                clickTimer = null;
            }, 250);
        });

        item.addEventListener('dblclick', () => {
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            document.dispatchEvent(new CustomEvent('filter-company', { detail: company }));
        });
        legendContainer.appendChild(item);
    });
}

export function highlightCompany(companyName) {
    d3.selectAll('.blip')
        .classed('dimmed', true)
        .filter(d => d.company === companyName)
        .classed('dimmed', false)
        .classed('highlighted', true)
        .raise();
}

export function resetHighlight() {
    d3.selectAll('.blip')
        .classed('highlighted', false)
        .classed('dimmed', false);
}
