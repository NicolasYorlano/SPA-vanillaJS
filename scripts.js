const MAX_ITEMS = 30;
const ITEMS_PER_PAGE = 6;
const PAGE_RANGE = 10; // Rango de páginas para el random inicial en la API de autos
const FETCH_TIMEOUT_MS = 10000;
const BASE_TITLE = document.title;
const BASE_PATH = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

const ROUTE = Object.freeze({
    HOME: 'home',
    CATS: 'cats',
    CARS: 'cars'
});

const ROUTE_TITLES = {
    [ROUTE.HOME]: 'Inicio',
    [ROUTE.CATS]: 'Gatitos',
    [ROUTE.CARS]: 'Autos'
};

const mainContainer = document.querySelector('#root');
const navLinks = document.querySelectorAll('.sidebar a[data-route]');

let activeRoute = null;
let currentController = null;
// Recordamos la última página inicial usada por la galería de autos para
// garantizar que dos refreshes consecutivos nunca caigan en la misma página.
let lastCarsStartPage = null;

// Lookup ruta → handler. Object.create(null) evita prototype pollution.
const routes = Object.create(null);
routes[ROUTE.HOME] = renderHome;
routes[ROUTE.CATS] = fetchCats;
routes[ROUTE.CARS] = fetchLuxuryCars;

// === Theme ===

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    // Sincronizar el meta theme-color (afecta el color de la barra de URL en mobile)
    const primary = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && primary) meta.content = primary;
}

function initTheme() {
    // El tema ya fue aplicado por el script inline del <head>. Solo configuramos
    // el toggle y el listener de prefers-color-scheme.
    applyTheme(getCurrentTheme());

    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            applyTheme(next);
        });
    }

    // Reaccionar a cambios del sistema solo si el usuario no eligió manualmente.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme')) return;
        applyTheme(e.matches ? 'dark' : 'light');
    });
}

// === Router & bootstrap ===

function init() {
    initTheme();

    navLinks.forEach(link => {
        // Setear href dinámicamente al basePath para que ctrl+click / middle-click
        // funcionen correctamente cuando la app no vive en la raíz del dominio.
        const routeName = link.dataset.route;
        if (Object.hasOwn(routes, routeName)) {
            link.href = pathFor(routeName);
        }
        link.addEventListener('click', (e) => {
            // Respetar modifiers para abrir en nueva pestaña / nueva ventana.
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            if (routeName === activeRoute) return;
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
            if (activeRoute !== ROUTE.HOME) navigate(ROUTE.HOME);
        });
    }

    window.addEventListener('popstate', () => handleRouteChange(false));
    handleRouteChange(true);

    const yearEl = document.querySelector('[data-year]');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    watchHeaderHeight();
}

// El header cambia de altura entre desktop y mobile (column → row compacto).
// Exponemos la altura real como CSS var --header-height para que el sidebar
// sticky pueda offsetearse correctamente en cualquier breakpoint.
function watchHeaderHeight() {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    };
    update();
    new ResizeObserver(update).observe(header);
}

function pathFor(routeName) {
    return BASE_PATH + (routeName === ROUTE.HOME ? '/' : `/${routeName}`);
}

function parsePath() {
    let segment = location.pathname;
    if (BASE_PATH && segment.startsWith(BASE_PATH)) {
        segment = segment.slice(BASE_PATH.length);
    }
    segment = segment.replace(/^\/+|\/+$/g, '');
    if (segment === '' || segment === 'index.html') return ROUTE.HOME;
    return Object.hasOwn(routes, segment) ? segment : null;
}

function navigate(routeName) {
    history.pushState({}, '', pathFor(routeName));
    handleRouteChange(false);
}

// Recarga la ruta actual abortando fetches en vuelo y creando un AbortController
// nuevo. Preserva la posición de scroll. Usado por el botón "Actualizar" para
// no bypasear el patrón de cancelación del router.
async function reloadCurrentRoute() {
    if (!activeRoute || activeRoute === ROUTE.HOME) return;
    const scrollY = window.scrollY;
    currentController?.abort();
    currentController = new AbortController();
    await routes[activeRoute]();
    window.scrollTo({ top: scrollY, behavior: 'instant' });
}

