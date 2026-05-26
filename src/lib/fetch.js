import { FETCH_TIMEOUT_MS } from './config.js';

// Compone el signal externo con uno de timeout local via AbortSignal.any.
// Si dispara el timeout, traduce el AbortError a mensaje legible.
// El signal externo se recibe por param (no se importa router) — quien llame
// decide qué cancelar (ej. cats/cars pasan getCurrentController()?.signal).
export async function fetchWithTimeout(url, { signal: externalSignal, timeout = FETCH_TIMEOUT_MS } = {}) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    const signals = [externalSignal, timeoutController.signal].filter(Boolean);
    const signal = AbortSignal.any(signals);
    try {
        return await fetch(url, { signal });
    } catch (error) {
        if (error.name === 'AbortError' && timeoutController.signal.aborted) {
            throw new Error('La conexión tardó demasiado. Probá de nuevo.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
