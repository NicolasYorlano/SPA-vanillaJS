import { MAX_ITEMS, ITEMS_PER_PAGE } from '../lib/config.js';
import { createIcon } from '../lib/icons.js';
import { mainContainer } from '../lib/dom.js';
import { getActiveRoute, reloadCurrentRoute, runRoute } from '../lib/router.js';
import { showSkeleton } from './skeleton.js';
import { showError, humanizeError, logError } from './error.js';
import { showEmptyState } from './empty.js';
import { createCard } from './card.js';

// Crea el shell vacío de una galería. Devuelve refs a los nodos que loadGallery va a poblar.
export function createGallerySection({ titleText, refreshText, loadMoreText }) {
    mainContainer.replaceChildren();

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
    refreshBtn.className = 'btn-secondary';
    refreshBtn.append(createIcon('refresh'), refreshText);
    // reloadCurrentRoute reemplaza todo el contenido por el skeleton de forma
    // síncrona, así que no hace falta deshabilitar el botón ni cambiar su
    // texto: deja de existir antes de que el browser pinte un segundo click.
    refreshBtn.addEventListener('click', reloadCurrentRoute);

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

// Orquesta una galería: skeleton → fetch → render → paginación → manejo de errores.
// Cada ruta inyecta su estrategia, con responsabilidades separadas:
//   getCachedItems()       → estado restaurable (sync, lee cache) o null
//   fetchPage()            → trae la próxima página de la API (pura, sin side-effects)
//   onBatchRendered(items) → persiste el set canónico ya renderizado
//   mapItem / dedupeBy     → transformación y deduplicación de cada item
export async function loadGallery({
    routeName,
    section,
    getCachedItems,
    fetchPage,
    dedupeBy,
    mapItem,
    loadMoreErrorPrefix,
    onBatchRendered,
    skeletonCount = ITEMS_PER_PAGE,
    itemNoun = 'resultados'
}) {
    // Cache hit → restauramos sin skeleton ni fetch (es síncrono, sin flash).
    // Cache miss → skeleton (tantos placeholders como ítems traerá el primer
    // batch, así no hay salto de layout cuando llegan las cards).
    const cached = getCachedItems?.() ?? null;
    if (!cached) showSkeleton(skeletonCount);
    try {
        const initialItems = cached ?? await fetchPage();
        if (getActiveRoute() !== routeName) return;

        const { grid, loadMoreBtn, loadMoreContainer, counter, loadMoreError } = createGallerySection(section);

        const seenIds = new Set();
        const renderedItems = []; // set canónico (deduplicado + capeado) que se persiste
        let totalItems = 0;
        let exhausted = false;

        const updateCounter = () => {
            counter.classList.add('is-updating');
            // Tres estados del contador:
            // - Galería completa (cap alcanzado): la API tiene más pero
            //   nosotros frenamos en MAX_ITEMS — anunciamos completitud.
            // - Agotada antes del cap: la API se quedó sin items.
            // - Paginación abierta: contador clásico "X de Y".
            if (totalItems >= MAX_ITEMS) {
                counter.textContent = `Galería completa · ${MAX_ITEMS} ${itemNoun}`;
            } else if (exhausted) {
                counter.textContent = `Mostrando ${totalItems} ${itemNoun}`;
            } else {
                counter.textContent = `Mostrando ${totalItems} de ${MAX_ITEMS} ${itemNoun}`;
            }
            // Hold 200ms < transition 0.3s: la opacidad nunca toca fondo
            // (0.65), apenas se asoma a ~0.78 antes de revertir. Resultado:
            // respiración sutil, no flicker.
            setTimeout(() => counter.classList.remove('is-updating'), 200);
        };

        // `cap` opcional: máximo de items a renderizar de este batch puntual.
        // Útil cuando el click handler hace retry y ya rendereó parte del target
        // — sin cap, un segundo fetch con 6 items únicos haría saltar el contador
        // de "5 agregados" a "11 agregados" en un solo click. Default Infinity
        // = comportamiento original (cap solo por MAX_ITEMS global).
        const render = (items, cap = Infinity) => {
            const remaining = Math.min(cap, MAX_ITEMS - totalItems);
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
                renderedItems.push(item);
                fragment.appendChild(createCard(mapItem(item)));
                added++;
            }

            grid.appendChild(fragment);
            totalItems += added;
            updateCounter();
            return added;
        };

        const showEndMessage = () => {
            const endMsg = document.createElement('p');
            endMsg.className = 'end-of-list';
            endMsg.textContent = 'No hay más elementos para mostrar.';
            loadMoreContainer.appendChild(endMsg);
        };

        const initialAdded = render(initialItems);
        // Persistimos solo si fue un fetch fresco que trajo items. Si vino del
        // cache (restore), reescribir storage con datos idénticos no tiene porqué.
        if (!cached && initialAdded > 0) onBatchRendered?.(renderedItems);

        if (totalItems === 0) {
            showEmptyState(grid, { onReload: reloadCurrentRoute });
            loadMoreBtn.classList.add('hidden');
            counter.classList.add('hidden');
            return;
        }

        // Cuando el cache restaura ≥ MAX_ITEMS, no necesitamos botón de "Cargar más".
        if (totalItems >= MAX_ITEMS) {
            loadMoreBtn.classList.add('hidden');
            showEndMessage();
            return;
        }

        loadMoreBtn.addEventListener('click', async () => {
            if (totalItems >= MAX_ITEMS || exhausted) return;
            // Guard contra re-entry: pointer-events:none del CSS solo cubre clicks
            // del cursor. Clicks programáticos (tooling de accesibilidad, voice
            // control, extensiones) ignoran el CSS y disparan el handler en paralelo.
            if (loadMoreBtn.classList.contains('is-loading')) return;

            loadMoreError.replaceChildren();
            const originalText = loadMoreBtn.textContent;
            loadMoreBtn.textContent = 'Cargando...';
            // is-loading (no disabled) — el componente sigue al 100% de opacidad
            // y muestra spinner CSS. pointer-events: none lo hace inerte sin
            // disfrazarlo de inactivo.
            loadMoreBtn.classList.add('is-loading');
            try {
                // Garantía: el click suma exactamente `target` cards o agota.
                // Si la API devuelve duplicados (TheCatAPI random sin key NO
                // garantiza unicidad entre llamadas), reintentamos hasta
                // MAX_RETRIES — el flujo viejo mostraba <6 cards en esos casos
                // y la cantidad de clicks para llenar la galería se volvía
                // impredecible. `cap = target - batchAdded` evita que un retry
                // con muchos únicos haga saltar el contador más allá del target.
                const target = Math.min(ITEMS_PER_PAGE, MAX_ITEMS - totalItems);
                const MAX_RETRIES = 3;
                let batchAdded = 0;
                let attempt = 0;

                while (batchAdded < target && attempt < MAX_RETRIES) {
                    attempt++;
                    const items = await fetchPage();
                    if (getActiveRoute() !== routeName) return;
                    if (items.length === 0) {
                        // API explícitamente agotada (no son duplicados, no hay items).
                        exhausted = true;
                        break;
                    }
                    const added = render(items, target - batchAdded);
                    batchAdded += added;
                    if (added === 0) {
                        // El lote completo eran duplicados de lo ya renderizado:
                        // probable signal de que la API no tiene más contenido
                        // nuevo en su pool aleatorio. Cortamos antes de quemar
                        // más quota/buffer.
                        exhausted = true;
                        break;
                    }
                }

                if (batchAdded > 0) onBatchRendered?.(renderedItems);
            } catch (error) {
                if (error.name === 'AbortError') return;
                logError(error);
                showError(loadMoreErrorPrefix + humanizeError(error), loadMoreError);
            } finally {
                if (totalItems >= MAX_ITEMS || exhausted) {
                    loadMoreBtn.classList.add('hidden');
                    showEndMessage();
                } else {
                    loadMoreBtn.textContent = originalText;
                    loadMoreBtn.classList.remove('is-loading');
                }
            }
        });
    } catch (error) {
        if (error.name === 'AbortError') return;
        if (getActiveRoute() !== routeName) return;
        logError(error);
        showError(humanizeError(error), mainContainer, () => runRoute(routeName));
    }
}
