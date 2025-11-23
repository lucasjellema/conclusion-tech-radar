import { loadData } from './data.js';
import { initRadar, updateRadar } from './radar.js';
import { initUI } from './ui.js';

async function init() {
    try {
        const data = await loadData();
        console.log('Data loaded:', data);
        
        initRadar(data);
        initUI(data, updateRadar);
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
