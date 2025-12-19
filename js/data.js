// Data handling for Technology Radar
import { loadLocalRatings, loadCustomTechnologies } from './localRatings.js';

let rawData = {
    technologies: [],
    ratings: [],
    toelichtingPerBedrijf: {},
    localRatings: [],
    customTechnologies: []
};

let activeFilters = {
    companies: new Set(),
    date: null,
    tags: new Set(),
    categories: new Set(),
    phases: new Set(),
    search: ''
};

let isUrlFiltered = false;
let urlFilteredKeys = new Set();

// Load data from JSON files and initialise filters
export async function loadData() {
    const [techRes, ratingsRes] = await Promise.all([
        fetch('data/technologies.json'),
        fetch('data/ratings.json')
    ]);
    const technologies = await techRes.json();
    const ratingsData = await ratingsRes.json();
    // Load companies metadata if available
    let companiesData = { companies: [] };
    try {
        const compRes = await fetch('data/companies.json');
        companiesData = await compRes.json();
    } catch (e) {
        // ignore missing companies file
    }
    rawData.technologies = technologies;
    rawData.ratings = ratingsData.statusPerBedrijf;
    rawData.companies = companiesData.companies || [];
    rawData.toelichtingPerBedrijf = ratingsData.toelichtingPerBedrijf || {};
    // Merge toelichtingPerBedrijf into company metadata

    // 1. Enrich existing companies in rawData.companies
    for (const company of rawData.companies) {
        if (rawData.toelichtingPerBedrijf[company.name]) {
            Object.assign(company, rawData.toelichtingPerBedrijf[company.name]);
        }
    }

    // 2. Add companies from toelichtingPerBedrijf that are missing in rawData.companies
    //    (This ensures getCompanyByName finds them even if companies.json is incomplete)
    const existingNames = new Set(rawData.companies.map(c => c.name));
    for (const [name, details] of Object.entries(rawData.toelichtingPerBedrijf)) {
        if (!existingNames.has(name)) {
            rawData.companies.push({
                name: name,
                ...details
            });
            existingNames.add(name);
        }
    }

    // Load local ratings and custom technologies from localStorage
    rawData.localRatings = loadLocalRatings();
    rawData.customTechnologies = loadCustomTechnologies();

    // Load and merge local company details (local overrides server)
    const { loadCompanyDetails } = await import('./localRatings.js');
    const localCompanyDetails = loadCompanyDetails();

    // Merge local company details into existing companies (local takes precedence)
    for (const company of rawData.companies) {
        if (localCompanyDetails[company.name]) {
            Object.assign(company, localCompanyDetails[company.name]);
        }
    }

    // Add companies from local storage that don't exist in rawData.companies
    const existingCompanyNames = new Set(rawData.companies.map(c => c.name));
    for (const [name, details] of Object.entries(localCompanyDetails)) {
        if (!existingCompanyNames.has(name)) {
            rawData.companies.push({
                name: name,
                ...details
            });
        }
    }

    // Initialise all companies as active
    // Include companies from companies.json even if they have no ratings
    return processRadarData();
}

export function handleFreshRatings(newRatings, newToelichtingPerBedrijf) {
    rawData.ratings = newRatings;
    rawData.toelichtingPerBedrijf = newToelichtingPerBedrijf || {};
    return processRadarData();
}

// Refresh local ratings and custom technologies from localStorage
export function refreshLocalData() {
    rawData.localRatings = loadLocalRatings();
    rawData.customTechnologies = loadCustomTechnologies();
    return processRadarData();
}

function processRadarData() {
    // Merge server ratings with local ratings
    const allRatings = [...rawData.ratings, ...rawData.localRatings];
    const ratingCompanies = [...new Set(allRatings.map(r => r.bedrijf))];


    // 1. Enrich existing companies in rawData.companies
    for (const company of rawData.companies) {
        if (rawData.toelichtingPerBedrijf[company.name]) {
            Object.assign(company, rawData.toelichtingPerBedrijf[company.name]);
        }
    }

    // 2. Add companies from toelichtingPerBedrijf that are missing in rawData.companies
    //    (This ensures getCompanyByName finds them even if companies.json is incomplete)
    const existingNames = new Set(rawData.companies.map(c => c.name));
    for (const [name, details] of Object.entries(rawData.toelichtingPerBedrijf)) {
        if (!existingNames.has(name)) {
            rawData.companies.push({
                name: name,
                ...details
            });
            existingNames.add(name);
        }
    }

    const metaCompanies = (rawData.companies || []).map(c => c.name).filter(Boolean);
    const companies = [...new Set([...ratingCompanies, ...metaCompanies])];




    if (!isUrlFiltered || !urlFilteredKeys.has('companies')) {
        for (const c of companies) activeFilters.companies.add(c);
    }

    // Merge server technologies with custom technologies
    const allTechnologies = [...rawData.technologies, ...rawData.customTechnologies];

    // Initialise all categories as active
    const categories = [...new Set(allTechnologies.map(t => t.category))];
    if (!isUrlFiltered || !urlFilteredKeys.has('categories')) {
        for (const c of categories) activeFilters.categories.add(c);
    }

    // Initialise all phases as active (from ratings data)
    const phases = [...new Set(allRatings.map(r => (r.fase || '').toLowerCase()))].filter(p => p);
    if (!isUrlFiltered || !urlFilteredKeys.has('phases')) {
        for (const p of phases) activeFilters.phases.add(p);
    }

    return processData();
}

