import {
    getLocalRatings,
    addLocalRating,
    updateLocalRating,
    deleteLocalRating,
    downloadRatingsJSON,
    clearLocalRatings,
    getCompanyDetails,
    setCompanyDetails,
    loadLocalRatings,
    addCustomTechnology,
    loadCustomTechnologies
} from '../localRatings.js';
import { getFilters, getProcessedData, getTechnology, refreshLocalData } from '../data.js';
import { t } from '../i18n.js';

let radarUpdateFn = null;

export function initLocalRatingsUI(updateRadar) {
    radarUpdateFn = updateRadar;
    // Populate Companies Datalist
    const datalist = document.getElementById('companies-datalist');
    if (datalist) {
        // We can get companies from the loaded data
        const { companies } = getFilters(); // This returns a Set
        // Or getAllData() to get refined list?
        // Let's use getFilters().companies which contains all companies from JSON
        const sortedCompanies = Array.from(companies).sort();
        datalist.innerHTML = sortedCompanies.map(c => `<option value="${c}"></option>`).join('');
    }

    // Company Input Change - Show/Hide Details Form
    const companyInput = document.getElementById('local-company-input');
    const detailsSection = document.getElementById('company-details-section');

    if (companyInput) {
        companyInput.addEventListener('change', (e) => {
            const companyName = e.target.value;
            if (companyName) {
                // Load existing details for this company
                const details = getCompanyDetails(companyName);
                document.getElementById('company-topics-input').value = details.belangrijksteOnderwerpen || '';
                document.getElementById('company-explanation-input').value = details.toelichting || '';
                if (detailsSection) detailsSection.style.display = 'block';
            } else {
                if (detailsSection) detailsSection.style.display = 'none';
            }
            renderLocalRatingsTable();
        });
    }

    // Save Company Details
    const saveDetailsBtn = document.getElementById('save-company-details-btn');
    if (saveDetailsBtn) {
        saveDetailsBtn.addEventListener('click', () => {
            const companyName = companyInput.value;
            if (!companyName) return;

            const details = {
                belangrijksteOnderwerpen: document.getElementById('company-topics-input').value,
                toelichting: document.getElementById('company-explanation-input').value
            };
            setCompanyDetails(companyName, details);
            alert(t('manage.details_saved', 'Company details saved!'));
            // Probably trigger a data reload or just assume it is fine?
            // If data is used on radar, we might need mapped data update.
            // But let's stick to basic saving for now.
        });
    }

    // Add Rating Button (Mockup logic - typically would open a form modal)
    // For now, let's just assume we want to guide user or maybe there was a modal form?
    // Since I lost the code, I'll implement a basic "Add Rating" prompt or modal.
    // The previous prompt had "Implementing Local Ratings" which implied a modal or form.
    // I don't see an explicit "add rating modal" in index.html.
    // Wait, index.html has a "#modal-content" div.
    // Maybe "Add Rating" opens a specific form in the main modal?
    // I'll implement a simple prompt-based flow or minimal form for recovery.
    const addRatingBtn = document.getElementById('add-rating-btn');
    if (addRatingBtn) {
        addRatingBtn.addEventListener('click', () => {
            // Simplified: asking user for input via prompt/confirm for now as fallback
            // Ideally we'd build a proper form in the modal.
            // Let's create a dynamic form in the modal.
            openAddRatingModal(radarUpdateFn);
        });
    }

    // Download JSON
    const downloadBtn = document.getElementById('download-ratings-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const company = companyInput ? companyInput.value : null;
            downloadRatingsJSON(company);
        });
    }

    // Clear All
    const clearBtn = document.getElementById('clear-all-ratings-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm(t('manage.confirm_clear', 'Are you sure you want to delete all local ratings?'))) {
                clearLocalRatings();
                renderLocalRatingsTable();
                radarUpdateFn(getProcessedData()); // Refresh radar
            }
        });
    }

    renderLocalRatingsTable();
}