// Wrapper de fetch que aplica timeout sin pisar el AbortController del router.
// Compone dos signals con AbortSignal.any: el del router (cancelación por cambio
// de ruta) y uno local con timeout. Si el timeout fue el que disparó, traduce el
// AbortError en un Error con mensaje claro para que el caller pueda mostrarlo.
// AbortSignal.any tiene soporte universal en navegadores modernos (Chrome 116+,
// Firefox 124+, Safari 17.4+).
async function fetchWithTimeout(url, { timeout = FETCH_TIMEOUT_MS } = {}) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    const signals = [currentController?.signal, timeoutController.signal].filter(Boolean);
    const signal = AbortSignal.any(signals);
    try {
        return await fetch(url, { signal });
    } catch (error) {
        if (error.name === 'AbortError' && timeoutController.signal.aborted) {
            throw new Error('La conexión tardó demasiado. Probá de nuevo.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function handleRouteChange(isInitial) {
    const routeName = parsePath() ?? ROUTE.HOME;

    const canonical = pathFor(routeName);
    if (location.pathname !== canonical) {
        history.replaceState({}, '', canonical);
    }

    if (routeName === activeRoute) return;

    // Abortar fetches en vuelo de la ruta anterior antes de cambiar el estado
    currentController?.abort();
    currentController = new AbortController();

    activeRoute = routeName;
    window.dispatchEvent(new CustomEvent('routechange', { detail: { route: routeName } }));

    const link = document.querySelector(`.sidebar a[data-route="${routeName}"]`);
    if (link) updateActiveButton(link);
    updateTitle(routeName);

    await routes[routeName]();
    if (!isInitial && activeRoute === routeName) focusMainHeading();
}

function updateActiveButton(activeLink) {
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });
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
    document.title = subtitle ? `${subtitle} | ${BASE_TITLE}` : BASE_TITLE;
}

function focusMainHeading() {
    const heading = mainContainer.querySelector('h1');
    // Foco programático: los screen readers anuncian la nueva sección al cambiar de ruta.
    if (heading) {
        heading.tabIndex = -1;
        heading.focus();
    }
}

// === UI helpers (skeletons, errores, estados vacíos) ===

function showSkeleton(count = ITEMS_PER_PAGE) {
    mainContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'data-grid';
    grid.setAttribute('role', 'status');
    grid.setAttribute('aria-label', 'Cargando contenido');

    for (let i = 0; i < count; i++) {
        grid.appendChild(createSkeletonCard());
    }

    mainContainer.appendChild(grid);
}

function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';

    const img = document.createElement('div');
    img.className = 'skeleton-img';

    const name = document.createElement('div');
    name.className = 'skeleton-name';

    card.appendChild(img);
    card.appendChild(name);
    return card;
}

function showError(message, container = mainContainer, onRetry = null) {
    container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-msg';
    errorDiv.setAttribute('role', 'alert');

    const text = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Error: ';
    text.appendChild(strong);
    text.appendChild(document.createTextNode(message));
    errorDiv.appendChild(text);

    if (onRetry) {
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'error-retry';
        retryBtn.textContent = 'Reintentar';
        retryBtn.addEventListener('click', onRetry);
        errorDiv.appendChild(retryBtn);
    }

    container.appendChild(errorDiv);
}

function humanizeError(error) {
    console.error('[App error]', error);
    // fetch() solo tira TypeError ante fallas de red; SyntaxError viene de un JSON inválido.
    if (error instanceof TypeError) {
        return 'No se pudo conectar. Revisá tu conexión.';
    }
    if (error instanceof SyntaxError) {
        return 'Respuesta inválida del servidor.';
    }
    return error.message;
}

function showEmptyState(grid, message = 'No se encontraron resultados.') {
    grid.innerHTML = '';
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = message;
    grid.appendChild(empty);
}

// === Vistas: home y galerías ===

