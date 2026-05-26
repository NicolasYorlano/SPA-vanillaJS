import { mainContainer } from '../lib/dom.js';
import { ROUTE, pathFor, navigate } from '../lib/router.js';
import { createIcon } from '../lib/icons.js';

export function renderNotFound() {
    mainContainer.replaceChildren();

    // Layout editorial estilo Vercel: "404" a la izquierda, divisor vertical, contenido a la derecha.
    const wrap = document.createElement('section');
    wrap.className = 'not-found';

    // "404" como acento numérico, no como hero. aria-hidden porque el h1
    // abajo comunica el estado al screen reader.
    const code = document.createElement('p');
    code.className = 'not-found-code';
    code.textContent = '404';
    code.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'not-found-body';

    const title = document.createElement('h1');
    title.className = 'not-found-title';
    title.textContent = 'Esta página no existe.';

    const text = document.createElement('p');
    text.className = 'not-found-text';
    text.textContent = 'Revisá la URL o volvé al inicio.';

    const homeLink = document.createElement('a');
    homeLink.href = pathFor(ROUTE.HOME);
    homeLink.className = 'btn-primary not-found-cta';
    homeLink.append(createIcon('arrow-left'), 'Volver al inicio');
    homeLink.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(ROUTE.HOME);
    });

    body.append(title, text, homeLink);
    wrap.append(code, body);
    mainContainer.append(wrap);
}