function renderLocalRatingsTable() {
    const tbody = document.getElementById('local-ratings-tbody');
    const noRatingsMsg = document.getElementById('no-ratings-message');
    if (!tbody) return;

    const ratings = getLocalRatings();
    tbody.innerHTML = '';

    if (ratings.length === 0) {
        if (noRatingsMsg) noRatingsMsg.style.display = 'block';
    } else {
        if (noRatingsMsg) noRatingsMsg.style.display = 'none';
        ratings.forEach(r => {
            const tech = getTechnology(r.identifier);
            const techName = tech ? tech.name : r.identifier;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${techName}</td>
                <td><span class="rating-phase ${r.fase?.toLowerCase()}">${r.fase}</span></td>
                <td>${r.datumBeoordeling}</td>
                <td>${r.toelichting || ''}</td>
                <td>
                    <button class="edit-rating-btn" data-id="${r._localId}" title="${t('manage.edit_rating', 'Edit Rating')}" style="margin-right:0.5rem; background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                    <button class="delete-rating-btn" data-id="${r._localId}" title="${t('manage.delete_rating', 'Delete Rating')}" style="color:red; background:none; border:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach action listeners
        tbody.querySelectorAll('.edit-rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const ratings = getLocalRatings();
                const rating = ratings.find(r => r._localId === id);
                if (rating) {
                    openAddRatingModal(radarUpdateFn, rating);
                }
            });
        });

        tbody.querySelectorAll('.delete-rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm(t('manage.confirm_delete_single', 'Are you sure you want to delete this rating?'))) {
                    deleteLocalRating(id);
                    renderLocalRatingsTable();
                    document.dispatchEvent(new CustomEvent('local-data-changed'));
                }
            });
        });
    }
}

