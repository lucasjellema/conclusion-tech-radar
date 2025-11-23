import en from './locales/en.js';
import nl from './locales/nl.js';

let current = en;
let currentLang = 'en';

export function initI18n() {
  const savedLS = localStorage.getItem('lang');
  let saved;
  if (savedLS) saved = savedLS;
  else if (navigator?.language?.startsWith('nl')) saved = 'nl';
  else saved = 'en';
  setLocale(saved);
}

export function setLocale(lang) {
  currentLang = lang === 'nl' ? 'nl' : 'en';
  current = currentLang === 'nl' ? nl : en;
  localStorage.setItem('lang', currentLang);
  translatePage();
}

export function getLocale() {
  return currentLang;
}

export function t(key, fallback) {
  if (!key) return fallback || '';
  const parts = key.split('.');
  let v = current;
  for (const p of parts) {
    if (v && Object.hasOwn(v, p)) v = v[p];
    else { v = undefined; break; }
  }
  return v ?? fallback ?? key;
}

export function translatePage() {
  const nodes = document.querySelectorAll('[data-i18n-key]');
  for (const el of nodes) {
    const k = el.dataset.i18nKey;
    const val = t(k);
    if (el.tagName === 'INPUT' && ('placeholder' in el)) {
      el.placeholder = val;
    } else {
      el.innerText = val;
    }
  }

  // Update dynamic theme button text if present
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const theme = document.documentElement.dataset.theme || 'dark';
    const themeLabel = t('header.theme');
    const themeState = theme === 'light' ? t('header.theme_light') : t('header.theme_dark');
    themeBtn.textContent = `${themeLabel}: ${themeState}`;
  }

  // Update language selector if present
  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = currentLang;
}
