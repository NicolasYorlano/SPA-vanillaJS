// Toast efímero para confirmaciones livianas (ej. "Galería actualizada"). El
// elemento se autoremueve después de `duration`ms, en sync con la animación
// CSS de salida (.toast → keyframes toastIn + toastOut con delay).
export function showToast(message, duration = 1800) {
    // Dedupe: si el usuario clickea Actualizar dos veces seguidas, no apilamos
    // toasts. El nuevo reemplaza al viejo en su misma posición fija.
    document.querySelector('.toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}
