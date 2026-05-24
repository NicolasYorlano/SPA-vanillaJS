// Acceso defensivo a Web Storage.
//
// localStorage/sessionStorage pueden tirar SecurityError en Firefox con
// cookies bloqueadas o en iframes sandbox, y QuotaExceededError al escribir.
// Estos wrappers son la ÚNICA vía de acceso a Web Storage en la app: si
// alguno falla, degradamos en silencio (get → null, set/remove → no-op)
// sin romper nada.

export function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
export function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage bloqueado o quota */ }
}

export function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
}
export function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* storage bloqueado o quota */ }
}
export function safeSessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
