import { getFilters, setFilter, setAllCompanies, setAllCategories, setAllPhases, resetAllFilters, getRatingsForTech, setExclusiveCategory, setExclusivePhase, setExclusiveCompany, getProcessedData, getCompanyByName, getRatingsForCompany, getRatingCountsByCategoryForCompany, getMode, setMode } from './data.js';
import { toggleOptimization } from './radar.js';
import { t, translatePage } from './i18n.js';

// CSS classes for styling different states
const UI_CLASSES = {
    authenticated: 'authenticated',
    unauthenticated: 'unauthenticated',
    loading: 'loading',
    error: 'error',
    success: 'success'
};

// Helper to produce an SVG path for domain symbol shapes matching radar's DOMAIN_SYMBOLS
function getSymbolPathForDomain(name) {
    const MAP = {
        'Cloud & Mission Critical': d3.symbolSquare,
        'Business Consultancy': d3.symbolTriangle,
        'Enterprise Applications': d3.symbolDiamond,
        'Data & AI': d3.symbolStar,
        'Experience, Development & Software': d3.symbolCircle
    };
    const sym = MAP[name] || d3.symbolCircle;
    return d3.symbol().type(sym).size(80)();
}

export function initUI(data, updateCallback) {
    renderFilters(updateCallback);
    setupEventListeners(updateCallback);
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

function renderFilters(updateCallback) {
    const { companies, tags, active, categories, phases } = getFilters();

    // Ensure date and search inputs reflect active filters
    const dateInput = document.getElementById('date-filter');
    if (dateInput) dateInput.value = active.date ? active.date.toISOString().slice(0, 10) : '';
    const searchInput = document.getElementById('search-filter');
    if (searchInput) searchInput.value = active.search || '';

    // Company List grouped by domain
    const companyContainer = document.getElementById('company-filter');
    const { domainsMap, domains } = getFilters();
    const currentMode = getMode();
    const companySection = document.getElementById('company-filter-section');

    if (companySection) {
        companySection.style.display = currentMode === 'companies' ? 'block' : 'none';
    }

    if (currentMode === 'companies' && companyContainer) {
        companyContainer.innerHTML = '';

        // Global All/None for companies
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'filter-controls';
        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = t('filter.all');
        selectAllBtn.className = 'filter-btn';
        selectAllBtn.onclick = () => { const newData = setAllCompanies(true); updateCallback(newData); renderFilters(updateCallback); };
        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.textContent = t('filter.none');
        deselectAllBtn.className = 'filter-btn';
        deselectAllBtn.onclick = () => { const newData = setAllCompanies(false); updateCallback(newData); renderFilters(updateCallback); };
        controlsDiv.appendChild(selectAllBtn);
        controlsDiv.appendChild(deselectAllBtn);
        companyContainer.appendChild(controlsDiv);

        for (const domain of domains) {
            const domainDiv = document.createElement('div');
            domainDiv.className = 'domain-group';
            const header = document.createElement('div');
            header.className = 'domain-header';
            // Domain shape icon (matches DOMAIN_SYMBOLS in radar.js)
            const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgIcon.setAttribute('width', '18');
            svgIcon.setAttribute('height', '18');
            svgIcon.setAttribute('viewBox', '0 0 18 18');
            svgIcon.classList.add('domain-icon');
            svgIcon.style.marginRight = '8px';
            svgIcon.style.verticalAlign = 'middle';

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            // Use module-scoped helper to get symbol path
            path.setAttribute('d', getSymbolPathForDomain(domain));
            path.setAttribute('transform', 'translate(9,9)');
            path.setAttribute('fill', 'rgba(200,200,200,0.12)');
            path.setAttribute('stroke', 'var(--text-color)');
            path.setAttribute('stroke-width', '1');
            svgIcon.appendChild(path);

            header.appendChild(svgIcon);

            const title = document.createElement('strong');
            title.textContent = domain;
            header.appendChild(title);

            const domSelectAll = document.createElement('button');
            domSelectAll.textContent = t('filter.all');
            domSelectAll.className = 'filter-btn small';
            domSelectAll.onclick = () => {
                for (const c of domainsMap[domain]) setFilter('company', c, true);
                const newData = getProcessedData();
                updateCallback(newData);
                renderFilters(updateCallback);
            };

            const domDeselect = document.createElement('button');
            domDeselect.textContent = t('filter.none');
            domDeselect.className = 'filter-btn small';
            domDeselect.onclick = () => {
                for (const c of domainsMap[domain]) setFilter('company', c, false);
                const newData = getProcessedData();
                updateCallback(newData);
                renderFilters(updateCallback);
            };

            header.appendChild(domSelectAll);
            header.appendChild(domDeselect);
            domainDiv.appendChild(header);

            const list = document.createElement('div');
            list.className = 'tag-cloud domain-list';
            for (const company of domainsMap[domain]) {
                const span = document.createElement('span');
                span.className = 'tag';
                if (active.companies.has(company)) span.classList.add('active');
                span.textContent = company;
                span.addEventListener('click', () => {
                    const isActive = span.classList.toggle('active');
                    setFilter('company', company, isActive);
                    const newData = getProcessedData();
                    updateCallback(newData);
                });
                // double-click on company tag opens company modal with details
                span.addEventListener('dblclick', async () => {
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
                });
                list.appendChild(span);
            }
            domainDiv.appendChild(list);
            companyContainer.appendChild(domainDiv);
        }
    }

    // Category Filter
    const categoryContainer = document.getElementById('category-filter');
    categoryContainer.innerHTML = '';

    // Add Bulk Controls for Categories
    const catControlsDiv = document.createElement('div');
    catControlsDiv.className = 'filter-controls';

    const catSelectAllBtn = document.createElement('button');
    catSelectAllBtn.textContent = t('filter.all');
    catSelectAllBtn.className = 'filter-btn';
    catSelectAllBtn.onclick = () => {
        const newData = setAllCategories(true);
        updateCallback(newData);
        renderFilters(updateCallback);
    };

    const catDeselectAllBtn = document.createElement('button');
    catDeselectAllBtn.textContent = t('filter.none');
    catDeselectAllBtn.className = 'filter-btn';
    catDeselectAllBtn.onclick = () => {
        const newData = setAllCategories(false);
        updateCallback(newData);
        renderFilters(updateCallback);
    };

    catControlsDiv.appendChild(catSelectAllBtn);
    catControlsDiv.appendChild(catDeselectAllBtn);
    categoryContainer.appendChild(catControlsDiv);

    // We get ALL categories from getFilters, not just active ones, so user can re-enable them
    const allCategories = getFilters().categories;

    for (const cat of allCategories) {
        const span = document.createElement('span');
        span.className = 'tag';
        if (active.categories.has(cat)) span.classList.add('active');
        span.textContent = cat;

        span.addEventListener('click', () => {
            const isActive = span.classList.toggle('active');
            const newData = setFilter('category', cat, isActive);
            updateCallback(newData);
        });
        // Support double-click on sidebar category tag to trigger drill-down / toggle back
        span.addEventListener('dblclick', () => {
            document.dispatchEvent(new CustomEvent('filter-category', { detail: cat }));
        });

        categoryContainer.appendChild(span);
    }

    // Phase Filter (Rings)
    const phaseContainer = document.getElementById('phase-filter');
    if (phaseContainer) {
        phaseContainer.innerHTML = '';

        // Bulk controls for phases
        const phaseControls = document.createElement('div');
        phaseControls.className = 'filter-controls';

        const phaseSelectAll = document.createElement('button');
        phaseSelectAll.textContent = t('filter.all');
        phaseSelectAll.className = 'filter-btn';
        phaseSelectAll.onclick = () => {
            const newData = setAllPhases(true);
            updateCallback(newData);
            renderFilters(updateCallback);
        };

        const phaseDeselectAll = document.createElement('button');
        phaseDeselectAll.textContent = t('filter.none');
        phaseDeselectAll.className = 'filter-btn';
        phaseDeselectAll.onclick = () => {
            const newData = setAllPhases(false);
            updateCallback(newData);
            renderFilters(updateCallback);
        };

        phaseControls.appendChild(phaseSelectAll);
        phaseControls.appendChild(phaseDeselectAll);
        phaseContainer.appendChild(phaseControls);

        for (const ph of phases) {
            const span = document.createElement('span');
            span.className = 'tag';
            if (active.phases.has(ph)) span.classList.add('active');
            span.textContent = ph;

            span.addEventListener('click', () => {
                const isActive = span.classList.toggle('active');
                const newData = setFilter('phase', ph, isActive);
                updateCallback(newData);
            });
            // Support double-click on sidebar phase label to drill-down / toggle back
            span.addEventListener('dblclick', () => {
                document.dispatchEvent(new CustomEvent('filter-phase', { detail: ph }));
            });

            phaseContainer.appendChild(span);
        }
    }

    // Tag Cloud
    const tagContainer = document.getElementById('tag-cloud');
    tagContainer.innerHTML = '';
    for (const tag of tags) {
        const span = document.createElement('span');
        span.className = 'tag';
        if (active.tags.has(tag)) span.classList.add('active');
        span.textContent = tag;

        span.addEventListener('click', () => {
            const isActive = span.classList.toggle('active');
            const newData = setFilter('tag', tag, isActive);
            updateCallback(newData);
        });

        tagContainer.appendChild(span);
    }
}

function setupEventListeners(updateCallback) {
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

    // Radar Tab Switching
    const radarTabBtn = document.getElementById('radar-tab-btn');
    const individualRadarTabBtn = document.getElementById('individual-radar-tab-btn');
    const manageRatingsTabBtn = document.getElementById('manage-ratings-tab-btn');

    const switchTab = (tabName) => {
        // Handle mode switching if applicable
        if (tabName === 'radar' || tabName === 'individual-radar') {
            const mode = tabName === 'radar' ? 'companies' : 'individual';
            const newData = setMode(mode);
            updateCallback(newData);
            renderFilters(updateCallback);

            // Show radar content
            document.getElementById('radar-tab-content').style.display = 'block';
            document.getElementById('manage-ratings-tab-content').style.display = 'none';
        } else if (tabName === 'manage-ratings') {
            document.getElementById('radar-tab-content').style.display = 'none';
            document.getElementById('manage-ratings-tab-content').style.display = 'block';
        }

        // Update button active state
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    };

    if (radarTabBtn) radarTabBtn.onclick = () => switchTab('radar');
    if (individualRadarTabBtn) individualRadarTabBtn.onclick = () => switchTab('individual-radar');
    if (manageRatingsTabBtn) manageRatingsTabBtn.onclick = () => switchTab('manage-ratings');


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
    // Re-render when language is changed
    document.addEventListener('language-changed', () => {
        renderFilters(updateCallback);
        // update radar so any localized tooltips/labels are refreshed
        try { updateCallback(getProcessedData()); } catch (e) { /* ignore */ }
    });
}

function openModal(data) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    // If this modal was opened for a company, render company view
    if (data && data.type === 'company') {
        const counts = data.ratingCounts || {};
        const countRows = Object.keys(counts).sort().map(cat => {
            const div = document.createElement('div');
            div.className = 'company-count-row';
            div.innerHTML = `<strong>${cat}:</strong> ${counts[cat]}`;
            return div;
        });

        // Helper: slugify company name for logo filename
        function slugify(input) {
            return (input || '')
                .toString()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        // Create modal content programmatically so we can attempt multiple logo file extensions
        content.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const img = document.createElement('img');
        img.alt = `${data.name} logo`;
        img.style.display = 'none';
        img.width = 48;
        img.height = 48;

        // Build list of candidate logo sources (explicit, then logos/<slug>.(svg|png|jpg|webp))
        const candidates = [];
        if (data.logo) candidates.push(data.logo);
        const slug = slugify(data.name || '');
        if (slug) {
            candidates.push(`logos/${slug}.svg`);
            candidates.push(`logos/${slug}.png`);
            candidates.push(`logos/${slug}.webp`);
            candidates.push(`logos/${slug}.jpg`);
        }

        let tryIndex = 0;
        img.addEventListener('error', () => {
            tryIndex += 1;
            if (tryIndex < candidates.length) {
                img.src = candidates[tryIndex];
            } else {
                img.style.display = 'none';
            }
        });

        img.addEventListener('load', () => {
            img.style.display = 'block';
        });

        // Start with first candidate if any
        if (candidates.length > 0) {
            img.src = candidates[0];
        }

        header.appendChild(img);

        const info = document.createElement('div');
        const h2 = document.createElement('h2');
        h2.textContent = data.name;
        info.appendChild(h2);

        if (data.domain) {
            const domainDiv = document.createElement('div');
            domainDiv.style.color = '#94a3b8';
            domainDiv.textContent = data.domain;
            info.appendChild(domainDiv);
        }

        if (data.homepage) {
            const a = document.createElement('a');
            a.href = data.homepage;
            a.target = '_blank';
            a.style.color = 'var(--accent-color)';
            a.style.fontSize = '0.9rem';
            a.style.textDecoration = 'none';
            a.style.display = 'inline-block';
            a.style.marginTop = '0.25rem';
            a.textContent = t('modal.visit_website');
            info.appendChild(a);
        }

        header.appendChild(info);

        content.appendChild(header);

        const desc = document.createElement('p');
        desc.textContent = data.description || '';
        content.appendChild(desc);

        // Add belangrijksteOnderwerpen if present
        if (data.belangrijksteOnderwerpen) {
            const h3Topics = document.createElement('h3');
            h3Topics.textContent = 'Belangrijkste Onderwerpen';
            h3Topics.style.marginTop = '1.5rem';
            content.appendChild(h3Topics);

            const topicsP = document.createElement('p');
            topicsP.textContent = data.belangrijksteOnderwerpen;
            content.appendChild(topicsP);
        }

        // Add toelichting if present
        if (data.toelichting) {
            const h3Explanation = document.createElement('h3');
            h3Explanation.textContent = 'Toelichting';
            h3Explanation.style.marginTop = '1.5rem';
            content.appendChild(h3Explanation);

            const explanationP = document.createElement('p');
            explanationP.textContent = data.toelichting;
            content.appendChild(explanationP);
        }

        const h3Counts = document.createElement('h3');
        h3Counts.textContent = t('modal.rating_counts');
        content.appendChild(h3Counts);

        const countsDiv = document.createElement('div');
        countsDiv.className = 'company-counts';
        if (countRows.length > 0) {
            countRows.forEach(r => countsDiv.appendChild(r));
        } else {
            countsDiv.innerHTML = '<div>' + t('modal.no_ratings') + '</div>';
        }
        content.appendChild(countsDiv);

        const h3List = document.createElement('h3');
        h3List.textContent = t('modal.ratings_list');
        content.appendChild(h3List);

        const ratingsList = document.createElement('div');
        ratingsList.className = 'company-ratings-list';
        (data.ratings || []).forEach(r => {
            const card = document.createElement('div');
            card.className = 'rating-card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${r.identifier}</strong>
                    <span class="rating-phase ${r.fase.toLowerCase()}">${r.fase.toUpperCase()}</span>
                </div>
                <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem">${r.datumBeoordeling}</div>
                <p style="margin-top:0.5rem">${r.toelichting || ''}</p>
            `;
            ratingsList.appendChild(card);
        });
        content.appendChild(ratingsList);

        overlay.classList.remove('hidden');
        return;
    }

    // Otherwise render technology/rating modal (existing behavior)
    content.innerHTML = `
        <div class="modal-header">
            <img src="${data.logo}" alt="${data.name} logo" onerror="this.style.display='none'">
            <div>
                <h2>${data.name}</h2>
                <div style="color: #94a3b8">${data.category}</div>
                <div style="color: #64748b; font-size: 0.9rem">${data.vendor || ''}</div>
                ${data.homepage ? `<a href="${data.homepage}" target="_blank" style="color: var(--accent-color); font-size: 0.9rem; text-decoration: none; display: inline-block; margin-top: 0.25rem;">${t('modal.visit_website')}</a>` : ''}
            </div>
        </div>
        
        <p>${data.description}</p>
        
        <div style="margin-bottom: 1.5rem">
            <strong>${t('modal.tags')}</strong> ${data.tags.map(tg => `<span class="tag">${tg}</span>`).join(' ')}
        </div>

        <h3>${t('modal.evaluation')}</h3>
        <div class="rating-card">
            <div class="rating-header">
                <div style="display:flex; align-items:center; gap:10px;">
                     <span class="company-name">${data.rating.bedrijf || (data.rating.beoordelaars && data.rating.beoordelaars[0]) || ''}</span>
                     ${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.rating.bedrijf} logo" style="height:24px; width:auto;">` : ''}
                </div>
                <span>${data.rating.datumBeoordeling}</span>
            </div>
            <div class="rating-phase ${(data.rating.fase || '').toLowerCase()}" style="margin-bottom: 0.5rem">
                ${(data.rating.fase || '').toUpperCase()}
            </div>
            <p>${data.rating.toelichting || ''}</p>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem">
                <strong>${t('modal.reviewers')}:</strong> ${(data.rating.beoordelaars || []).join(', ')}
            </div>
        </div>
        </div>
        
        <div id="other-ratings"></div>
    `;

    // Render Other Ratings
    const otherRatings = getRatingsForTech(data.identifier)
        .filter(r => r.bedrijf !== data.rating.bedrijf);

    if (otherRatings.length > 0) {
        const container = document.getElementById('other-ratings');
        const h3 = document.createElement('h3');
        h3.textContent = t('modal.other_evaluations');
        container.appendChild(h3);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '0.5rem';

        for (const rating of otherRatings) {
            const item = document.createElement('div');
            item.className = 'rating-card';
            item.style.cursor = 'pointer';
            item.style.marginBottom = '0';
            item.style.padding = '0.75rem';
            item.style.borderLeftColor = '#334155';
            item.style.transition = 'all 0.2s';

            item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong>${rating.bedrijf}</strong>
                            ${(() => {
                    const c = getCompanyByName(rating.bedrijf);
                    return c && c.logo ? `<img src="${c.logo}" style="height:16px; width:auto;" alt="">` : '';
                })()}
                        </div>
                        <span class="rating-phase ${rating.fase.toLowerCase()}">${rating.fase.toUpperCase()}</span>
                    </div>
                `;

            item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#1e293b'; });
            item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'var(--bg-color)'; });

            item.addEventListener('click', () => {
                const newData = { ...data, rating: rating, id: `${rating.identifier}-${rating.bedrijf}` };
                openModal(newData);
            });

            list.appendChild(item);
        }
        container.appendChild(list);
    }

    overlay.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}


