import { safeStorageGet, safeStorageSet } from './storage.js';

// El tema ya fue aplicado por el inline script del <head> (anti-FOUC); este
// módulo se encarga del toggle, el listener del sistema y la sincronización
// de aria-pressed + meta theme-color.

export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    // Sincronizar aria-pressed acá (no en el handler del toggle) para que
    // cualquier camino que cambie el tema —click, prefers-color-scheme, init—
    // deje el atributo consistente sin duplicar lógica.
    const toggle = document.querySelector('#theme-toggle');
    if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    // Sincronizar el meta theme-color (afecta el color de la barra de URL en mobile)
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && primary) meta.content = primary;
}

export function initTheme() {
    applyTheme(getCurrentTheme());

    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
            safeStorageSet('theme', next);
            applyTheme(next);
        });
    }

    // Reaccionar a cambios del sistema SOLO SI el usuario NO eligió manualmente.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (safeStorageGet('theme')) return;
        applyTheme(e.matches ? 'dark' : 'light');
    });
}
