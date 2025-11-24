**Conclusion Tech Radar**

- **What it is:** A client-side interactive Technology Radar visualization showing technologies, their categories, and ratings by company and phase. Users can filter by category, phase (rings), company/domain, and tags, drill down by double-clicking labels, and view details in a modal.

**Key Features**
- Interactive radar visualization with D3.js.
- Filters for categories, phases (rings), companies (grouped by domain), and tags.
- Drill-down by double-clicking category or phase labels.
- Sidebar with resizable width and collapsible sections.
- Session-sticky color mapping for categories and companies.
- EN/NL localization and dynamic UI translations.

**Technology & Files**
- Pure static app: HTML, CSS and vanilla ES modules (no build step required).
- Third-party libraries: D3.js (included via script import in `index.html`).

Main source files
- `index.html` — app shell and UI layout.
- `css/style.css` — application styles and theme variables.
- `js/main.js` — app bootstrap (initialize i18n, data, UI and radar).
- `js/data.js` — loads JSON data and manages filter state and processing.
- `js/ui.js` — renders filters, sidebar interactions, modal, and event wiring.
- `js/radar.js` — D3 radar rendering, responsive sizing, legend and blips.
- `js/i18n.js`, `js/locales/en.js`, `js/locales/nl.js` — localization helpers and translation files.

Data files
- `data/ratings.json` — core ratings and blip definitions used to plot the radar.
- `data/technologies.json` — supporting metadata about technologies (if present).
- `data/companies.json` — company metadata (name, domain, logo, homepage) used to group companies and enrich modals.

Session / Local storage keys
- `sessionStorage.radarCategoryColors` — saved category → color map for the session.
- `sessionStorage.radarCompanyColors` — saved company → color map for the session.
- `localStorage.theme` — persisted theme (`dark`/`light`).
- (Optional) sidebar width may be persisted by future code.

Running locally
- No build step required. Serve the repository root over a static HTTP server and open `index.html` in your browser.

Quick options (PowerShell / Windows):

```powershell
# Option A: Python simple HTTP server (Python 3+)
python -m http.server 8000
# Then open http://localhost:8000 in your browser

# Option B: Using Node (if you have npm)
npx http-server -p 8080
# or
npx serve -s . -l 5000
```

Notes & development
- The app communicates between modules using `CustomEvent` events (e.g., `filter-category`, `filter-phase`, `open-modal`, `language-changed`).
- The radar layout computes ring spacing from the active phases returned by `js/data.js` so hiding phases compresses the rings.
- Blips are rendered as domain-shaped symbols (square/triangle/diamond/star/circle) and companies within the same domain share the same symbol shape. Company colors are assigned and persisted for the browser session.
- To change translations, edit `js/locales/en.js` and `js/locales/nl.js`, then switch using the language selector in the header.

Testing & verification
- After starting a static server, exercise the UI: toggle filters, double-click category/phase labels to drill down and back, resize the sidebar, and open modal details to confirm data and styling.

Contributing
- This is a simple static app — open a PR with changes to JS/CSS or data files. Keep changes focused and add small tests or usage notes to this README when adding features.

License
- No license file is included in this repository by default. Add one if you plan to publish.