/**
 * Update UI to show authenticated user with user information
 * @param {Object} user - The user object containing profile information
 * @param {Object|null} tokenClaims - The parsed ID token claims
 */
export function showAuthenticatedUser(user, tokenClaims) {
    const elements = {
        welcomeMessage: document.getElementById('welcome-message'),
        signInButton: document.getElementById('signin-button'),
        signOutButton: document.getElementById('signout-button'),
        tokenSection: document.getElementById('token-section'),
        tokenData: document.getElementById('token-data'),
        dataSection: document.getElementById('data-section')
    };

    // Update welcome message with user's name
    if (elements.welcomeMessage) {
        const displayName = user.displayName || user.name || 'Authenticated User';
        elements.welcomeMessage.innerHTML = `
      <p>Welcome, <strong>${displayName}</strong>!</p>
    `;
        // Make sure welcome message is visible in the header (remove screen-reader-only class)
        elements.welcomeMessage.classList.remove('sr-only');
        elements.welcomeMessage.style.display = 'inline-block';
    }

    // Update button visibility
    if (elements.signInButton) {
        elements.signInButton.style.display = 'none';
    }

    if (elements.signOutButton) {
        elements.signOutButton.style.display = 'inline-block';
    }

    // Show token section and update token data
    if (elements.tokenSection) {
        elements.tokenSection.style.display = 'block';

        // Update token data if available
        if (elements.tokenData && tokenClaims) {
            elements.tokenData.value = JSON.stringify(tokenClaims, null, 2);
        }
    }

    // Show data section
    if (elements.dataSection) {
        elements.dataSection.style.display = 'block';
    }

    // Add authenticated class to body
    document.body.classList.add(UI_CLASSES.authenticated);
    document.body.classList.remove(UI_CLASSES.unauthenticated);
}

