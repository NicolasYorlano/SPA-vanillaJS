import { createIcon } from '../lib/icons.js';
import { openCardModal } from './modal.js';

export function createCard({ imgSrc, alt, name }) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.setAttribute('aria-label', `Ver imagen de ${name} en grande`);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';

    const img = document.createElement('img');
    img.alt = alt;
    img.loading = 'lazy';
    // Listeners ANTES de setear src: en cache HIT algunos navegadores pueden
    // disparar load en un microtask temprano y perdemos el evento si llegamos tarde.
    img.addEventListener('load', () => {
        img.classList.add('card-img-loaded');
        imgContainer.classList.add('img-loaded');
    });
    img.addEventListener('error', () => {
        img.remove();
        imgContainer.classList.add('img-loaded');
        const placeholder = document.createElement('div');
        placeholder.className = 'img-error';
        // Ícono + label: el SVG comunica "imagen rota" antes de leer el texto,
        // útil para usuarios que escanean rápido. flex column del CSS apila.
        placeholder.append(createIcon('image-off', 24), 'Imagen no disponible');
        imgContainer.appendChild(placeholder);
    });
    img.src = imgSrc;

    const nameEl = document.createElement('span');
    nameEl.className = 'card-name';
    nameEl.textContent = name;

    imgContainer.appendChild(img);
    card.appendChild(imgContainer);
    card.appendChild(nameEl);

    card.addEventListener('click', () => openCardModal({ imgSrc, alt, name }));

    return card;
}
