// Helpers de accesibilidad transversales: no pertenecen a ningún feature.
// announce → screen readers; prefersReducedMotion → respeto de la preferencia
// de movimiento (lo usan theme.js para el toggle y router.js para el scroll).

// Escribe en el live region #sr-announce para que los screen readers lean `msg`.
// Limpia después de 3s para que un siguiente announce del MISMO texto vuelva a
// dispararse (los live regions no re-anuncian si el textContent no cambia).
export function announce(msg) {
    const live = document.querySelector('#sr-announce');
    if (!live) return;
    live.textContent = msg;
    setTimeout(() => { if (live.textContent === msg) live.textContent = ''; }, 3000);
}

// Función (no constante) a propósito: el usuario puede cambiar la preferencia
// del SO en runtime, así que reevaluamos en cada llamada.
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
