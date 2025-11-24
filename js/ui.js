import { getFilters, setFilter, setAllCompanies, setAllCategories, setAllPhases, resetAllFilters, getRatingsForTech, setExclusiveCategory, setExclusivePhase, getProcessedData, getCompanyByName, getRatingsForCompany, getRatingCountsByCategoryForCompany } from './data.js';
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
        'Strategy & Business Consultany': d3.symbolTriangle,
        'Enterprise Applications': d3.symbolDiamond,
        'Data & AI': d3.symbolStar,
        'Experience & Software': d3.symbolCircle
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

    const { domainsMap, domains } = getFilters();
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
        const countRows = Object.keys(counts).sort().map(cat => `<div class="company-count-row"><strong>${cat}:</strong> ${counts[cat]}</div>`).join('');

        content.innerHTML = `
            <div class="modal-header">
                <img src="${data.logo || ''}" alt="${data.name} logo" onerror="this.style.display='none'">
                <div>
                    <h2>${data.name}</h2>
                    <div style="color: #94a3b8">${data.domain || ''}</div>
                    ${data.homepage ? `<a href="${data.homepage}" target="_blank" style="color: var(--accent-color); font-size: 0.9rem; text-decoration: none; display: inline-block; margin-top: 0.25rem;">${t('modal.visit_website')}</a>` : ''}
                </div>
            </div>
            <p>${data.description || ''}</p>

            <h3>${t('modal.rating_counts')}</h3>
            <div class="company-counts">${countRows || '<div>' + t('modal.no_ratings') + '</div>'}</div>

            <h3>${t('modal.ratings_list')}</h3>
            <div class="company-ratings-list">
                ${ (data.ratings || []).map(r => `
                    <div class="rating-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>${r.identifier}</strong>
                            <span class="rating-phase ${r.fase.toLowerCase()}">${r.fase.toUpperCase()}</span>
                        </div>
                        <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem">${r.datumBeoordeling}</div>
                        <p style="margin-top:0.5rem">${r.toelichting || ''}</p>
                    </div>
                `).join('') }
            </div>
        `;

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
                <span>${data.rating.bedrijf}</span>
                <span>${data.rating.datumBeoordeling}</span>
            </div>
            <div class="rating-phase ${data.rating.fase.toLowerCase()}" style="margin-bottom: 0.5rem">
                ${data.rating.fase.toUpperCase()}
            </div>
            <p>${data.rating.toelichting}</p>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem">
                <strong>${t('modal.reviewers')}:</strong> ${data.rating.beoordelaars.join(', ')}
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
                        <strong>${rating.bedrijf}</strong>
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
      <p class="user-info">You are signed in with Microsoft Entra ID</p>
    `;
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
