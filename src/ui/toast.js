// Toast efímero para confirmaciones livianas (ej. "Galería actualizada").
// Estructura de 2 capas:
//   .toast-host → container fixed que define el anclaje en pantalla
//                 (desktop bottom-right / mobile bottom-center vía CSS).
//   .toast     → pill visible con su animación in/out.
// Separar layout (host) de presentación (toast) permite que el anclaje
// responsive viva 100% en CSS sin tocar las keyframes de animación.
export function showToast(message, duration = 1800) {
    // Dedupe: si el usuario clickea Actualizar dos veces seguidas, el nuevo
    // host reemplaza al viejo (no se apilan toasts).
    document.querySelector('.toast-host')?.remove();

    const host = document.createElement('div');
    host.className = 'toast-host';

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    host.appendChild(toast);
    document.body.appendChild(host);

    setTimeout(() => host.remove(), duration);
}
