import { loadData } from './data.js';
import { initRadar, updateRadar } from './radar.js';
import { initUI } from './ui.js';
import { initI18n, setLocale, translatePage } from './i18n.js';

async function init() {
    try {
        // Initialize i18n first so static labels are translated before UI builds
        initI18n();

        // Wire language selector to change locale and notify UI modules
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                setLocale(e.target.value);
                // Notify other modules to refresh dynamic text
                document.dispatchEvent(new CustomEvent('language-changed'));
            });
        }

        const data = await loadData();
        console.log('Data loaded:', data);

        initRadar(data);
        initUI(data, updateRadar);

    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