export function showUnauthenticatedState() {
    const elements = {
        welcomeMessage: document.getElementById('welcome-message'),
        signInButton: document.getElementById('signin-button'),
        signOutButton: document.getElementById('signout-button'),
        tokenSection: document.getElementById('token-section')
    };

    // Reset welcome message
    if (elements.welcomeMessage) {
        elements.welcomeMessage.innerHTML = `
      <p>Welcome, please sign in</p>
    `;
        // keep it visually minimal when not signed in
        elements.welcomeMessage.style.display = 'none';
        elements.welcomeMessage.classList.add('sr-only');
    }

    // Update button visibility
    if (elements.signInButton) {
        elements.signInButton.style.display = 'inline-block';
    }

    if (elements.signOutButton) {
        elements.signOutButton.style.display = 'none';
    }

    // Hide token section and data section
    if (elements.tokenSection) {
        elements.tokenSection.style.display = 'none';
    }

    if (elements.dataSection) {
        elements.dataSection.style.display = 'none';
    }

    if (elements.userDataSection) {
        elements.userDataSection.style.display = 'none';
    }


    // Update body class
    document.body.classList.add(UI_CLASSES.unauthenticated);
    document.body.classList.remove(UI_CLASSES.authenticated);
}

// ============================================================================
// LOCAL RATINGS MANAGEMENT
// ============================================================================

