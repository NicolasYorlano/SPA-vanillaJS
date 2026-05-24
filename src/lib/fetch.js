import { FETCH_TIMEOUT_MS } from './config.js';

// Compone el AbortSignal externo (típicamente el del router) con uno de
// timeout local. Si dispara el timeout, traduce el AbortError en un Error
// con mensaje legible.
//
// Dependency injection del signal externo: este módulo no sabe del router,
// solo recibe el signal por parámetro. Quien llame decide qué cancelar
// (ej. cats/cars pasan getCurrentController()?.signal).
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
