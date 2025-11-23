import { getFilters, setFilter, setAllCompanies, getRatingsForTech } from './data.js';

export function initUI(data, updateCallback) {
    renderFilters(updateCallback);
    setupEventListeners(updateCallback);
}

function renderFilters(updateCallback) {
    const { companies, tags, active } = getFilters();

    // Company List
    const companyContainer = document.getElementById('company-filter');
    companyContainer.innerHTML = '';

    // Add Bulk Controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'filter-controls';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'All';
    selectAllBtn.className = 'filter-btn';
    selectAllBtn.onclick = () => {
        const newData = setAllCompanies(true);
        updateCallback(newData);
        renderFilters(updateCallback); // Re-render to update checkboxes
    };

    const deselectAllBtn = document.createElement('button');
    deselectAllBtn.textContent = 'None';
    deselectAllBtn.className = 'filter-btn';
    deselectAllBtn.onclick = () => {
        const newData = setAllCompanies(false);
        updateCallback(newData);
        renderFilters(updateCallback); // Re-render to update checkboxes
    };

    controlsDiv.appendChild(selectAllBtn);
    controlsDiv.appendChild(deselectAllBtn);
    companyContainer.appendChild(controlsDiv);

    companies.forEach(company => {
        const span = document.createElement('span');
        span.className = 'tag';
        if (active.companies.has(company)) span.classList.add('active');
        span.textContent = company;

        span.addEventListener('click', () => {
            const isActive = span.classList.toggle('active');
            const newData = setFilter('company', company, isActive);
            updateCallback(newData);
        });

        companyContainer.appendChild(span);
    });

    // Category Filter
    const categoryContainer = document.getElementById('category-filter');
    categoryContainer.innerHTML = '';
    // We get ALL categories from getFilters, not just active ones, so user can re-enable them
    const allCategories = getFilters().categories;

    allCategories.forEach(cat => {
        const span = document.createElement('span');
        span.className = 'tag';
        if (active.categories.has(cat)) span.classList.add('active');
        span.textContent = cat;

        span.addEventListener('click', () => {
            const isActive = span.classList.toggle('active');
            const newData = setFilter('category', cat, isActive);
            updateCallback(newData);
        });

        categoryContainer.appendChild(span);
    });

    // Tag Cloud
    const tagContainer = document.getElementById('tag-cloud');
    tagContainer.innerHTML = '';
    tags.forEach(tag => {
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
    });
}

function setupEventListeners(updateCallback) {
    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeBtn.textContent = `Theme: ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`;
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.textContent = `Theme: ${savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1)}`;

    // Date Filter
    const dateInput = document.getElementById('date-filter');
    dateInput.addEventListener('change', (e) => {
        const newData = setFilter('date', e.target.value);
        updateCallback(newData);
    });

    // Visibility Toggles
    document.getElementById('toggle-rings').addEventListener('change', () => {
        const newData = setFilter('dummy', null, false);
        updateCallback(newData);
    });

    document.getElementById('toggle-segments').addEventListener('change', () => {
        const newData = setFilter('dummy', null, false);
        updateCallback(newData);
    });

    // Modal Events
    document.addEventListener('open-modal', (e) => {
        openModal(e.detail);
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
}

function openModal(data) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="modal-header">
            <img src="${data.logo}" alt="${data.name} logo" onerror="this.style.display='none'">
            <div>
                <h2>${data.name}</h2>
                <div style="color: #94a3b8">${data.category}</div>
                <div style="color: #64748b; font-size: 0.9rem">${data.vendor || ''}</div>
                ${data.homepage ? `<a href="${data.homepage}" target="_blank" style="color: var(--accent-color); font-size: 0.9rem; text-decoration: none; display: inline-block; margin-top: 0.25rem;">Visit Website &rarr;</a>` : ''}
            </div>
        </div>
        
        <p>${data.description}</p>
        
        <div style="margin-bottom: 1.5rem">
            <strong>Tags:</strong> ${data.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}
        </div>

        <h3>Evaluation</h3>
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
                <strong>Beoordelaars:</strong> ${data.rating.beoordelaars.join(', ')}
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
        h3.textContent = 'Other Evaluations';
        container.appendChild(h3);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '0.5rem';

        otherRatings.forEach(rating => {
            const item = document.createElement('div');
            item.className = 'rating-card';
            item.style.cursor = 'pointer';
            item.style.marginBottom = '0';
            item.style.padding = '0.75rem';
            item.style.borderLeftColor = '#334155'; // Neutral color until hovered
            item.style.transition = 'all 0.2s';

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${rating.bedrijf}</strong>
                    <span class="rating-phase ${rating.fase.toLowerCase()}">${rating.fase.toUpperCase()}</span>
                </div>
            `;

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = '#1e293b';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'var(--bg-color)';
            });

            item.addEventListener('click', () => {
                // Construct new data object merging original tech data with new rating
                const newData = {
                    ...data,
                    rating: rating,
                    id: `${rating.identifier}-${rating.bedrijf}`
                };
                openModal(newData);
            });

            list.appendChild(item);
        });
        container.appendChild(list);
    }

    overlay.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}