import * as localRatings from './localRatings.js';
import { refreshLocalData } from './data.js';
import { getAccount } from './auth.js';

let currentCompany = '';
let currentUser = null;

/**
 * Initialize local ratings UI
 * @param {Function} updateRadarCallback - Callback to update the radar
 */
export function initLocalRatingsUI(updateRadarCallback) {
    setupTabNavigation(updateRadarCallback);
    setupLocalRatingsEventListeners(updateRadarCallback);
    populateCompanySelector();
}

/**
 * Setup tab navigation
 */
function setupTabNavigation(updateRadarCallback) {
    const radarTabBtn = document.getElementById('radar-tab-btn');
    const manageTabBtn = document.getElementById('manage-ratings-tab-btn');
    const radarContent = document.getElementById('radar-tab-content');
    const manageContent = document.getElementById('manage-ratings-tab-content');

    if (!radarTabBtn || !manageTabBtn) return;

    radarTabBtn.addEventListener('click', () => {
        radarTabBtn.classList.add('active');
        manageTabBtn.classList.remove('active');
        radarContent.style.display = 'block';
        manageContent.style.display = 'none';
    });

    manageTabBtn.addEventListener('click', () => {
        manageTabBtn.classList.add('active');
        radarTabBtn.classList.remove('active');
        radarContent.style.display = 'none';
        manageContent.style.display = 'block';
        renderLocalRatingsTable();
    });
}

