import { renderFilters } from './filters.js';
import { setupEventListeners, initializeUI, resetView } from './events.js';
import { openModal, closeModal } from './modals.js';
import { UI_CLASSES, getSymbolPathForDomain } from './helpers.js';
import {
    initLocalRatingsUI,
    hideManageRatingsTab,
    showManageRatingsTab,
    showAuthenticatedUser,
    showUnauthenticatedState,
    showError,
    showDataError
} from './localRatingsUI.js';

export function initUI(data, updateCallback) {
    renderFilters(updateCallback);
    setupEventListeners(updateCallback);
}

export {
    initializeUI,
    openModal,
    closeModal,
    UI_CLASSES,
    getSymbolPathForDomain,
    resetView,
    initLocalRatingsUI,
    hideManageRatingsTab,
    showManageRatingsTab,
    showAuthenticatedUser,
    showUnauthenticatedState,
    showError,
    showDataError,
};
