import {
    setFilter,
    getProcessedData,
    setExclusiveCategory,
    setExclusiveCompany,
    setExclusivePhase,
    resetAllFilters,
    getFilters,
    setAllCategories,
    setAllCompanies,
    setAllPhases,
    getIsUrlFiltered
} from '../data.js';
import { toggleOptimization } from '../radar.js';
import { t, translatePage } from '../i18n.js';
import { renderFilters } from './filters.js';
import { openModal, closeModal } from './modals.js';
import { APP_VERSION } from '../version.js';

export function setupEventListeners(updateCallback) {
    // Version Easter Egg
    const logoImg = document.querySelector('header img');
    if (logoImg) {
        let clickCount = 0;
        let lastClickTime = 0;
        logoImg.style.cursor = 'pointer';
        logoImg.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastClickTime > 2000) {
                clickCount = 0;
            }
            clickCount++;
            lastClickTime = now;
            if (clickCount >= 5) {
                clickCount = 0;
                alert(`Conclusion Technology Radar\nVersion: ${APP_VERSION.label}\nHash: ${APP_VERSION.hash}\nBuilt: ${APP_VERSION.timestamp}`);
            }
        });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        // Refresh translated theme label
        try { translatePage(); } catch (e) { /* ignore */ }
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    // theme button text is handled by translatePage which reads current theme

    // Date Filter
    const dateInput = document.getElementById('date-filter');
    dateInput.addEventListener('change', (e) => {
        const newData = setFilter('date', e.target.value);
        updateCallback(newData);
    });

    // Company collapse toggle
    const companyToggle = document.getElementById('company-collapse-toggle');
    const companyBody = document.getElementById('company-filter-body');
    if (companyToggle && companyBody) {
        // Default collapsed; toggle on click
        companyToggle.addEventListener('click', () => {
            const isHidden = companyBody.classList.toggle('hidden');
            companyToggle.setAttribute('aria-expanded', (!isHidden).toString());
            // Rotate arrow visually
            companyToggle.textContent = isHidden ? '▸' : '▾';
        });
    }

    // Tag collapse toggle
    const tagToggle = document.getElementById('tag-collapse-toggle');
    const tagBody = document.getElementById('tag-filter-body');
    if (tagToggle && tagBody) {
        // Default collapsed; toggle on click
        tagToggle.addEventListener('click', () => {
            const isHidden = tagBody.classList.toggle('hidden');
            tagToggle.setAttribute('aria-expanded', (!isHidden).toString());
            tagToggle.textContent = isHidden ? '▸' : '▾';
        });
    }

    // Sidebar resizer (drag to resize)
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    if (resizer && sidebar && container) {
        let isResizing = false;
        const minWidth = 200;
        const maxWidth = 800;

        const onPointerMove = (clientX) => {
            const rect = container.getBoundingClientRect();
            let newWidth = clientX - rect.left;
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            sidebar.style.width = newWidth + 'px';
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            onPointerMove(e.clientX);
        };

        const onTouchMove = (e) => {
            if (!isResizing) return;
            if (e.touches && e.touches.length) onPointerMove(e.touches[0].clientX);
        };

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.userSelect = 'none';
            globalThis.addEventListener('mousemove', onMouseMove);
            globalThis.addEventListener('mouseup', stopResize);
        });

        resizer.addEventListener('touchstart', (e) => {
            isResizing = true;
            document.body.style.userSelect = 'none';
            globalThis.addEventListener('touchmove', onTouchMove);
            globalThis.addEventListener('touchend', stopResize);
        }, { passive: false });

        function stopResize() {
            isResizing = false;
            document.body.style.userSelect = '';
            globalThis.removeEventListener('mousemove', onMouseMove);
            globalThis.removeEventListener('mouseup', stopResize);
            globalThis.removeEventListener('touchmove', onTouchMove);
            globalThis.removeEventListener('touchend', stopResize);
            // Trigger an update so the radar redraws to the new available space
            try { updateCallback(getProcessedData()); } catch (e) { /* ignore */ }
        }
    }

    // Reset Filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetView(updateCallback);
        });
    }

    // Optimize Radar button
    const optimizeBtn = document.getElementById('optimize-radar');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', () => {
            const isOptimized = toggleOptimization();
            optimizeBtn.classList.toggle('active', isOptimized);
            optimizeBtn.style.backgroundColor = isOptimized ? '#10b981' : 'var(--accent-color)';
            const label = optimizeBtn.querySelector('span');
            if (label) {
                label.textContent = isOptimized ? t('filter.reset_view', 'Reset View') : t('filter.optimize', 'Optimize');
            }
        });
    }

    // Visibility Toggles
    document.getElementById('toggle-rings').addEventListener('change', () => {
        const newData = setFilter('dummy', null, false);
        updateCallback(newData);
    });

    document.getElementById('toggle-segments').addEventListener('change', () => {
        const newData = setFilter('dummy', null, false);
        updateCallback(newData);
    });

    // Toggle: show logos on blips vs colored symbols
    const blipLogoToggle = document.getElementById('toggle-blip-logos');
    if (blipLogoToggle) {
        blipLogoToggle.addEventListener('change', () => {
            // Force radar to re-render using the current processed data
            try { updateCallback(getProcessedData()); } catch (e) { /* ignore */ }
        });
    }

    // Search Filter
    const searchInput = document.getElementById('search-filter');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const newData = setFilter('search', e.target.value);
            updateCallback(newData);
        });
    }

    // Modal Events
    document.addEventListener('open-modal', (e) => {
        openModal(e.detail);
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    // Filter Category Event (Drill-down)
    document.addEventListener('filter-category', (e) => {
        const category = e.detail;
        const activeCategories = getFilters().active.categories;
        let newData;
        // If this category is already the only active one, restore all categories
        if (activeCategories.size === 1 && activeCategories.has(category)) {
            newData = setAllCategories(true);
        } else {
            newData = setExclusiveCategory(category);
        }
        updateCallback(newData);
        renderFilters(updateCallback); // Re-render to update checkboxes
    });

    // Filter Company Event (Drill-down)
    document.addEventListener('filter-company', (e) => {
        const company = e.detail;
        const activeCompanies = getFilters().active.companies;
        let newData;
        // If this company is already the only active one, restore all companies
        if (activeCompanies.size === 1 && activeCompanies.has(company)) {
            newData = setAllCompanies(true);
        } else {
            newData = setExclusiveCompany(company);
        }
        updateCallback(newData);
        renderFilters(updateCallback);
    });

    // Filter Phase Event (Drill-down)
    document.addEventListener('filter-phase', (e) => {
        const phase = (e.detail || '').toLowerCase();
        const activePhases = getFilters().active.phases;
        console.debug('[ui] filter-phase event:', phase, 'activePhases:', Array.from(activePhases));
        let newData;
        // If this phase is already the only active one, restore all phases (toggle back)
        if (activePhases.size === 1 && activePhases.has(phase)) {
            console.debug('[ui] phase is the only active one -> restoring all phases');
            newData = setAllPhases(true);
        } else {
            console.debug('[ui] drilling down to phase:', phase);
            newData = setExclusivePhase(phase);
        }
        // Ensure radar updates and UI reflects current filter state
        updateCallback(newData);
        renderFilters(updateCallback);
        console.debug('[ui] post-update active phases:', Array.from(getFilters().active.phases));
    });
    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Toggle active state for buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle active state for content
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            const targetContent = document.getElementById(`${tabName}-tab-content`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        });
    });

    // Language change handling
    document.addEventListener('language-changed', () => {
        renderFilters(updateCallback);
        // update radar so any localized tooltips/labels are refreshed
        try { updateCallback(getProcessedData()); } catch (e) { /* ignore */ }
    });
}