/**
 * Setup event listeners for local ratings management
 */
function setupLocalRatingsEventListeners(updateRadarCallback) {
    const addBtn = document.getElementById('add-rating-btn');
    const downloadBtn = document.getElementById('download-ratings-btn');
    const clearAllBtn = document.getElementById('clear-all-ratings-btn');
    const companyInput = document.getElementById('local-company-input');

    if (addBtn) {
        addBtn.addEventListener('click', () => openRatingModal(null, updateRadarCallback));
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const company = companyInput?.value || '';
            localRatings.downloadRatingsJSON(company);
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            const count = localRatings.getLocalRatings().length;
            if (count === 0) {
                alert('No local ratings to clear.');
                return;
            }

            const confirmed = confirm(`Are you sure you want to delete all ${count} local rating(s) and any custom technologies? This action cannot be undone.`);
            if (!confirmed) return;

            localRatings.clearLocalRatings();
            localRatings.clearCustomTechnologies();
            localRatings.clearCompanyDetails();
            const newData = refreshLocalData();
            renderLocalRatingsTable();

            // Update radar if callback is available
            if (updateRadarCallback) {
                updateRadarCallback(newData);
            }
        });
    }

    // Company input change handler - load and display company details
    if (companyInput) {
        companyInput.addEventListener('input', () => {
            const companyName = companyInput.value.trim();
            const detailsSection = document.getElementById('company-details-section');
            const topicsInput = document.getElementById('company-topics-input');
            const explanationInput = document.getElementById('company-explanation-input');

            if (companyName) {
                // Show the details section
                detailsSection.style.display = 'block';

                // Load current details (from local storage or server data)
                const localDetails = localRatings.getCompanyDetails(companyName);
                const serverCompany = getCompanyByName(companyName);

                // Local storage takes precedence
                topicsInput.value = localDetails.belangrijksteOnderwerpen ||
                    (serverCompany?.belangrijksteOnderwerpen || '');
                explanationInput.value = localDetails.toelichting ||
                    (serverCompany?.toelichting || '');
            } else {
                // Hide the details section if no company selected
                detailsSection.style.display = 'none';
                topicsInput.value = '';
                explanationInput.value = '';
            }
        });
    }

    // Save company details button
    const saveDetailsBtn = document.getElementById('save-company-details-btn');
    if (saveDetailsBtn) {
        saveDetailsBtn.addEventListener('click', () => {
            const companyName = companyInput?.value.trim();
            if (!companyName) {
                alert('Please enter a company name first.');
                return;
            }

            const topicsInput = document.getElementById('company-topics-input');
            const explanationInput = document.getElementById('company-explanation-input');

            const details = {
                belangrijksteOnderwerpen: topicsInput.value.trim(),
                toelichting: explanationInput.value.trim()
            };

            localRatings.setCompanyDetails(companyName, details);

            // Refresh the data to merge local company details
            const newData = refreshLocalData();
            if (updateRadarCallback) {
                updateRadarCallback(newData);
            }

            alert(`Company details saved for ${companyName}`);
        });
    }

    if (companyInput) {
        companyInput.addEventListener('change', (e) => {
            currentCompany = e.target.value;
            renderLocalRatingsTable();
        });
    }
}

