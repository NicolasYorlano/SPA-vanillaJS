import { createIcon } from '../lib/icons.js';

// Estado vacío con CTA "Actualizar". onReload se inyecta desde fuera (típicamente
// el router pasa su reloadCurrentRoute) para que este módulo no dependa del router.
export function showEmptyState(grid, {
    message = 'No se encontraron resultados. Probá actualizar para buscar otros.',
    onReload,
} = {}) {
    grid.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const text = document.createElement('p');
    text.textContent = message;

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'btn-primary';
    cta.append(createIcon('refresh'), 'Actualizar');
    if (onReload) cta.addEventListener('click', onReload);

    empty.append(text, cta);
    grid.appendChild(empty);
}
