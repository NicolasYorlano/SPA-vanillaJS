import { mainContainer } from '../lib/dom.js';
import { ROUTE, pathFor, navigate } from '../lib/router.js';
import { createIcon } from '../lib/icons.js';

export function renderNotFound() {
    mainContainer.replaceChildren();

    // Código grande arriba del h1 — convención SPA (GitHub, Linear, Vercel).
    // aria-hidden porque el h1 "Página no encontrada" ya comunica el estado
    // al screen reader; leer "cuatrocientos cuatro" es ruido redundante.
    const code = document.createElement('p');
    code.className = 'not-found-code';
    code.textContent = '404';
    code.setAttribute('aria-hidden', 'true');

    const title = document.createElement('h1');
    title.className = 'content-title';
    title.textContent = 'Página no encontrada';

    const message = document.createElement('p');
    message.className = 'not-found-message';
    message.textContent = 'La página que buscás no existe o fue movida.';

    const homeLink = document.createElement('a');
    homeLink.href = pathFor(ROUTE.HOME);
    homeLink.className = 'btn-primary not-found-home';
    homeLink.append(createIcon('arrow-left'), 'Volver al inicio');
    homeLink.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(ROUTE.HOME);
    });

    mainContainer.append(title, message, homeLink);
}
