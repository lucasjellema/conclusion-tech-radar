import {
    getFilters, setFilter, setAllCompanies, setAllCategories, setAllPhases,
    getProcessedData, getCompanyByName, getRatingsForCompany, getRatingCountsByCategoryForCompany,
    setExclusiveCategory, setExclusiveCompany
} from '../data.js';
import { t } from '../i18n.js';
import { getSymbolPathForDomain } from './helpers.js';

export function renderFilters(updateCallback) {
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
