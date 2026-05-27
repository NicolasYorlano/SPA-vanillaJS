import { ITEMS_PER_PAGE, CACHE_VERSION } from '../lib/config.js';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '../lib/storage.js';
import { fetchWithTimeout } from '../lib/fetch.js';
import { ROUTE, getCurrentController } from '../lib/router.js';
import { loadGallery } from '../ui/gallery.js';

// El Cat API, sin API key, ignora `limit` y devuelve 10 por llamada. Pero al
// usuario le mostramos ITEMS_PER_PAGE (6) por click para que cats y cars
// tengan la misma rítmica de paginado: fetchCats bufferea los 4 sobrantes y
// los sirve en el próximo click sin pegarle a la API.
const CATS_API_BATCH = 10;

const CATS_CACHE_KEY = 'cats:cache';

// Cache de items + nombres asignados. Persistido en sessionStorage para que
// sobreviva F5 — el contrato es que "Actualizar" es el ÚNICO opt-in explícito
// a contenido nuevo. Se hidrata en hydrateCatsCache() (llamada por main) y se
// borra cuando el router llama a fetchCats con { reload: true }.
let catsCache = null; // { items: Array<{id, url, ...}>, names: Map<catId, name> }

// Map no es JSON-serializable nativo: lo guardamos como array de entries.
// Envoltura { v, data }: ver comment del CACHE_VERSION.
function saveCatsCache() {
    if (!catsCache) { safeSessionRemove(CATS_CACHE_KEY); return; }
    safeSessionSet(CATS_CACHE_KEY, JSON.stringify({
        v: CACHE_VERSION,
        data: {
            items: catsCache.items,
            names: Array.from(catsCache.names.entries()),
        },
    }));
}

function loadCatsCache() {
    const raw = safeSessionGet(CATS_CACHE_KEY);
    if (!raw) return null;
    try {
        const wrapped = JSON.parse(raw);
        if (wrapped?.v !== CACHE_VERSION) {
            // Shape de otra versión del código (deploy reciente que bumpeó
            // CACHE_VERSION). Lo descartamos en lugar de hidratar algo inválido.
            safeSessionRemove(CATS_CACHE_KEY);
            return null;
        }
        const parsed = wrapped.data;
        if (!Array.isArray(parsed?.items)) return null;
        return {
            items: parsed.items,
            names: new Map(Array.isArray(parsed.names) ? parsed.names : []),
        };
    } catch {
        // JSON corrupto (raro pero posible si alguien tocó el storage a mano):
        // lo limpiamos para arrancar desde cero en lugar de tirar todo abajo.
        safeSessionRemove(CATS_CACHE_KEY);
        return null;
    }
}

// Llamada por main.js al bootstrap para hidratar desde sessionStorage.
export function hydrateCatsCache() {
    catsCache = loadCatsCache();
}

// 30 nombres = MAX_ITEMS. Si MAX_ITEMS sube, agregar nombres acá para que el
// pool alcance — sino se cae al reshuffle de nextName y aparecen duplicados.
const catNames = [
    "Pelusa", "Simba", "Luna", "Garfield", "Salem",
    "Michi", "Oliver", "Tom", "Milo", "Ágatha",
    "Félix", "Nala", "Figaro", "Bigotes", "Mantequilla",
    "Caspian", "Ramsés", "Copito", "Pantufla", "Doraemon", "Silvestre",
    "Mittens", "Bastian", "Lulú", "Chispita", "Romeo", "Duquesa",
    "Gandalf", "Minerva", "Aquiles"
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

export function fetchCats({ reload } = {}) {
    if (reload) {
        catsCache = null;
        saveCatsCache(); // saveX con cache=null hace remove
    }

    // names sobrevive entre visitas: el mismo cat.id conserva su nombre. Si hay
    // cache lo arrancamos del Map persistido; si no, de uno vacío.
    const names = catsCache?.names ?? new Map();
    // Excluimos del pool los nombres ya asignados en visitas previas para no duplicar.
    const usedNames = new Set(names.values());
    let availableNames = shuffleNames().filter(n => !usedNames.has(n));

    // Devuelve el nombre de un catId; le asigna uno del pool si es la primera vez.
    const nextName = (catId) => {
        if (names.has(catId)) return names.get(catId);
        if (availableNames.length === 0) availableNames = shuffleNames();
        const name = availableNames.pop();
        names.set(catId, name);
        return name;
    };

    // Buffer local para los 4 sobrantes de cada batch (ver comment de
    // CATS_API_BATCH). No se persiste: F5 puede gastar una llamada extra, aceptable.
    let buffer = [];

    return loadGallery({
        routeName: ROUTE.CATS,
        section: {
            titleText: 'Gatos tiernos',
            refreshText: 'Ver otros gatos',
            loadMoreText: 'Cargar más gatos'
        },
        itemNoun: 'gatos',
        getCachedItems: () => catsCache?.items ?? null,
        fetchPage: async () => {
            if (buffer.length < ITEMS_PER_PAGE) {
                const response = await fetchWithTimeout(
                    `https://api.thecatapi.com/v1/images/search?limit=${CATS_API_BATCH}`,
                    { signal: getCurrentController()?.signal }
                );
                if (!response.ok) throw new Error('Error en la API de gatos');
                const batch = await response.json();
                buffer.push(...batch);
            }
            return buffer.splice(0, ITEMS_PER_PAGE);
        },
        dedupeBy: cat => cat.id,
        mapItem: cat => {
            const name = nextName(cat.id);
            return { imgSrc: cat.url, alt: `Gato ${name}`, name };
        },
        // Persiste el set canónico que armó loadGallery: items y names quedan
        // con exactamente los mismos ids — sin crudos ni duplicados.
        onBatchRendered: (items) => {
            catsCache = { items: [...items], names };
            saveCatsCache();
        },
        loadMoreErrorPrefix: 'Al cargar más michis: '
    });
}