// Helper to open a form in the modal for adding/editing a rating
function openAddRatingModal(updateRadar, ratingToEdit = null, prefilledData = null) {
    const modalContent = document.getElementById('modal-content');
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || !modalContent) return;

    const isEditing = !!ratingToEdit;
    const companyVal = isEditing ? ratingToEdit.bedrijf : (prefilledData ? prefilledData.bedrijf : (document.getElementById('local-company-input')?.value || ''));
    const techNameVal = isEditing ? (getTechnology(ratingToEdit.identifier)?.name || ratingToEdit.identifier) : (prefilledData ? prefilledData.techName : '');
    const phaseVal = isEditing ? ratingToEdit.fase : (prefilledData ? prefilledData.fase : '');
    const commentVal = isEditing ? (ratingToEdit.toelichting || '') : (prefilledData ? prefilledData.comment : '');

    modalContent.innerHTML = `
        <h2>${isEditing ? t('manage.edit_rating', 'Edit Rating') : t('manage.add_rating', 'Add New Rating')}</h2>
        <form id="add-rating-form" style="display:flex; flex-direction:column; gap:1rem;">
            <div>
                <label>Company</label>
                <input type="text" id="rating-company-input" name="company" value="${companyVal}" style="width:100%; padding:0.5rem;" placeholder="Leave empty for individual rating">
            </div>
            <div style="display:flex; gap:0.5rem; align-items: flex-end;">
                <div style="flex-grow: 1;">
                    <label>Technology Name</label>
                    <input type="text" id="rating-tech-input" name="techName" list="tech-options" value="${techNameVal}" required style="width:100%; padding:0.5rem;" autocomplete="off">
                </div>
                <button type="button" id="add-new-tech-btn" class="filter-btn" title="Add New Technology" style="padding: 0.5rem 0.8rem; height: 38px; font-weight: bold; border-radius: 4px;">+</button>
                <datalist id="tech-options">
                    ${getProcessedData().technologies.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(t => `<option value="${t.name}">${t.identifier}</option>`).join('')}
                </datalist>
            </div>
             <div>
                <label>Phase</label>
                <select id="rating-phase-select" name="phase" style="width:100%; padding:0.5rem;">
                </select>
            </div>
             <div>
                <label>Comment</label>
                <textarea id="comment-editor" name="comment" rows="3" style="width:100%; padding:0.5rem;">${commentVal}</textarea>
            </div>
            <button type="submit" class="filter-btn" style="background:var(--accent-color); color:white;">
                ${isEditing ? t('manage.save_changes', 'Save Changes') : t('manage.save', 'Save')}
            </button>
        </form>
    `;

    const companyInput = document.getElementById('rating-company-input');
    const phaseSelect = document.getElementById('rating-phase-select');

    const updatePhases = () => {
        const hasCompany = !!companyInput.value.trim();
        const phases = hasCompany
            ? ['Adopt', 'Trial', 'Assess', 'Hold', 'Deprecate']
            : ['Pre-assess', 'Personal Assess', 'Personal-use', 'Hold-individual'];

        const currentVal = phaseSelect.value || phaseVal || '';

        phaseSelect.innerHTML = phases.map(p => {
            const label = t(`phases.${p.toLowerCase()}`, p).split(' — ')[0];
            return `<option value="${p}" ${currentVal.toLowerCase() === p.toLowerCase() ? 'selected' : ''}>${label}</option>`;
        }).join('');
    };

    companyInput.addEventListener('input', updatePhases);
    updatePhases();

    // Plus button listener
    const addTechBtn = document.getElementById('add-new-tech-btn');
    if (addTechBtn) {
        addTechBtn.addEventListener('click', () => {
            const currentData = {
                bedrijf: document.getElementById('rating-company-input').value,
                techName: document.getElementById('rating-tech-input').value,
                fase: phaseSelect.value,
                comment: easyMDE ? easyMDE.value() : document.getElementById('comment-editor').value
            };

            // Check if technology already exists in custom techs
            const customTechs = loadCustomTechnologies();
            const existingCustom = customTechs.find(t => t.name.toLowerCase() === currentData.techName.toLowerCase());

            openAddTechnologyModal((newTech) => {
                refreshLocalData();
                openAddRatingModal(updateRadar, ratingToEdit, { ...currentData, techName: newTech.name });
            }, existingCustom || { name: currentData.techName });
        });
    }

    // Initialize EasyMDE
    let easyMDE = null;
    if (typeof EasyMDE !== 'undefined') {
        easyMDE = new EasyMDE({
            element: document.getElementById('comment-editor'),
            spellChecker: false,
            autosave: { enabled: false },
            toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "|", "guide"],
            status: false,
            minHeight: "150px"
        });
    }

    document.getElementById('add-rating-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const techName = formData.get('techName');
        const allTechs = getProcessedData().technologies;
        const existingTech = allTechs.find(t => t.name === techName);

        let identifier = existingTech ? existingTech.identifier : null;

        if (!identifier) {
            // New technology - create custom tech
            const newTech = addCustomTechnology({ name: techName });
            identifier = newTech.identifier;
            refreshLocalData();
        }

        const ratingData = {
            bedrijf: formData.get('company'),
            identifier: identifier,
            fase: formData.get('phase'),
            toelichting: easyMDE ? easyMDE.value() : formData.get('comment'),
            datumBeoordeling: isEditing ? ratingToEdit.datumBeoordeling : new Date().toISOString().split('T')[0],
            beoordelaars: isEditing ? ratingToEdit.beoordelaars : ['Me']
        };

        if (isEditing) {
            updateLocalRating(ratingToEdit._localId, ratingData);
            refreshLocalData();
            completeUpdate();
        } else {
            addLocalRating(ratingData);
            refreshLocalData();
            completeUpdate();
        }

        function completeUpdate() {
            radarUpdateFn(getProcessedData()); // Refresh map
            renderLocalRatingsTable();
            // Close modal
            document.getElementById('modal-overlay').classList.add('hidden');
        }
    });

    overlay.classList.remove('hidden');
}

