import {
    getLocalRatings,
    addLocalRating,
    deleteLocalRating,
    downloadRatingsJSON,
    clearLocalRatings,
    getCompanyDetails,
    setCompanyDetails,
    loadLocalRatings
} from '../localRatings.js';
import { getFilters, getProcessedData } from '../data.js';
import { t } from '../i18n.js';

export function initLocalRatingsUI(updateRadar) {
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
            openAddRatingModal(updateRadar);
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
                updateRadar(getProcessedData()); // Refresh radar
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
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.identifier || r.technology}</td>
                <td><span class="rating-phase ${r.fase?.toLowerCase()}">${r.fase}</span></td>
                <td>${r.datumBeoordeling}</td>
                <td>${r.toelichting || ''}</td>
                <td>
                    <button class="delete-rating-btn" data-id="${r._localId}" style="color:red;">&times;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach delete listeners
        tbody.querySelectorAll('.delete-rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                deleteLocalRating(id);
                renderLocalRatingsTable();
                // We should also trigger updateRadar ?? 
                // We need to pass updateRadar to this function or dispatch event.
                // For now, let's dispatch a custom event or assume user refreshes manually? 
                // No, better to dispatch 'local-ratings-changed'
                document.dispatchEvent(new CustomEvent('local-data-changed'));
            });
        });
    }
}

// Helper to open a form in the modal for adding a rating
function openAddRatingModal(updateRadar) {
    const modalContent = document.getElementById('modal-content');
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || !modalContent) return;

    const companyVal = document.getElementById('local-company-input')?.value || '';

    modalContent.innerHTML = `
        <h2>${t('manage.add_rating', 'Add New Rating')}</h2>
        <form id="add-rating-form" style="display:flex; flex-direction:column; gap:1rem;">
            <div>
                <label>Company</label>
                <input type="text" name="company" value="${companyVal}" required style="width:100%; padding:0.5rem;">
            </div>
            <div>
                <label>Technology (Identifier)</label>
                <input type="text" name="identifier" list="tech-options" required style="width:100%; padding:0.5rem;" autocomplete="off">
                <datalist id="tech-options">
                    ${getProcessedData().technologies.sort((a, b) => (a.identifier || '').localeCompare(b.identifier || '')).map(t => `<option value="${t.identifier}">${t.name}</option>`).join('')}
                </datalist>
            </div>
             <div>
                <label>Phase</label>
                <select name="phase" style="width:100%; padding:0.5rem;">
                    <option value="Assess">Assess</option>
                    <option value="Trial">Trial</option>
                    <option value="Adopt">Adopt</option>
                    <option value="Hold">Hold</option>
                </select>
            </div>
             <div>
                <label>Comment</label>
                <textarea name="comment" rows="3" style="width:100%; padding:0.5rem;"></textarea>
            </div>
            <button type="submit" class="filter-btn" style="background:var(--accent-color); color:white;">Save</button>
        </form>
    `;

    document.getElementById('add-rating-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const newRating = {
            bedrijf: formData.get('company'),
            identifier: formData.get('identifier'),
            fase: formData.get('phase'),
            toelichting: formData.get('comment'),
            datumBeoordeling: new Date().toISOString().split('T')[0],
            beoordelaars: ['Me']
        };

        addLocalRating(newRating);
        updateRadar(getProcessedData()); // Refresh map
        renderLocalRatingsTable();
        // Close modal
        document.getElementById('modal-overlay').classList.add('hidden');
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
        welcome.textContent = `Hi, ${userDetails.name || 'User'}`;
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
