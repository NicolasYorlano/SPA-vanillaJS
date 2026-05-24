// Constantes de configuración global de la aplicación.
// Módulos específicos (cats, cars) tienen sus propias constantes locales
// que viven en sus archivos — acá solo lo que es transversal.

// Cap de items por galería. Acotamos por UX (galerías infinitas cansan) y por
// estabilidad (Pixabay tiene rate limit; el Cat API sin API key es lento).
export const MAX_ITEMS = 30;

// Items mostrados por click en "Cargar más". Mismo ritmo en cats y cars.
export const ITEMS_PER_PAGE = 6;

// Timeout por request HTTP, compuesto con AbortSignal.any sobre el signal del router.
export const FETCH_TIMEOUT_MS = 10000;

// Bumpear en CADA cambio de shape de algún cache persistido en sessionStorage.
// Hidratar shape viejo con código nuevo puede crashear o leer datos inválidos —
// un bump invalida limpiamente todos los caches viejos en el próximo F5.
export const CACHE_VERSION = 1;
