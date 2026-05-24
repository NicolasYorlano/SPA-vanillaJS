import { ITEMS_PER_PAGE, CACHE_VERSION } from '../lib/config.js';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '../lib/storage.js';
import { fetchWithTimeout } from '../lib/fetch.js';
import { ROUTE, getCurrentController } from '../lib/router.js';
import { loadGallery } from '../ui/gallery.js';

// Rango de páginas para el random inicial en la API de autos.
const PAGE_RANGE = 10;

const CARS_STARTPAGE_KEY = 'cars-startPage';
const CARS_CACHE_KEY = 'cars:cache';

// Cache de items paginados + próxima página. Misma estrategia de persistencia
// que catsCache. CARS_STARTPAGE_KEY vive aparte porque se rota explícitamente
// al hacer Actualizar (mientras este cache se borra entero).
let carsCache = null; // { items: Array<{id, ...}>, nextPage: number }

function saveCarsCache() {
    if (!carsCache) { safeSessionRemove(CARS_CACHE_KEY); return; }
    safeSessionSet(CARS_CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, data: carsCache }));
}

function loadCarsCache() {
    const raw = safeSessionGet(CARS_CACHE_KEY);
    if (!raw) return null;
    try {
        const wrapped = JSON.parse(raw);
        if (wrapped?.v !== CACHE_VERSION) {
            safeSessionRemove(CARS_CACHE_KEY);
            return null;
        }
        const parsed = wrapped.data;
        if (!Array.isArray(parsed?.items) || !Number.isInteger(parsed?.nextPage)) return null;
        return { items: parsed.items, nextPage: parsed.nextPage };
    } catch {
        safeSessionRemove(CARS_CACHE_KEY);
        return null;
    }
}

// Llamada por main.js al bootstrap para hidratar desde sessionStorage.
export function hydrateCarsCache() {
    carsCache = loadCarsCache();
}

function readOrCreateCarsStartPage() {
    const stored = safeSessionGet(CARS_STARTPAGE_KEY);
    const num = stored ? parseInt(stored, 10) : NaN;
    if (Number.isInteger(num) && num >= 1 && num <= PAGE_RANGE) return num;
    const initial = Math.floor(Math.random() * PAGE_RANGE) + 1;
    safeSessionSet(CARS_STARTPAGE_KEY, String(initial));
    return initial;
}

function rotateCarsStartPage() {
    const prev = readOrCreateCarsStartPage();
    let next = Math.floor(Math.random() * PAGE_RANGE) + 1;
    if (next === prev && PAGE_RANGE > 1) next = (prev % PAGE_RANGE) + 1;
    safeSessionSet(CARS_STARTPAGE_KEY, String(next));
    return next;
}

export function fetchLuxuryCars({ reload } = {}) {
    if (reload) {
        rotateCarsStartPage();
        carsCache = null;
        saveCarsCache();
    }

    // API key expuesta intencionalmente: app estática sin backend. Pixabay permite uso público desde cliente.
    const apiKey = '55650789-13538bfe7e66d705291a79be6';

    // currentPage es la ÚNICA fuente de la posición de paginado. Si hay cache,
    // arranca donde quedó; si no, en una página random de la sesión.
    let currentPage = carsCache?.nextPage ?? readOrCreateCarsStartPage();

    return loadGallery({
        routeName: ROUTE.CARS,
        section: {
            titleText: 'Autos que queremos tener',
            refreshText: 'Actualizar',
            loadMoreText: 'Cargar más'
        },
        getCachedItems: () => carsCache?.items ?? null,
        fetchPage: async () => {
            const url = `https://pixabay.com/api/?key=${apiKey}&q=ferrari+lamborghini+supercar&image_type=photo&orientation=horizontal&per_page=${ITEMS_PER_PAGE}&page=${currentPage}&safesearch=true`;
            const response = await fetchWithTimeout(url, { signal: getCurrentController()?.signal });
            if (!response.ok) throw new Error('Error al conectar con la API de autos');
            const data = await response.json();
            currentPage++;
            return data?.hits ?? [];
        },
        dedupeBy: car => car.id,
        mapItem: car => {
            const name = car.tags?.split(',')[0]?.trim() || 'Sin nombre';
            return { imgSrc: car.webformatURL, alt: `Auto: ${name}`, name };
        },
        // nextPage se deriva de currentPage al persistir — sin doble contabilidad.
        onBatchRendered: (items) => {
            carsCache = { items: [...items], nextPage: currentPage };
            saveCarsCache();
        },
        loadMoreErrorPrefix: 'Al cargar más autos: '
    });
}
