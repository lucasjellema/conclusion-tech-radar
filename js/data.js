let rawData = {
    technologies: [],
    ratings: []
};

let activeFilters = {
    companies: new Set(),
    date: null,
    tags: new Set(),
    categories: new Set()
};

export async function loadData() {
    const [techRes, ratingsRes] = await Promise.all([
        fetch('data/technologies.json'),
        fetch('data/ratings.json')
    ]);

    const technologies = await techRes.json();
    const ratingsData = await ratingsRes.json();

    rawData.technologies = technologies;
    rawData.ratings = ratingsData.statusPerBedrijf;

    // Initialize all companies as active by default
    const companies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
    companies.forEach(c => activeFilters.companies.add(c));

    // Initialize all categories as active by default
    const categories = [...new Set(rawData.technologies.map(t => t.category))];
    categories.forEach(c => activeFilters.categories.add(c));

    return processData();
}

export function getFilters() {
    const companies = [...new Set(rawData.ratings.map(r => r.bedrijf))].sort();
    const allTags = rawData.technologies.flatMap(t => t.tags);
    const tags = [...new Set(allTags)].sort();
    const categories = [...new Set(rawData.technologies.map(t => t.category))].sort();

    return {
        companies,
        tags,
        categories,
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
    } else if (type === 'date') {
        activeFilters.date = value ? new Date(value) : null;
    }
    return processData();
}

export function setAllCompanies(shouldSelect) {
    if (shouldSelect) {
        // Add all companies
        const allCompanies = [...new Set(rawData.ratings.map(r => r.bedrijf))];
        allCompanies.forEach(c => activeFilters.companies.add(c));
    } else {
        activeFilters.companies.clear();
    }
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

function processData() {
    // 1. Filter Ratings
    const filteredRatings = rawData.ratings.filter(r => {
        // Company Filter
        if (!activeFilters.companies.has(r.bedrijf)) return false;

        // Date Filter
        if (activeFilters.date) {
            const ratingDate = new Date(r.datumBeoordeling);
            if (ratingDate < activeFilters.date) return false;
        }

        return true;
    });

    // 2. Map Ratings to Technologies
    // A technology can have multiple ratings. We need to decide how to place it.
    // For the radar, we usually show the "most advanced" or "average" phase, or duplicate blips.
    // The requirement says: "the same technology can appear more than once".
    // So we will create a blip for EACH rating that passes the filter.

    const blips = filteredRatings.map(rating => {
        const tech = rawData.technologies.find(t => t.identifier === rating.identifier);
        if (!tech) return null;

        // Category Filter
        if (!activeFilters.categories.has(tech.category)) return null;

        // Tag Filter
        // "only entries with selected (highlighted) tags are to be included"
        // If NO tags are selected, show ALL (standard behavior).
        // If tags ARE selected, check if tech has at least one.
        if (activeFilters.tags.size > 0) {
            const hasTag = tech.tags.some(tag => activeFilters.tags.has(tag));
            if (!hasTag) return null;
        }

        return {
            ...tech,
            rating: rating,
            id: `${rating.identifier}-${rating.bedrijf}` // Unique ID for D3
        };
    }).filter(b => b !== null);

    // We need to pass ALL categories to the radar so it can draw the segments, 
    // even if some are filtered out (to maintain geometry), OR we only pass active ones.
    // If we filter categories, usually we want to hide the slice.
    // Let's pass active categories for the radar to draw.

    return {
        blips,
        categories: [...activeFilters.categories].sort(), // Only active categories
        phases: ['adopt', 'trial', 'assess', 'hold', 'deprecate'] // Order matters
    };
}
