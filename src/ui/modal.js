import { createIcon } from '../lib/icons.js';

// Modal de detalle de imagen. Usa <dialog> nativo: focus trap, Escape para
// cerrar, click en backdrop para cerrar. Animaciones de entrada/salida via CSS.
// El cierre escucha el evento `routechange` del window (lo dispara el router
// al cambiar de ruta) para auto-cerrarse si el usuario navega con el modal
// abierto — así no queda flotando sobre una vista que no le corresponde.
export function openCardModal({ imgSrc, alt, name }) {
    const previousOverflow = document.body.style.overflow;

    const modal = document.createElement('dialog');
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-label', name);

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar imagen');
    closeBtn.title = 'Cerrar (Esc)';
    closeBtn.append(createIcon('x', 20));

    const skeleton = document.createElement('div');
    skeleton.className = 'modal-img-skeleton';
    skeleton.setAttribute('role', 'status');
    skeleton.setAttribute('aria-label', 'Cargando imagen');

    const img = document.createElement('img');
    img.className = 'modal-img';
    img.alt = alt;
    img.hidden = true;

    const title = document.createElement('p');
    title.className = 'modal-title';
    title.textContent = name;

    dialog.appendChild(closeBtn);
    dialog.appendChild(skeleton);
    dialog.appendChild(img);
    dialog.appendChild(title);
    modal.appendChild(dialog);

    img.addEventListener('load', () => {
        skeleton.remove();
        img.hidden = false;
    });
    img.addEventListener('error', () => {
        skeleton.remove();
        img.remove();
        const placeholder = document.createElement('div');
        placeholder.className = 'modal-img-error';
        placeholder.append(createIcon('image-off', 32), 'Imagen no disponible');
        dialog.insertBefore(placeholder, title);
    });
    img.src = imgSrc;

    const close = () => {
        // Guard idempotente: previene listeners duplicados si Esc y routechange disparan close en simultáneo.
        if (modal.classList.contains('modal-closing')) return;
        modal.classList.add('modal-closing');

        // `done` hace al cleanup idempotente: lo disparan animationend Y el
        // setTimeout de respaldo, pero solo el primero ejecuta.
        let done = false;
        const cleanup = () => {
            if (done) return;
            done = true;
            modal.close();
            modal.remove();
            window.removeEventListener('routechange', closeOnNav);
            document.body.style.overflow = previousOverflow;
        };
        // animationend = camino normal. setTimeout = red de seguridad: si la
        // animación CSS .modal-closing no dispara (regla removida/renombrada),
        // el modal quedaría abierto con el scroll del body bloqueado para
        // siempre. El fallback (animación dura 0.2s) garantiza el cleanup.
        modal.addEventListener('animationend', cleanup, { once: true });
        setTimeout(cleanup, 400);
    };

    const closeOnNav = () => close();

    // El <dialog> nativo dispara 'cancel' al apretar Escape; lo interceptamos
    // para correr nuestra animación de cierre en lugar del cierre instantáneo.
    modal.addEventListener('cancel', (e) => {
        e.preventDefault();
        close();
    });

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    window.addEventListener('routechange', closeOnNav);

    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
    modal.showModal();
}