function renderHome() {
    const phrases = [
        { text: "La tecnología es mejor cuando une a las personas.", className: "shadow-1" },
        { text: "El software es una combinación de arte e ingeniería.", className: "shadow-2" },
        { text: "La innovación distingue a los líderes de los seguidores.", className: "shadow-3" }
    ];

    const selected = phrases[Math.floor(Math.random() * phrases.length)];

    // innerHTML es seguro acá: todas las strings son hardcoded en el módulo,
    // ningún valor proviene de input del usuario ni de respuestas de APIs.
    mainContainer.innerHTML = `
        <h1 class="content-title">Página de Inicio</h1>

        <h2 class="${selected.className} highlighted-quote">"${selected.text}"</h2>

        <section class="expectations-paragraph">
            <h3>Mis Expectativas</h3>
            <p>
                Espero profundizar mis conocimientos en el desarrollo de aplicaciones web
                modernas con html, css y javascript, comprendiendo no solo la implementación
                técnica sino también la gestión eficiente de proyectos y nuevas tecnologías de la Web 2.0.
            </p>
        </section>

        <section aria-label="Explorá las galerías">
            <div class="home-cta-grid">
                <a href="${pathFor(ROUTE.CATS)}" class="home-cta" data-route="${ROUTE.CATS}">
                    <h3 class="home-cta-title">
                        Galería de gatos
                        <span class="home-cta-arrow" aria-hidden="true">→</span>
                    </h3>
                    <p class="home-cta-desc">Imágenes aleatorias desde The Cat API con nombres asignados al azar.</p>
                </a>
                <a href="${pathFor(ROUTE.CARS)}" class="home-cta" data-route="${ROUTE.CARS}">
                    <h3 class="home-cta-title">
                        Galería de autos
                        <span class="home-cta-arrow" aria-hidden="true">→</span>
                    </h3>
                    <p class="home-cta-desc">Fotos de supercars desde Pixabay con paginación y búsqueda por tags.</p>
                </a>
            </div>
        </section>
    `;

    // Interceptar clicks en las CTAs para navegar via router (SPA) en vez de
    // recargar la página, manteniendo modifiers para abrir en nueva pestaña.
    mainContainer.querySelectorAll('.home-cta[data-route]').forEach(cta => {
        cta.addEventListener('click', (e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            const routeName = cta.dataset.route;
            if (Object.hasOwn(routes, routeName)) navigate(routeName);
        });
    });
}

function createGallerySection({ titleText, refreshId, refreshText, loadMoreText }) {
    mainContainer.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'section-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';

    const title = document.createElement('h1');
    title.className = 'content-title';
    title.textContent = titleText;

    const counter = document.createElement('p');
    counter.className = 'gallery-counter';
    counter.setAttribute('aria-live', 'polite');

    titleGroup.appendChild(title);
    titleGroup.appendChild(counter);

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.id = refreshId;
    refreshBtn.className = 'btn-secondary';
    refreshBtn.textContent = `↻ ${refreshText}`;
    refreshBtn.addEventListener('click', () => {
        if (refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        reloadCurrentRoute();
    });

    header.appendChild(titleGroup);
    header.appendChild(refreshBtn);

    const grid = document.createElement('div');
    grid.className = 'data-grid';

    const loadMoreContainer = document.createElement('div');
    loadMoreContainer.className = 'load-more-container';

    const loadMoreError = document.createElement('div');
    loadMoreError.className = 'load-more-error';

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'btn-primary';
    loadMoreBtn.textContent = loadMoreText;

    loadMoreContainer.appendChild(loadMoreError);
    loadMoreContainer.appendChild(loadMoreBtn);

    mainContainer.appendChild(header);
    mainContainer.appendChild(grid);
    mainContainer.appendChild(loadMoreContainer);

    return { grid, loadMoreBtn, loadMoreContainer, counter, loadMoreError };
}

function buildCard({ imgSrc, alt, name }) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.setAttribute('aria-label', `Ver imagen de ${name} en grande`);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = alt;
    img.loading = 'lazy';
    img.addEventListener('load', () => {
        img.classList.add('card-img-loaded');
        imgContainer.classList.add('img-loaded');
    });
    img.addEventListener('error', () => {
        img.remove();
        imgContainer.classList.add('img-loaded');
        const placeholder = document.createElement('div');
        placeholder.className = 'img-error';
        placeholder.textContent = 'Imagen no disponible';
        imgContainer.appendChild(placeholder);
    });

    const nameEl = document.createElement('span');
    nameEl.className = 'card-name';
    nameEl.textContent = name;

    imgContainer.appendChild(img);
    card.appendChild(imgContainer);
    card.appendChild(nameEl);

    card.addEventListener('click', () => openCardModal({ imgSrc, alt, name }));

    return card;
}

