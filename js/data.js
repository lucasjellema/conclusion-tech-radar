// Data handling for Technology Radar
let rawData = {
    technologies: [],
    ratings: []
};

let activeFilters = {
    companies: new Set(),
    date: null,
    tags: new Set(),
    categories: new Set(),
    phases: new Set(),
    search: ''
};

// Load data from JSON files and initialise filters
export async function loadData() {
    const [techRes, ratingsRes] = await Promise.all([
        fetch('data/technologies.json'),
        fetch('data/ratings.json')
    ]);
    const technologies = await techRes.json();
    const ratingsData = await ratingsRes.json();
    rawData.technologies = technologies;
    rawData.ratings = ratingsData.statusPerBedrijf;

    // Initialise all companies as active
    const companies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
    for (const c of companies) activeFilters.companies.add(c);

    // Initialise all categories as active
    const categories = [...new Set(rawData.technologies.map(t => t.category))];
    for (const c of categories) activeFilters.categories.add(c);

    // Initialise all phases as active (from ratings data)
    const phases = [...new Set(rawData.ratings.map(r => (r.fase || '').toLowerCase()))].filter(p => p);
    for (const p of phases) activeFilters.phases.add(p);

    return processData();
}

export function getFilters() {
    const companies = [...new Set(rawData.ratings.map(r => r.bedrijf))].sort((a, b) => a.localeCompare(b));
    const allTags = rawData.technologies.flatMap(t => t.tags);
    const tags = [...new Set(allTags)].sort((a, b) => a.localeCompare(b));
    const categories = [...new Set(rawData.technologies.map(t => t.category))].sort((a, b) => a.localeCompare(b));
    const PHASE_ORDER = ['adopt', 'trial', 'assess', 'hold', 'deprecate'];
    const phases = PHASE_ORDER; // Expose fixed order for UI and radar
    return {
        companies,
        tags,
        categories,
        phases,
        active: activeFilters
    };
}

export function setFilter(type, value, isAdd) {
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
    if (shouldSelect) {
        const allCompanies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
        for (const c of allCompanies) activeFilters.companies.add(c);
    } else {
        activeFilters.companies.clear();
    }
    return processData();
}

export function setAllCategories(shouldSelect) {
    if (shouldSelect) {
        const allCategories = [...new Set(rawData.technologies.map(t => t.category))];
        for (const c of allCategories) activeFilters.categories.add(c);
    } else {
        activeFilters.categories.clear();
    }
    return processData();
}

export function setAllPhases(shouldSelect) {
    const PHASE_ORDER = ['adopt', 'trial', 'assess', 'hold', 'deprecate'];
    if (shouldSelect) {
        for (const p of PHASE_ORDER) activeFilters.phases.add(p);
    } else {
        activeFilters.phases.clear();
    }
    return processData();
}

export function setExclusivePhase(phase) {
    activeFilters.phases.clear();
    if (phase) activeFilters.phases.add(phase.toLowerCase());
    return processData();
}

export function setExclusiveCategory(category) {
    activeFilters.categories.clear();
    activeFilters.categories.add(category);
    return processData();
}

export function getRatingsForTech(identifier) {
    return rawData.ratings.filter(r => r.identifier === identifier);
}

export function resetAllFilters() {
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

export function getProcessedData() {
    return processData();
}

function processData() {
    // 1. Filter Ratings (company & date)
    const filteredRatings = rawData.ratings.filter(r => {
        if (!activeFilters.companies.has(r.bedrijf)) return false;
        if (activeFilters.date) {
            const ratingDate = new Date(r.datumBeoordeling);
            if (ratingDate < activeFilters.date) return false;
        }
        return true;
    });

    // 2. Map Ratings to Technologies with additional filters
    const blips = filteredRatings.map(rating => {
        const tech = rawData.technologies.find(t => t.identifier === rating.identifier);
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
        return {
            ...tech,
            rating,
            id: `${rating.identifier}-${rating.bedrijf}`
        };
    }).filter(b => b !== null);

    return {
        blips,
        categories: [...activeFilters.categories].sort((a, b) => a.localeCompare(b)),
        // Return only the active phases in the canonical order so the radar redraws
        // as if unselected rings do not exist.
        phases: ['adopt', 'trial', 'assess', 'hold', 'deprecate'].filter(p => activeFilters.phases.has(p))
    };
}
