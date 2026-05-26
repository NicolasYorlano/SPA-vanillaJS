// Entry point: ensambla routes table + basePath y arranca init. Único módulo que conoce a todos los demás.

import { ROUTE, initRouter, pathFor, navigate, handleRouteChange, getActiveRoute } from './lib/router.js';
import { initTheme } from './lib/theme.js';
import { navLinks } from './lib/dom.js';
import { renderHome } from './views/home.js';
import { renderNotFound } from './views/notFound.js';
import { fetchCats, hydrateCatsCache } from './views/cats.js';
import { fetchLuxuryCars, hydrateCarsCache } from './views/cars.js';

// basePath se calcula acá (main.js vive en la raíz del deploy), no en lib/router.js
// — desde ahí import.meta.url apuntaría a /lib/ y daría un base incorrecto.
// .replace(/\/$/, '') normaliza para evitar doble slash al concatenar la ruta.
const basePath = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

// Lookup ruta → handler. Object.create(null) evita prototype pollution.
const routes = Object.create(null);
routes[ROUTE.HOME] = renderHome;
routes[ROUTE.CATS] = fetchCats;
routes[ROUTE.CARS] = fetchLuxuryCars;
routes[ROUTE.NOT_FOUND] = renderNotFound;

function init() {
    initTheme();
    initRouter({ routes, basePath });

    // Hidratar caches desde sessionStorage. Si no hay nada o el JSON está roto,
    // los loaders devuelven null y arrancamos como si fuera primer ingreso.
    hydrateCatsCache();
    hydrateCarsCache();

    navLinks.forEach(link => {
        // href dinámico para que ctrl+click / middle-click funcionen cuando la app no vive en la raíz del dominio.
        const routeName = link.dataset.route;
        if (Object.hasOwn(routes, routeName)) {
            link.href = pathFor(routeName);
        }
        link.addEventListener('click', (e) => {
            // Respetar modifiers para abrir en nueva pestaña / nueva ventana.
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            if (routeName === getActiveRoute()) return;
            if (!Object.hasOwn(routes, routeName)) return;
            navigate(routeName);
        });
    });

    const brandLink = document.querySelector('.brand-link');
    if (brandLink) {
        brandLink.href = pathFor(ROUTE.HOME);
        brandLink.addEventListener('click', (e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            if (getActiveRoute() !== ROUTE.HOME) navigate(ROUTE.HOME);
        });
    }

    window.addEventListener('popstate', () => handleRouteChange(false));
    handleRouteChange(true);

    const yearEl = document.querySelector('[data-year]');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    watchHeaderHeight();
}

// Expone la altura real del header como --header-height (el sidebar sticky la usa para offsetearse).
function watchHeaderHeight() {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    };
    update();
    new ResizeObserver(update).observe(header);
}

init();