export function getFilters() {
    // Combine companies that have ratings with company metadata so sidebar shows all companies
    const ratingCompanies = rawData.ratings.map(r => r.bedrijf || '').filter(Boolean);
    const metaCompanies = (rawData.companies || []).map(c => c.name).filter(Boolean);
    const companies = [...new Set([...ratingCompanies, ...metaCompanies])].sort((a, b) => a.localeCompare(b));
    const allTags = rawData.technologies.flatMap(t => t.tags);
    const tags = [...new Set(allTags)].sort((a, b) => a.localeCompare(b));
    const categories = [...new Set(rawData.technologies.map(t => t.category))].sort((a, b) => a.localeCompare(b));
    const PHASE_ORDER = ['adopt', 'trial', 'assess', 'hold', 'deprecate'];
    const phases = PHASE_ORDER; // Expose fixed order for UI and radar
    // Build domain grouping using companies metadata (if available)
    const companyMeta = rawData.companies || [];
    const companyToDomain = {};
    for (const c of companyMeta) {
        if (c && c.name) companyToDomain[c.name] = c.domain || 'Other';
    }

    const domainsMap = {};
    for (const c of companies) {
        const d = companyToDomain[c] || 'Other';
        if (!domainsMap[d]) domainsMap[d] = [];
        domainsMap[d].push(c);
    }

    const domains = Object.keys(domainsMap).sort((a, b) => a.localeCompare(b));

    return {
        companies,
        tags,
        categories,
        phases,
        domainsMap,
        domains,
        active: activeFilters
    };
}

export function setFilter(type, value, isAdd) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    if (type === 'company') {
        if (isAdd) activeFilters.companies.add(value);
        else activeFilters.companies.delete(value);
    } else if (type === 'tag') {
        if (isAdd) activeFilters.tags.add(value);
        else activeFilters.tags.delete(value);
    } else if (type === 'category') {
        if (isAdd) activeFilters.categories.add(value);
        else activeFilters.categories.delete(value);
    } else if (type === 'phase') {
        const v = (value || '').toLowerCase();
        if (!v) return processData();
        if (isAdd) activeFilters.phases.add(v);
        else activeFilters.phases.delete(v);
    } else if (type === 'date') {
        activeFilters.date = value ? new Date(value) : null;
    } else if (type === 'search') {
        activeFilters.search = value.toLowerCase();
    }
    return processData();
}

export function setAllCompanies(shouldSelect) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    if (shouldSelect) {
        const allCompanies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
        for (const c of allCompanies) activeFilters.companies.add(c);
    } else {
        activeFilters.companies.clear();
    }
    return processData();
}

export function setAllCategories(shouldSelect) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    if (shouldSelect) {
        const allCategories = [...new Set(rawData.technologies.map(t => t.category))];
        for (const c of allCategories) activeFilters.categories.add(c);
    } else {
        activeFilters.categories.clear();
    }
    return processData();
}

export function setAllPhases(shouldSelect) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    const PHASE_ORDER = ['adopt', 'trial', 'assess', 'hold', 'deprecate'];
    if (shouldSelect) {
        for (const p of PHASE_ORDER) activeFilters.phases.add(p);
    } else {
        activeFilters.phases.clear();
    }
    return processData();
}

export function setExclusivePhase(phase) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    activeFilters.phases.clear();
    if (phase) activeFilters.phases.add(phase.toLowerCase());
    return processData();
}

export function setExclusiveCategory(category) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    activeFilters.categories.clear();
    activeFilters.categories.add(category);
    return processData();
}

export function setExclusiveCompany(company) {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    activeFilters.companies.clear();
    activeFilters.companies.add(company);
    return processData();
}

export function getRatingsForTech(identifier) {
    return rawData.ratings.filter(r => r.identifier === identifier);
}

export function getTechnology(identifier) {
    const tech = rawData.technologies.find(t => t.identifier === identifier);
    if (tech) return tech;
    // Fallback to custom technologies
    return rawData.customTechnologies.find(t => t.identifier === identifier);
}

export function getCompanyByName(name) {
    if (!name) return null;
    return rawData.companies.find(c => c.name === name) || null;
}

export function getRatingsForCompany(companyName) {
    if (!companyName) return [];
    return rawData.ratings.filter(r => r.bedrijf === companyName);
}