function openAddTechnologyModal(onSelect, initialData = {}) {
    const modalContent = document.getElementById('modal-content');
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || !modalContent) return;

    const isEditing = !!initialData.identifier;

    modalContent.innerHTML = `
        <h2>${isEditing ? 'Edit Technology' : 'Add New Technology'}</h2>
        <form id="add-tech-form" style="display:flex; flex-direction:column; gap:1rem; max-height: 70vh; overflow-y: auto; padding: 0.5rem;">
            <div>
                <label>Name</label>
                <input type="text" name="name" value="${initialData.name || ''}" required style="width:100%; padding:0.5rem;" autocomplete="off">
            </div>
            <div>
                <label>Category</label>
                <select name="category" style="width:100%; padding:0.5rem;">
                    ${getFilters().categories.map(c => `<option value="${c}" ${initialData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    <option value="Other" ${initialData.category === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div>
                <label>Logo URL</label>
                <input type="text" name="logo" value="${initialData.logo || ''}" style="width:100%; padding:0.5rem;" placeholder="https://example.com/logo.png">
            </div>
            <div>
                <label>Vendor</label>
                <input type="text" name="vendor" value="${initialData.vendor || ''}" style="width:100%; padding:0.5rem;">
            </div>
            <div>
                <label>Homepage</label>
                <input type="url" name="homepage" value="${initialData.homepage || ''}" style="width:100%; padding:0.5rem;" placeholder="https://">
            </div>
            <div>
                <label>Tags (comma separated)</label>
                <input type="text" name="tags" value="${(initialData.tags || []).join(', ')}" style="width:100%; padding:0.5rem;" placeholder="cloud, ai, developer-tools">
            </div>
            <div>
                <label>Description</label>
                <textarea name="description" rows="3" style="width:100%; padding:0.5rem;">${initialData.description || ''}</textarea>
            </div>
            <button type="submit" class="filter-btn" style="background:var(--accent-color); color:white;">
                ${isEditing ? 'Update Technology' : 'Create Technology'}
            </button>
        </form>
    `;

    document.getElementById('add-tech-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const tagsString = formData.get('tags') || '';
        const tagsArray = tagsString.split(',').map(s => s.trim()).filter(s => s !== '');

        const techToSave = {
            name: formData.get('name'),
            category: formData.get('category'),
            description: formData.get('description'),
            logo: formData.get('logo'),
            vendor: formData.get('vendor'),
            homepage: formData.get('homepage'),
            tags: tagsArray
        };

        const newTech = addCustomTechnology(techToSave);

        if (onSelect) onSelect(newTech);
    });

    overlay.classList.remove('hidden');
}

export function hideManageRatingsTab() {
    const btn = document.getElementById('manage-ratings-tab-btn');
    if (btn) btn.style.display = 'none';
    // If we were on that tab, switch back to radar
    if (btn && btn.classList.contains('active')) {
        document.getElementById('radar-tab-btn').click();
    }
}

export function showManageRatingsTab() {
    const btn = document.getElementById('manage-ratings-tab-btn');
    if (btn) btn.style.display = 'block'; // or flex
}

export function showAuthenticatedUser(userDetails, claims) {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
        welcome.textContent = `Hi, ${userDetails.displayName || 'User'}`;
        welcome.classList.remove('sr-only');
    }
    const signIn = document.getElementById('signin-button');
    if (signIn) signIn.style.display = 'none';
    const signOut = document.getElementById('signout-button');
    if (signOut) signOut.style.display = 'block';
}

export function showUnauthenticatedState() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
        welcome.textContent = '';
        welcome.classList.add('sr-only');
    }
    const signIn = document.getElementById('signin-button');
    if (signIn) signIn.style.display = 'block';
    const signOut = document.getElementById('signout-button');
    if (signOut) signOut.style.display = 'none';
}

export function showError(message) {
    alert(message || 'An error occurred');
}

export function showDataError(message) {
    console.error(message);
    alert('Data Error: ' + message);
}
