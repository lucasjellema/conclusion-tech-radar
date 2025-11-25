/**
 * localRatings.js
 * Module for managing user-created ratings stored in browser localStorage
 * 
 * Local ratings are stored with the same structure as server ratings:
 * {
 *   identifier: string,
 *   bedrijf: string,
 *   fase: string,
 *   datumBeoordeling: string,
 *   toelichting: string,
 *   beoordelaars: string[]
 * }
 */

const STORAGE_KEY = 'local-ratings';
const CUSTOM_TECH_KEY = 'local-technologies';

/**
 * Load local ratings from localStorage
 * @returns {Array} Array of rating objects
 */
export function loadLocalRatings() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading local ratings:', error);
        return [];
    }
}

/**
 * Save local ratings to localStorage
 * @param {Array} ratings - Array of rating objects
 */
export function saveLocalRatings(ratings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
    } catch (error) {
        console.error('Error saving local ratings:', error);
    }
}

/**
 * Load custom technologies from localStorage
 * @returns {Array} Array of technology objects
 */
export function loadCustomTechnologies() {
    try {
        const data = localStorage.getItem(CUSTOM_TECH_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading custom technologies:', error);
        return [];
    }
}

/**
 * Save custom technologies to localStorage
 * @param {Array} technologies - Array of technology objects
 */
export function saveCustomTechnologies(technologies) {
    try {
        localStorage.setItem(CUSTOM_TECH_KEY, JSON.stringify(technologies));
    } catch (error) {
        console.error('Error saving custom technologies:', error);
    }
}

/**
 * Add a new local rating
 * @param {Object} rating - Rating object to add
 * @returns {Object} The added rating with generated ID
 */
export function addLocalRating(rating) {
    const ratings = loadLocalRatings();

    // Generate unique ID based on timestamp
    const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRating = {
        ...rating,
        _localId: id,
        _isLocal: true
    };

    ratings.push(newRating);
    saveLocalRatings(ratings);

    return newRating;
}

/**
 * Update an existing local rating
 * @param {string} id - Local ID of the rating to update
 * @param {Object} updatedRating - Updated rating data
 * @returns {boolean} True if successful, false otherwise
 */
export function updateLocalRating(id, updatedRating) {
    const ratings = loadLocalRatings();
    const index = ratings.findIndex(r => r._localId === id);

    if (index === -1) {
        console.error('Rating not found:', id);
        return false;
    }

    ratings[index] = {
        ...updatedRating,
        _localId: id,
        _isLocal: true
    };

    saveLocalRatings(ratings);
    return true;
}

/**
 * Delete a local rating
 * @param {string} id - Local ID of the rating to delete
 * @returns {boolean} True if successful, false otherwise
 */
export function deleteLocalRating(id) {
    const ratings = loadLocalRatings();
    const filtered = ratings.filter(r => r._localId !== id);

    if (filtered.length === ratings.length) {
        console.error('Rating not found:', id);
        return false;
    }

    saveLocalRatings(filtered);
    return true;
}

/**
 * Add a custom technology
 * @param {Object} technology - Technology object to add
 * @returns {Object} The added technology
 */
export function addCustomTechnology(technology) {
    const technologies = loadCustomTechnologies();

    // Generate identifier from name
    const identifier = technology.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const newTech = {
        identifier,
        name: technology.name,
        category: technology.category || 'Other',
        tags: technology.tags || [],
        description: technology.description || '',
        logo: technology.logo || '',
        vendor: technology.vendor || '',
        homepage: technology.homepage || '',
        _isCustom: true
    };

    technologies.push(newTech);
    saveCustomTechnologies(technologies);

    return newTech;
}

/**
 * Get all local ratings
 * @returns {Array} Array of all local ratings
 */
export function getLocalRatings() {
    return loadLocalRatings();
}

/**
 * Get all custom technologies
 * @returns {Array} Array of all custom technologies
 */
export function getCustomTechnologies() {
    return loadCustomTechnologies();
}

/**
 * Export ratings to JSON format matching server ratings structure
 * @param {string} companyName - Name of the company for the export
 * @returns {Object} JSON object with statusPerBedrijf array
 */
export function exportRatingsJSON(companyName) {
    const ratings = loadLocalRatings();

    // Filter ratings for the specified company
    const companyRatings = companyName
        ? ratings.filter(r => r.bedrijf === companyName)
        : ratings;

    // Remove local-specific properties
    const cleanedRatings = companyRatings.map(r => {
        const { _localId, _isLocal, ...cleanRating } = r;
        return cleanRating;
    });

    return {
        statusPerBedrijf: cleanedRatings
    };
}

/**
 * Download ratings as JSON file
 * @param {string} companyName - Name of the company for the export
 */
export function downloadRatingsJSON(companyName) {
    const data = exportRatingsJSON(companyName);
    const json = JSON.stringify(data, null, 2);

    // Create filename from company name
    const filename = companyName
        ? `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ratings.json`
        : 'local-ratings.json';

    // Create blob and download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Clear all local ratings (for testing/reset)
 */
export function clearLocalRatings() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear all custom technologies (for testing/reset)
 */
export function clearCustomTechnologies() {
    localStorage.removeItem(CUSTOM_TECH_KEY);
}
