import { mainContainer, navLinks } from './dom.js';
import { showToast } from '../ui/toast.js';

// Router con History API. Stateless desde fuera: el estado vive acá adentro
// (activeRoute, currentController, routes table, basePath) y se accede via
// getters exportados. main.js inyecta la routes table y el basePath via
// initRouter() — el router no conoce ni a las views ni a la URL del deploy.

export const ROUTE = Object.freeze({
    HOME: 'home',
    CATS: 'cats',
    CARS: 'cars',
    NOT_FOUND: 'not-found'
});

const ROUTE_TITLES = {
    [ROUTE.HOME]: 'Inicio',
    [ROUTE.CATS]: 'Gatos',
    [ROUTE.CARS]: 'Autos',
    [ROUTE.NOT_FOUND]: '404'
};

const baseTitle = document.title;

// State interno del router
let routes = Object.create(null);
let basePath = '';
let activeRoute = null;
let currentController = null;

// Getters para que otros módulos lean sin tocar el estado.
export function getActiveRoute() { return activeRoute; }
export function getCurrentController() { return currentController; }

// Inicializa el router con la routes table y el basePath calculado por main.js.
// basePath se calcula con `new URL('.', import.meta.url).pathname` desde main.js
// (que está en la raíz del deploy) — no acá, porque acá import.meta.url apunta
// a /lib/router.js y daría un base incorrecto.
export function initRouter({ routes: routesMap, basePath: bp }) {
    routes = routesMap;
    basePath = bp;
}

// Invoca el handler de una ruta. Útil para retry de errores full-screen —
// el caller no necesita conocer la routes table, solo el routeName.
export function runRoute(routeName) {
    return routes[routeName]?.();
}

export function pathFor(routeName) {
    return basePath + (routeName === ROUTE.HOME ? '/' : `/${routeName}`);
}

export function parsePath() {
    let segment = location.pathname;
    if (basePath && segment.startsWith(basePath)) {
        segment = segment.slice(basePath.length);
    }
    segment = segment.replace(/^\/+|\/+$/g, '');
    if (segment === '' || segment === 'index.html') return ROUTE.HOME;
    return Object.hasOwn(routes, segment) ? segment : null;
}

export function navigate(routeName) {
    history.pushState({}, '', pathFor(routeName));
    handleRouteChange(false);
}

// Recarga la ruta actual (botón "Actualizar"): aborta fetches, renueva
// controller, dispara el handler con { reload: true } para que la view
// limpie su propio cache si corresponde, preserva scroll, toast si exitoso.
//
// El router NO conoce caches específicas (catsCache, carsCache) — cada view
// se hace cargo del suyo cuando ve la señal `{ reload: true }`.
export async function reloadCurrentRoute() {
    if (!activeRoute || activeRoute === ROUTE.HOME) return;
    const routeAtStart = activeRoute;
    const scrollY = window.scrollY;
    currentController?.abort();
    currentController = new AbortController();
    await routes[activeRoute]({ reload: true });
    // Si navegamos a otra ruta durante el reload, no aplicar scroll de la ruta vieja sobre la nueva.
    if (activeRoute !== routeAtStart) return;
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    // Confirmación efímera. Si la galería falló, hay un .error-msg en su
    // lugar y el toast de "actualizada" estaría mintiendo — se salta.
    if (!mainContainer.querySelector('.error-msg')) {
        showToast('Galería actualizada');
    }
}

export async function handleRouteChange(isInitial) {
    const parsed = parsePath();
    const routeName = parsed ?? ROUTE.NOT_FOUND;

    // Solo normalizamos la URL si parseamos una ruta conocida. Si es 404,
    // preservamos la URL original para que el usuario vea qué path intentó.
    if (parsed) {
        const canonical = pathFor(routeName);
        if (location.pathname !== canonical) {
            history.replaceState({}, '', canonical);
        }
    }

    if (routeName === activeRoute) return;

    // Abortar fetches en vuelo de la ruta anterior antes de cambiar el estado
    currentController?.abort();
    currentController = new AbortController();

    activeRoute = routeName;
    window.dispatchEvent(new CustomEvent('routechange', { detail: { route: routeName } }));

    const link = document.querySelector(`.sidebar a[data-route="${routeName}"]`);
    updateActiveNavLink(link);
    updateTitle(routeName);

    await routes[routeName]();
    if (!isInitial && activeRoute === routeName) focusMainHeading();
}

function updateActiveNavLink(activeLink) {
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });
    // Rutas sin link en el sidebar (ej. 404): ya limpiamos los estados
    // activos arriba, salimos sin marcar nada — así no queda resaltado el
    // link de la ruta anterior.
    if (!activeLink) return;
    activeLink.classList.add('active');
    activeLink.setAttribute('aria-current', 'page');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeLink.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest'
    });
}

function updateTitle(routeName) {
    const subtitle = ROUTE_TITLES[routeName];
    document.title = subtitle ? `${subtitle} | ${baseTitle}` : baseTitle;
}

function focusMainHeading() {
    const heading = mainContainer.querySelector('h1');
    // Foco programático: los screen readers anuncian la nueva sección al cambiar de ruta.
    if (heading) {
        heading.tabIndex = -1;
        heading.focus();
    }
}
