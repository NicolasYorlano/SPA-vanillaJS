import { safeStorageGet, safeStorageSet } from './storage.js';
import { announce, prefersReducedMotion } from './a11y.js';

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

const THEME_REVEAL_MS = 600;   // reveal circular (View Transitions)
let themeFadeTimer = null;

// Decide CÓMO se anima el cambio (applyTheme hace el cambio en sí).
// origin = centro del botón en viewport, para anclar el reveal.
function switchTheme(next, origin) {
    if (prefersReducedMotion()) {
        applyTheme(next);
        return;
    }

    if (typeof document.startViewTransition !== 'function') {
        fallbackCrossfade(next);
        return;
    }

    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
        // Radio hasta la esquina más lejana → el círculo cubre todo el viewport.
        const endRadius = Math.hypot(
            Math.max(origin.x, window.innerWidth - origin.x),
            Math.max(origin.y, window.innerHeight - origin.y)
        );
        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${origin.x}px ${origin.y}px)`,
                    `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`
                ]
            },
            {
                duration: THEME_REVEAL_MS,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    }).catch(() => {
        // VT abortada (toggle rápido): el tema ya se aplicó igual.
    });
}

// La duración del cross-fade vive solo en CSS (--theme-transition-duration); la
// leemos para no duplicar el número en JS. Acepta valores en s o ms.
function themeFadeMs() {
    const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--theme-transition-duration').trim();
    return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
}

// Cross-fade para navegadores sin View Transitions. La clase activa el transition
// global solo durante el cambio; se saca al terminar para no afectar los hovers.
function fallbackCrossfade(next) {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    applyTheme(next);
    clearTimeout(themeFadeTimer);
    // +60ms de margen para no cortar el final de la transición.
    themeFadeTimer = setTimeout(() => root.classList.remove('theme-transition'), themeFadeMs() + 60);
}

export function initTheme() {
    applyTheme(getCurrentTheme());

    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
            safeStorageSet('theme', next);
            // Centro del botón: ancla el reveal igual con mouse o teclado.
            const rect = toggle.getBoundingClientRect();
            switchTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            // Anunciar SOLO en toggle del usuario (no en init ni en cambio del sistema)
            // para que NVDA/VoiceOver confirmen la acción sin ruido al cargar la app.
            announce(next === 'dark' ? 'Tema oscuro activado' : 'Tema claro activado');
        });
    }

    // Reaccionar a cambios del sistema SOLO SI el usuario NO eligió manualmente.
    // Instantáneo: cambio pasivo del SO, sin click que ancle el reveal.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (safeStorageGet('theme')) return;
        applyTheme(e.matches ? 'dark' : 'light');
    });
}
