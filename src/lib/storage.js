// Wrappers defensivos de Web Storage. Firefox con cookies bloqueadas o iframes
// sandbox tiran SecurityError; setItem también puede tirar QuotaExceededError.
// Ante error degradan en silencio: get → null, set/remove → no-op.

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
