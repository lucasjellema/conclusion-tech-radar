import { t } from '../i18n.js';
import { getRatingsForTech, getCompanyByName } from '../data.js';

export function openModal(data) {
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
                     <span class="company-name">${data.rating.bedrijf}</span>
                     ${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.rating.bedrijf} logo" style="height:24px; width:auto;">` : ''}
                </div>
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

export function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}
