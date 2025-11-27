// radar-colors.js
// Manages color assignments for categories and companies

const BASE_SEGMENT_COLORS = [
    "rgba(59, 130, 246, 0.3)",
    "rgba(16, 185, 129, 0.3)",
    "rgba(245, 158, 11, 0.3)",
    "rgba(239, 68, 68, 0.3)",
    "rgba(139, 92, 246, 0.3)"
];

const BASE_COMPANY_COLORS = d3.schemeCategory10.slice();

// --- Category Colors ---

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

export function ensureCategoryColors(categoriesList) {
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

// --- Company Colors ---

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

export function ensureCompanyColors(blipsList) {
    const map = loadCompanyColorMap();
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

// --- Phase Colors ---

export function getPhaseColor(phase) {
    switch (phase.toLowerCase()) {
        case 'adopt': return 'var(--color-adopt)';
        case 'trial': return 'var(--color-trial)';
        case 'assess': return 'var(--color-assess)';
        case 'hold': return 'var(--color-hold)';
        case 'deprecate': return 'var(--color-deprecated)';
        default: return '#ccc';
    }
}
