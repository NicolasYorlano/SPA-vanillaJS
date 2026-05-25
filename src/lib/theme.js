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
            // Anunciar SOLO en toggle del usuario (no en init ni en cambio del sistema)
            // para que NVDA/VoiceOver confirmen la acción sin ruido al cargar la app.
            announce(next === 'dark' ? 'Tema oscuro activado' : 'Tema claro activado');
        });
    }

    // Reaccionar a cambios del sistema SOLO SI el usuario NO eligió manualmente.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (safeStorageGet('theme')) return;
        applyTheme(e.matches ? 'dark' : 'light');
    });
}

// Update el live region #sr-announce para que screen readers lean el cambio.
// Limpia después de 3s para que un siguiente announce del MISMO texto vuelva
// a dispararse (live regions no re-anuncian si el textContent no cambia).
function announce(msg) {
    const live = document.querySelector('#sr-announce');
    if (!live) return;
    live.textContent = msg;
    setTimeout(() => { if (live.textContent === msg) live.textContent = ''; }, 3000);
}