function openCardModal({ imgSrc, alt, name }) {
    const previousOverflow = document.body.style.overflow;

    const modal = document.createElement('dialog');
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-label', name);

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar imagen');
    closeBtn.title = 'Cerrar (Esc)';
    closeBtn.textContent = '×';

    const skeleton = document.createElement('div');
    skeleton.className = 'modal-img-skeleton';
    skeleton.setAttribute('role', 'status');
    skeleton.setAttribute('aria-label', 'Cargando imagen');

    const img = document.createElement('img');
    img.className = 'modal-img';
    img.alt = alt;
    img.hidden = true;

    const title = document.createElement('p');
    title.className = 'modal-title';
    title.textContent = name;

    dialog.appendChild(closeBtn);
    dialog.appendChild(skeleton);
    dialog.appendChild(img);
    dialog.appendChild(title);
    modal.appendChild(dialog);

    img.addEventListener('load', () => {
        skeleton.remove();
        img.hidden = false;
    });
    img.addEventListener('error', () => {
        skeleton.remove();
        img.remove();
        const placeholder = document.createElement('div');
        placeholder.className = 'modal-img-error';
        placeholder.textContent = 'Imagen no disponible';
        dialog.insertBefore(placeholder, title);
    });
    img.src = imgSrc;

    const close = () => {
        // Guard idempotente: si el cierre ya está en curso (ej. Esc + routechange
        // disparan close en simultáneo), no acumular un segundo listener de
        // animationend ni re-disparar la lógica de cleanup.
        if (modal.classList.contains('modal-closing')) return;
        modal.classList.add('modal-closing');
        modal.addEventListener('animationend', () => {
            modal.close();
            modal.remove();
            window.removeEventListener('routechange', closeOnNav);
            document.body.style.overflow = previousOverflow;
        }, { once: true });
    };

    const closeOnNav = () => close();

    // El <dialog> nativo dispara 'cancel' al apretar Escape; lo interceptamos
    // para correr nuestra animación de cierre en lugar del cierre instantáneo.
    modal.addEventListener('cancel', (e) => {
        e.preventDefault();
        close();
    });

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    window.addEventListener('routechange', closeOnNav);

    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
    modal.showModal();
}

const catNames = [
    "Pelusa", "Simba", "Luna", "Garfield", "Salem",
    "Michi", "Oliver", "Tom", "Milo", "Ágatha",
    "Félix", "Nala", "Figaro", "Bigotes", "Mantequilla",
    "Caspian", "Ramsés", "Copito", "Pantufla", "Doraemon", "Silvestre",
    "Mittens", "Bastian", "Lulú", "Chispita", "Romeo", "Duquesa",
    "Gandalf", "Minerva", "Aquiles", "Pippin", "Toby"
];