/**
 * Populate company selector with existing companies
 */
function populateCompanySelector() {
    const datalist = document.getElementById('companies-datalist');
    if (!datalist) return;

    const { companies } = getFilters();
    datalist.innerHTML = '';

    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        datalist.appendChild(option);
    });
}

/**
 * Render local ratings table
 */
function renderLocalRatingsTable() {
    const tbody = document.getElementById('local-ratings-tbody');
    const noRatingsMsg = document.getElementById('no-ratings-message');
    const companyInput = document.getElementById('local-company-input');

    if (!tbody) return;

    const allRatings = localRatings.getLocalRatings();
    const company = companyInput?.value || '';

    // Filter by company if specified
    const ratings = company
        ? allRatings.filter(r => r.bedrijf === company)
        : allRatings;

    tbody.innerHTML = '';

    if (ratings.length === 0) {
        if (noRatingsMsg) noRatingsMsg.style.display = 'block';
        return;
    }

    if (noRatingsMsg) noRatingsMsg.style.display = 'none';

    ratings.forEach(rating => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rating.identifier}</td>
            <td><span class="rating-phase ${rating.fase.toLowerCase()}">${rating.fase.toUpperCase()}</span></td>
            <td>${rating.datumBeoordeling}</td>
            <td>${(rating.toelichting || '').substring(0, 50)}${rating.toelichting?.length > 50 ? '...' : ''}</td>
            <td class="actions-cell">
                <button class="edit-btn filter-btn small" data-id="${rating._localId}">Edit</button>
                <button class="delete-btn filter-btn small" data-id="${rating._localId}">Delete</button>
            </td>
        `;

        // Add event listeners
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => openRatingModal(rating, null));
        deleteBtn.addEventListener('click', () => deleteRating(rating._localId));

        tbody.appendChild(row);
    });
}

/**
 * Open rating modal for add/edit
 * @param {Object|null} rating - Rating to edit, or null for new rating
 * @param {Function} updateRadarCallback - Callback to update radar
 */
function openRatingModal(rating, updateRadarCallback) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    if (!modal || !content) return;

    const isEdit = !!rating;
    const title = isEdit ? 'Edit Rating' : 'Add New Rating';

    // Get all technologies for dropdown
    const { technologies } = getProcessedData();
    const customTechs = localRatings.getCustomTechnologies();

    // Sort technologies alphabetically by name
    const uniqueTechs = new Map();
    [...technologies, ...customTechs].forEach(tech => {
        // Prioritize the first encountered technology for a given name
        if (!uniqueTechs.has(tech.name)) {
            uniqueTechs.set(tech.name, tech);
        }
    });
    const allTechs = Array.from(uniqueTechs.values());
    allTechs.sort((a, b) => a.name.localeCompare(b.name));

    // Get unique categories for the datalist
    const uniqueCategories = [...new Set(technologies.map(t => t.category))].sort((a, b) => a.localeCompare(b));

    content.innerHTML = `
        <h2>${title}</h2>
        <form id="rating-form" class="rating-form">
            <div class="form-group">
                <label for="tech-search-input">Technology:</label>
                <div class="searchable-select-container">
                    <input type="text" id="tech-search-input" class="searchable-select-input" placeholder="Type to search..." autocomplete="off" required>
                    <input type="hidden" id="tech-select" required>
                    <div id="tech-options-list" class="searchable-select-options"></div>
                </div>
            </div>

            <div id="custom-tech-fields" style="display: none;">
                <div class="form-group">
                    <label for="custom-tech-name">Technology Name:</label>
                    <input type="text" id="custom-tech-name" />
                </div>
                <div class="form-group">
                    <label for="custom-tech-category">Category:</label>
                    <input type="text" id="custom-tech-category" list="custom-tech-category-list" placeholder="Select or type new category" />
                    <datalist id="custom-tech-category-list">
                        ${uniqueCategories.map(c => `<option value="${c}"></option>`).join('')}
                    </datalist>
                </div>
                <div class="form-group">
                    <label for="custom-tech-description">Description:</label>
                    <textarea id="custom-tech-description" rows="2"></textarea>
                </div>
            </div>

            <div class="form-group">
                <label for="fase-select">Phase:</label>
                <select id="fase-select" required>
                    <option value="adopt" ${rating?.fase === 'adopt' ? 'selected' : ''}>Adopt</option>
                    <option value="trial" ${rating?.fase === 'trial' ? 'selected' : ''}>Trial</option>
                    <option value="assess" ${rating?.fase === 'assess' ? 'selected' : ''}>Assess</option>
                    <option value="hold" ${rating?.fase === 'hold' ? 'selected' : ''}>Hold</option>
                    <option value="deprecate" ${rating?.fase === 'deprecate' ? 'selected' : ''}>Deprecate</option>
                </select>
            </div>

            <div class="form-group">
                <label for="toelichting-input">Comment:</label>
                <textarea id="toelichting-input" rows="4" required>${rating?.toelichting || ''}</textarea>
            </div>

            <div class="form-actions">
                <button type="submit" class="filter-btn">Save</button>
                <button type="button" id="cancel-rating-btn" class="filter-btn">Cancel</button>
            </div>
        </form>
    `;

    // Setup searchable dropdown logic
    const searchInput = document.getElementById('tech-search-input');
    const hiddenInput = document.getElementById('tech-select');
    const optionsList = document.getElementById('tech-options-list');
    const customFields = document.getElementById('custom-tech-fields');
    const customNameInput = document.getElementById('custom-tech-name');

    // Pre-fill if editing
    if (rating) {
        const tech = allTechs.find(t => t.identifier === rating.identifier);
        if (tech) {
            searchInput.value = tech.name;
            hiddenInput.value = tech.identifier;
        } else if (rating.identifier) {
            // Fallback if tech not found but identifier exists
            searchInput.value = rating.identifier;
            hiddenInput.value = rating.identifier;
        }
    }

    function renderOptions(filterText = '') {
        optionsList.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        const filteredTechs = allTechs.filter(t => t.name.toLowerCase().includes(lowerFilter));

        filteredTechs.forEach(t => {
            const div = document.createElement('div');
            div.className = 'searchable-select-option';
            if (t.identifier === hiddenInput.value) div.classList.add('selected');
            div.textContent = t.name;
            div.addEventListener('click', () => {
                selectOption(t.identifier, t.name);
            });
            optionsList.appendChild(div);
        });

        // Add "Add new technology" option
        const addNewDiv = document.createElement('div');
        addNewDiv.className = 'searchable-select-option new-option';
        addNewDiv.textContent = `+ Add "${filterText}" as new technology`;
        addNewDiv.addEventListener('click', () => {
            selectOption('__custom__', filterText);
        });
        optionsList.appendChild(addNewDiv);

        if (filteredTechs.length > 0 || filterText.length > 0) {
            optionsList.classList.add('show');
        } else {
            optionsList.classList.remove('show');
        }
    }

    function selectOption(value, text) {
        hiddenInput.value = value;
        searchInput.value = text;
        optionsList.classList.remove('show');

        if (value === '__custom__') {
            customFields.style.display = 'block';
            customNameInput.value = text; // Pre-fill name with search text
        } else {
            customFields.style.display = 'none';
        }
    }

    // Event listeners for search input
    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
        // Clear selection if user types
        hiddenInput.value = '';
    });

    searchInput.addEventListener('focus', () => {
        renderOptions(searchInput.value);
    });

    // Close options when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !optionsList.contains(e.target)) {
            optionsList.classList.remove('show');
        }
    });

    // Setup form submission
    const form = document.getElementById('rating-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validation: ensure a technology is selected
        if (!hiddenInput.value && searchInput.value) {
            // If user typed something but didn't select, assume they want to add it as custom
            selectOption('__custom__', searchInput.value);
            // We need to stop here to let the user fill in details? 
            // Or maybe we just proceed if we want to auto-create?
            // Let's force them to confirm by showing the fields first
            if (customFields.style.display === 'none') {
                customFields.style.display = 'block';
                customNameInput.value = searchInput.value;
                return;
            }
        }

        if (!hiddenInput.value) {
            alert('Please select a technology.');
            return;
        }

        saveRating(rating, updateRadarCallback);
    });

    // Setup cancel button
    const cancelBtn = document.getElementById('cancel-rating-btn');
    cancelBtn.addEventListener('click', closeModal);

    modal.classList.remove('hidden');
}

/**
 * Save rating (add or update)
 * @param {Object|null} existingRating - Existing rating to update, or null for new
 * @param {Function} updateRadarCallback - Callback to update radar
 */
function saveRating(existingRating, updateRadarCallback) {
    const hiddenInput = document.getElementById('tech-select');
    const faseSelect = document.getElementById('fase-select');
    const toelichtingInput = document.getElementById('toelichting-input');
    const companyInput = document.getElementById('local-company-input');

    let identifier = hiddenInput.value;

    // Handle custom technology
    if (identifier === '__custom__') {
        const nameInput = document.getElementById('custom-tech-name');
        const categoryInput = document.getElementById('custom-tech-category');
        const descInput = document.getElementById('custom-tech-description');

        if (!nameInput.value) {
            alert('Please enter a technology name');
            return;
        }

        const customTech = localRatings.addCustomTechnology({
            name: nameInput.value,
            category: categoryInput.value || 'Other',
            description: descInput.value || ''
        });

        identifier = customTech.identifier;
    }

    // Get current user info
    const account = getAccount();
    const userName = account?.name || account?.username || 'Local User';

    const ratingData = {
        identifier,
        bedrijf: companyInput?.value || currentCompany || 'My Company',
        fase: faseSelect.value,
        datumBeoordeling: new Date().toISOString().split('T')[0],
        toelichting: toelichtingInput.value,
        beoordelaars: [userName]
    };

    if (existingRating) {
        // Update existing
        localRatings.updateLocalRating(existingRating._localId, ratingData);
    } else {
        // Add new
        localRatings.addLocalRating(ratingData);
    }

    // Refresh data and UI
    const newData = refreshLocalData();
    if (updateRadarCallback) {
        updateRadarCallback(newData);
    }
    renderLocalRatingsTable();
    closeModal();
}

/**
 * Delete a rating
 * @param {string} id - Local ID of rating to delete
 */
async function deleteRating(id) {
    if (!confirm('Are you sure you want to delete this rating?')) {
        return;
    }

    localRatings.deleteLocalRating(id);
    const newData = refreshLocalData();
    renderLocalRatingsTable();

    // Update radar if visible
    try {
        const radarContent = document.getElementById('radar-tab-content');
        if (radarContent && radarContent.style.display !== 'none') {
            const { updateRadar } = await import('./radar.js');
            updateRadar(newData);
        }
    } catch (e) {
        console.error('Error updating radar:', e);
    }
}

/**
 * Show the Manage Ratings tab (called when user authenticates)
 */
export function showManageRatingsTab() {
    const tabBtn = document.getElementById('manage-ratings-tab-btn');
    if (tabBtn) {
        tabBtn.style.display = 'inline-block';
    }
}

/**
 * Hide the Manage Ratings tab (called when user signs out)
 */
export function hideManageRatingsTab() {
    const tabBtn = document.getElementById('manage-ratings-tab-btn');
    const radarTabBtn = document.getElementById('radar-tab-btn');
    const radarContent = document.getElementById('radar-tab-content');
    const manageContent = document.getElementById('manage-ratings-tab-content');

    if (tabBtn) {
        tabBtn.style.display = 'none';
    }

    // Switch back to radar tab
    if (radarTabBtn && radarContent && manageContent) {
        radarTabBtn.classList.add('active');
        if (tabBtn) tabBtn.classList.remove('active');
        radarContent.style.display = 'block';
        manageContent.style.display = 'none';
    }
}

export function resetView(updateCallback) {
    const newData = resetAllFilters();
    updateCallback(newData);
    renderFilters(updateCallback);

    // Reset inputs and visibility toggles
    const ringsToggle = document.getElementById('toggle-rings');
    const segmentsToggle = document.getElementById('toggle-segments');
    if (ringsToggle) ringsToggle.checked = true;
    if (segmentsToggle) segmentsToggle.checked = true;

    const dateInput = document.getElementById('date-filter');
    if (dateInput) dateInput.value = '';
    const searchInput = document.getElementById('search-filter');
    if (searchInput) searchInput.value = '';
}