export function getRatingCountsByCategoryForCompany(companyName) {
    const counts = {};
    if (!companyName) return counts;
    const ratings = getRatingsForCompany(companyName);
    for (const r of ratings) {
        const tech = rawData.technologies.find(t => t.identifier === r.identifier);
        const cat = tech ? tech.category : 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
}

export function resetAllFilters() {
    isUrlFiltered = false;
    urlFilteredKeys.clear();
    // Restore companies
    const allCompanies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
    activeFilters.companies = new Set(allCompanies);

    // Restore categories
    const allCategories = [...new Set(rawData.technologies.map(t => t.category))];
    activeFilters.categories = new Set(allCategories);

    // Restore phases to canonical order
    const PHASE_ORDER = ['adopt', 'trial', 'assess', 'hold', 'deprecate'];
    activeFilters.phases = new Set(PHASE_ORDER);

    // Clear tags, date and search
    activeFilters.tags.clear();
    activeFilters.date = null;
    activeFilters.search = '';

    return processData();
}

/**
 * Apply filters from URL search parameters.
 * @param {URLSearchParams} searchParams 
 */
export function applyUrlFilters(searchParams) {
    if (!searchParams) return processData();

    urlFilteredKeys.clear();

    // Mapping params to filter types
    const paramMap = {
        'company': 'companies',
        'category': 'categories',
        'phase': 'phases',
        'tag': 'tags'
    };

    let hasAnyFilter = false;

    // Get all available metadata for fuzzy matching
    const { companies: allCompanies, categories: allCategories, tags: allTags } = getFilters();
    const fuzzyMap = {
        'company': allCompanies,
        'category': allCategories,
        'tag': allTags
    };

    for (const [param, filterKey] of Object.entries(paramMap)) {
        if (searchParams.has(param)) {
            hasAnyFilter = true;
            isUrlFiltered = true;
            urlFilteredKeys.add(filterKey);
            activeFilters[filterKey].clear();
            const values = searchParams.getAll(param);
            for (let val of values) {
                if (filterKey === 'phases') val = val.toLowerCase();

                // Fuzzy matching for company, category, and tag
                if (fuzzyMap[param]) {
                    const matches = fuzzyMap[param].filter(item => item.toLowerCase().includes(val.toLowerCase()));
                    if (matches.length === 1) {
                        val = matches[0];
                    }
                }

                activeFilters[filterKey].add(val);
            }
        }
    }

    return processData();
}

export function getIsUrlFiltered() {
    return isUrlFiltered;
}

export function getProcessedData() {
    return processData();
}

function processData() {
    // Merge server and local data
    const allRatings = [...rawData.ratings, ...rawData.localRatings];
    const allTechnologies = [...rawData.technologies, ...rawData.customTechnologies];

    // 1. Filter Ratings (company & date)
    const filteredRatings = allRatings.filter(r => {
        if (!activeFilters.companies.has(r.bedrijf)) return false;
        if (activeFilters.date) {
            const ratingDate = new Date(r.datumBeoordeling);
            if (ratingDate < activeFilters.date) return false;
        }
        return true;
    });

    // 2. Map Ratings to Technologies with additional filters
    const blips = filteredRatings.map(rating => {
        const tech = allTechnologies.find(t => t.identifier === rating.identifier);
        if (!tech) return null;
        if (!activeFilters.categories.has(tech.category)) return null;
        const phase = (rating.fase || '').toLowerCase();
        if (activeFilters.phases.size > 0 && !activeFilters.phases.has(phase)) return null;
        if (activeFilters.tags.size > 0) {
            const hasTag = tech.tags.some(tag => activeFilters.tags.has(tag));
            if (!hasTag) return null;
        }
        if (activeFilters.search) {
            const s = activeFilters.search;
            const matchesName = tech.name?.toLowerCase().includes(s);
            const matchesVendor = (tech.vendor || '').toLowerCase().includes(s);
            const matchesDesc = (tech.description || '').toLowerCase().includes(s);
            if (!matchesName && !matchesVendor && !matchesDesc) return null;
        }
        const companyMeta = rawData.companies.find(c => c.name === rating.bedrijf) || {};
        return {
            ...tech,
            rating,
            id: `${rating.identifier}-${rating.bedrijf}`,
            company: rating.bedrijf,
            companyDomain: companyMeta.domain || 'Other',
            companyHomepage: companyMeta.homepage || '',
            companyLogo: companyMeta.logo || ''
        };
    }).filter(b => b !== null);

    return {
        blips,
        categories: [...activeFilters.categories].sort((a, b) => a.localeCompare(b)),
        // Return only the active phases in the canonical order so the radar redraws
        // as if unselected rings do not exist.
        phases: ['adopt', 'trial', 'assess', 'hold', 'deprecate'].filter(p => activeFilters.phases.has(p)),
        technologies: allTechnologies
    };
}
