/**
 * dataService.js
 * Data service module for retrieving and caching data from the API
 * 
 * This module handles data retrieval from the configured endpoint using
 * the authenticated user's ID token as authorization. The data is retained
 * in memory throughout the session.
 */

import { dataEndpoint} from './dataConfig.js';
import { getIdToken } from './auth.js';

// Constants for status and error messages
const STATUS = {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
};

// In-memory cache for data
const dataCache = {
    // Current data fetch status
    status: STATUS.IDLE,

    // Last error message if any
    error: null,

    // Timestamp of last successful fetch
    lastFetched: null,

    // The cached data
    data: null,

    // Cached user data
    userdata: null
};

/**
 * Get data from the API using the authenticated user's ID token
 * @param {boolean} [forceRefresh=false] - Force a refresh even if data is already cached
 * @returns {Promise<Object>} The fetched data
 */
export async function getData(forceRefresh = false) {
    // If data is already cached and refresh is not forced, return cached data
    if (!forceRefresh && dataCache.data !== null) {
        console.log('Returning cached data from previous fetch');
        return dataCache.data;
    }

    // Get the ID token for authentication
    const idToken = getIdToken();

    // Check if token is available
    if (!idToken) {
        const error = 'No authentication token available. Please sign in.';
        dataCache.status = STATUS.ERROR;
        dataCache.error = error;
        throw new Error(error);
    }

    try {
        // Update status to loading
        dataCache.status = STATUS.LOADING;
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        };

        const endpoint = dataEndpoint + "?ts=" + Date.now();
        console.log('Fetching data from endpoint:', endpoint);
        // Make authenticated request to the data endpoint ; bust caching by adding ts query parameter
        const response = await fetch(endpoint, options);

        // Check if request was successful
        if (!response.ok) {
            const errorText = await response.text();
            const error = `API request failed with status ${response.status}: ${errorText}`;
            dataCache.status = STATUS.ERROR;
            dataCache.error = error;
            throw new Error(error);
        }

        // Parse response as JSON
        const data = await response.json();

        // Update cache with fetched data
        dataCache.status = STATUS.SUCCESS;
        dataCache.data = data;
        dataCache.lastFetched = new Date();
        dataCache.error = null;

        return data;
    } catch (error) {
        // Handle fetch or parsing errors
        dataCache.status = STATUS.ERROR;
        dataCache.error = error.message || 'Unknown error occurred while fetching data';
        throw error;
    }
}

/**
 * Get the current status of data fetching
 * @returns {Object} Object containing status info, data, and any error message
 */
export function getDataStatus() {
    return {
        status: dataCache.status,
        isLoading: dataCache.status === STATUS.LOADING,
        isError: dataCache.status === STATUS.ERROR,
        hasData: dataCache.data !== null,
        error: dataCache.error,
        lastFetched: dataCache.lastFetched
    };
}

/**
 * Clear the cached data
 */
export function clearDataCache() {
    dataCache.status = STATUS.IDLE;
    dataCache.data = null;
    dataCache.error = null;
    dataCache.lastFetched = null;
}