export function resetView(updateCallback, forceReset = true) {
    if (forceReset || !getIsUrlFiltered()) {
        resetAllFilters();
    }
    const newData = getProcessedData();
    updateCallback(newData);
    renderFilters(updateCallback);

    // Reset UI state for "Optimize" button
    const optimizeBtn = document.getElementById('optimize-radar');
    if (optimizeBtn) {
        optimizeBtn.classList.remove('active');
        optimizeBtn.style.backgroundColor = 'var(--accent-color)';
        const label = optimizeBtn.querySelector('span');
        if (label) label.textContent = t('filter.optimize', 'Optimize');
    }
}

export function initializeUI(signInCallback, signOutCallback) {
    // Check if DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupLoginEventListeners(signInCallback, signOutCallback));
    } else {
        setupLoginEventListeners(signInCallback, signOutCallback);
    }
}

/**
 * Set up event listeners for buttons
 * @param {Function} signInCallback - Function to call when sign-in button is clicked
 * @param {Function} signOutCallback - Function to call when sign-out button is clicked
 */
function setupLoginEventListeners(signInCallback, signOutCallback) {
    // Re-assign DOM elements to ensure they're available
    const elements = {
        welcomeMessage: document.getElementById('welcome-message'),
        signInButton: document.getElementById('signin-button'),
        signOutButton: document.getElementById('signout-button'),
    };

    // Set up sign in button
    if (elements.signInButton) {
        elements.signInButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof signInCallback === 'function') {
                signInCallback();
            }
        });
    }

    // Set up sign out button
    if (elements.signOutButton) {
        elements.signOutButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof signOutCallback === 'function') {
                signOutCallback();
            }
        });
    }
}
