import { createIcon, ICON_SIZE } from '../lib/icons.js';

// Lightbox con <dialog> nativo. Recibe la colección de la galería + índice
// inicial y navega entre imágenes (flechas / teclado) sin cerrar.
// Integra el botón atrás: abrir pushea un estado de history, así el back (o el
// gesto de atrás en mobile) cierra el modal SIN navegar de página.
export function openCardModal(items, startIndex = 0) {
    const previousOverflow = document.body.style.overflow;
    let index = startIndex;

    const modal = document.createElement('dialog');
    modal.className = 'modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar imagen');
    closeBtn.title = 'Cerrar (Esc)';
    closeBtn.append(createIcon('x', ICON_SIZE.md));

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'modal-nav modal-nav-prev';
    prevBtn.setAttribute('aria-label', 'Imagen anterior');
    prevBtn.append(createIcon('arrow-left', ICON_SIZE.md));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'modal-nav modal-nav-next';
    nextBtn.setAttribute('aria-label', 'Imagen siguiente');
    nextBtn.append(createIcon('arrow-right', ICON_SIZE.md));

    // Se repinta por imagen (showImage) para no arrastrar estado de carga entre navegaciones.
    const media = document.createElement('div');
    media.className = 'modal-media';

    const title = document.createElement('p');
    title.className = 'modal-title';

    const counter = document.createElement('p');
    counter.className = 'modal-counter';
    counter.setAttribute('aria-hidden', 'true'); // el aria-label del dialog ya da la posición

    dialog.append(closeBtn, prevBtn, nextBtn, media, title, counter);
    modal.appendChild(dialog);

    const showImage = (i) => {
        index = i;
        const { imgSrc, alt, name } = items[i];

        const skeleton = document.createElement('div');
        skeleton.className = 'modal-img-skeleton';
        skeleton.setAttribute('role', 'status');
        skeleton.setAttribute('aria-label', 'Cargando imagen');

        const img = document.createElement('img');
        img.className = 'modal-img';
        img.alt = alt;
        img.hidden = true;
        img.addEventListener('load', () => { skeleton.remove(); img.hidden = false; });
        img.addEventListener('error', () => {
            skeleton.remove();
            img.remove();
            const placeholder = document.createElement('div');
            placeholder.className = 'modal-img-error';
            placeholder.append(createIcon('image-off', ICON_SIZE.xl), 'Imagen no disponible');
            media.appendChild(placeholder);
        });

        media.replaceChildren(skeleton, img);
        img.src = imgSrc;

        title.textContent = name;
        counter.textContent = `${i + 1} / ${items.length}`;
        modal.setAttribute('aria-label', `${name} (${i + 1} de ${items.length})`);

        // Capturamos el foco ANTES de ocultar: al setear hidden el browser lo
        // manda a <body>, así que sin esto perderíamos el foco en los extremos.
        const active = document.activeElement;
        prevBtn.hidden = i === 0;
        nextBtn.hidden = i === items.length - 1;
        if (active && active.hidden) closeBtn.focus();
    };

    const showPrev = () => { if (index > 0) showImage(index - 1); };
    const showNext = () => { if (index < items.length - 1) showImage(index + 1); };

    // Si el cierre ya vino de un back, el estado se popeó solo: no rellamar history.back().
    let cameFromPopstate = false;

    const close = () => {
        if (modal.classList.contains('modal-closing')) return;
        modal.classList.add('modal-closing');
        if (!cameFromPopstate) history.back();

        let done = false;
        const cleanup = () => {
            if (done) return;
            done = true;
            modal.close();
            modal.remove();
            window.removeEventListener('routechange', closeOnNav);
            window.removeEventListener('popstate', onPopState);
            document.body.style.overflow = previousOverflow;
        };
        // animationend = normal; setTimeout = red de seguridad si la animación no dispara.
        modal.addEventListener('animationend', cleanup, { once: true });
        setTimeout(cleanup, 400);
    };

    const onPopState = () => { cameFromPopstate = true; close(); };
    const closeOnNav = () => close();

    // El <dialog> dispara 'cancel' con Escape; lo interceptamos para animar el cierre.
    modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') showPrev();
        else if (e.key === 'ArrowRight') showNext();
    });

    window.addEventListener('routechange', closeOnNav);
    window.addEventListener('popstate', onPopState);
    history.pushState({ modal: true }, '');   // entry que el back consume para cerrar

    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
    showImage(index);   // setea aria-label/media ANTES de abrir, para el screen reader
    modal.showModal();
}
