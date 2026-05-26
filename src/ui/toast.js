// Toast efímero. Estructura de 2 capas: .toast-host ancla en pantalla (fixed,
// responsive via CSS), .toast es el pill con animación in/out. Separar layout
// de presentación deja el anclaje responsive 100% en CSS sin tocar keyframes.
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