// Fisher-Yates shuffle: orden aleatorio uniforme en O(n).
function shuffleNames() {
    const shuffled = [...catNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Orquesta una galería: skeleton → fetch → render → paginación → manejo de errores.
// Cada ruta inyecta su estrategia específica (fetchPage, mapItem, dedupeBy).
async function loadGallery({ routeName, section, fetchPage, dedupeBy, mapItem, loadMoreErrorPrefix }) {
    showSkeleton();
    try {
        const initialItems = await fetchPage();
        if (activeRoute !== routeName) return;

        const { grid, loadMoreBtn, loadMoreContainer, counter, loadMoreError } = createGallerySection(section);

        const seenIds = new Set();
        let totalItems = 0;
        let exhausted = false;

        const updateCounter = () => {
            counter.classList.add('is-updating');
            counter.textContent = exhausted
                ? `Mostrando ${totalItems} resultados`
                : `Mostrando ${totalItems} de ${MAX_ITEMS}`;
            requestAnimationFrame(() => counter.classList.remove('is-updating'));
        };

        const render = (items) => {
            const remaining = MAX_ITEMS - totalItems;
            if (remaining <= 0) return 0;

            const fragment = document.createDocumentFragment();
            let added = 0;

            for (const item of items) {
                if (added >= remaining) break;
                if (dedupeBy) {
                    const id = dedupeBy(item);
                    if (id == null || seenIds.has(id)) continue;
                    seenIds.add(id);
                }
                fragment.appendChild(buildCard(mapItem(item)));
                added++;
            }

            grid.appendChild(fragment);
            totalItems += added;
            updateCounter();
            return added;
        };

        render(initialItems);

        if (totalItems === 0) {
            showEmptyState(grid);
            loadMoreBtn.classList.add('hidden');
            counter.classList.add('hidden');
            return;
        }

        const showEndMessage = () => {
            const endMsg = document.createElement('p');
            endMsg.className = 'end-of-list';
            endMsg.textContent = 'No hay más elementos para mostrar.';
            loadMoreContainer.appendChild(endMsg);
        };

        loadMoreBtn.addEventListener('click', async () => {
            if (totalItems >= MAX_ITEMS || exhausted) return;

            loadMoreError.innerHTML = '';
            const originalText = loadMoreBtn.textContent;
            loadMoreBtn.textContent = 'Cargando...';
            loadMoreBtn.disabled = true;
            try {
                const items = await fetchPage();
                if (activeRoute !== routeName) return;
                if (items.length === 0) {
                    exhausted = true;
                    updateCounter();
                    return;
                }
                render(items);
            } catch (error) {
                if (error.name === 'AbortError') return;
                showError(loadMoreErrorPrefix + humanizeError(error), loadMoreError);
            } finally {
                if (totalItems >= MAX_ITEMS || exhausted) {
                    loadMoreBtn.classList.add('hidden');
                    showEndMessage();
                } else {
                    loadMoreBtn.textContent = originalText;
                    loadMoreBtn.disabled = false;
                }
            }
        });
    } catch (error) {
        if (error.name === 'AbortError') return;
        if (activeRoute !== routeName) return;
        showError(humanizeError(error), mainContainer, () => routes[routeName]());
    }
}

function fetchCats() {
    const fetchPage = async () => {
        const response = await fetchWithTimeout(
            `https://api.thecatapi.com/v1/images/search?limit=${ITEMS_PER_PAGE}`
        );
        if (!response.ok) throw new Error('Error en la API de gatos');
        return response.json();
    };

    let availableNames = shuffleNames();
    const nextName = () => {
        if (availableNames.length === 0) availableNames = shuffleNames();
        return availableNames.pop();
    };

    return loadGallery({
        routeName: ROUTE.CATS,
        section: {
            titleText: 'Gatitos Tiernos',
            refreshId: 'refresh-cats',
            refreshText: 'Actualizar',
            loadMoreText: 'Cargar más michis'
        },
        fetchPage,
        dedupeBy: cat => cat.id,
        mapItem: cat => {
            const name = nextName();
            return { imgSrc: cat.url, alt: `Gato ${name}`, name };
        },
        loadMoreErrorPrefix: 'Al cargar más michis: '
    });
}

function fetchLuxuryCars() {
    // API key expuesta intencionalmente: la app es estática sin backend.
    // Pixabay permite el uso público de su API en clientes web; si el endpoint
    // se moviera a un proxy, esta key se rotaría y movería a una variable de entorno.
    const apiKey = '55650789-13538bfe7e66d705291a79be6';

    // Elegir página inicial random distinta de la anterior para evitar que dos
    // refreshes consecutivos muestren el mismo set de autos.
    let startPage;
    do {
        startPage = Math.floor(Math.random() * PAGE_RANGE) + 1;
    } while (startPage === lastCarsStartPage && PAGE_RANGE > 1);
    lastCarsStartPage = startPage;
    let currentPage = startPage;

    const fetchPage = async () => {
        const url = `https://pixabay.com/api/?key=${apiKey}&q=ferrari+lamborghini+supercar&image_type=photo&orientation=horizontal&per_page=${ITEMS_PER_PAGE}&page=${currentPage}&safesearch=true`;
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error('Error al conectar con la API de autos');
        const data = await response.json();
        currentPage++;
        return data?.hits ?? [];
    };

    return loadGallery({
        routeName: ROUTE.CARS,
        section: {
            titleText: 'Autos que queremos tener',
            refreshId: 'refresh-cars',
            refreshText: 'Actualizar',
            loadMoreText: 'Cargar más autos'
        },
        fetchPage,
        dedupeBy: car => car.id,
        mapItem: car => {
            const name = car.tags?.split(',')[0]?.trim() || 'Sin nombre';
            return { imgSrc: car.webformatURL, alt: `Auto: ${name}`, name };
        },
        loadMoreErrorPrefix: 'Al cargar más autos: '
    });
}

init();
