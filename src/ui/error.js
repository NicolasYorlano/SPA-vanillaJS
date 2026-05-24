import { mainContainer } from '../lib/dom.js';

// Renderiza un bloque de error en `container` (por defecto, el main).
// Si onRetry está presente, agrega un botón "Reintentar" + un h1 con
// tabindex=-1 que recibe foco para que screen readers anuncien la sección
// y el usuario teclado pueda actuar.
export function showError(message, container = mainContainer, onRetry = null) {
    container.replaceChildren();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-msg';
    errorDiv.setAttribute('role', 'alert');

    // h1 solo en errores full-screen (con retry) para que focusMainHeading lo
    // encuentre y el foco caiga ahí. En errores inline (load-more) no aplica:
    // ya hay un h1 en la galería arriba y duplicarlo rompe la jerarquía.
    if (onRetry) {
        const heading = document.createElement('h1');
        heading.className = 'error-title';
        heading.textContent = 'No se pudo cargar';
        errorDiv.appendChild(heading);
    }

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

    // Anchor de foco para teclado / screen reader. Necesario tanto en el
    // primer error (donde handleRouteChange luego haría focusMainHeading
    // igual — idempotente) como en los retries que vuelven a fallar: ahí el
    // botón clickeado se destruyó y nadie más mueve el foco.
    const heading = errorDiv.querySelector('h1');
    if (heading) {
        heading.tabIndex = -1;
        heading.focus();
    }
}

// fetch() solo tira TypeError ante fallas de red; SyntaxError viene de un JSON inválido.
// El fallback final cubre el caso de que se haya tirado algo que no es un Error
// (un string, null, etc.) — no asumimos que el input tenga .message.
export function humanizeError(error) {
    if (error instanceof TypeError) return 'No se pudo conectar. Revisá tu conexión.';
    if (error instanceof SyntaxError) return 'Respuesta inválida del servidor.';
    return error?.message ?? 'Ocurrió un error desconocido.';
}

export function logError(error) {
    console.error('[App error]', error);
}
