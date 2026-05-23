# appJS

SPA (Single Page Application) construida con **HTML, CSS y JavaScript vanilla**, sin frameworks ni dependencias en runtime. Consume dos APIs públicas y las renderiza como galerías paginadas con un modal de detalle.

APP EN PRODUCCIÓN: https://catsandcars-js.vercel.app/

## Features

- Routing con **History API** (URLs limpias: `/`, `/cats`, `/cars`) con cancelación de fetches en vuelo al cambiar de ruta (`AbortController`).
- **404 explícito** para cualquier ruta desconocida, preservando la URL inválida en la barra (para que el usuario vea qué path intentó). Requiere SPA fallback del server para que el render lo dispare la app y no el server.
- **Dark mode** con toggle persistente en `localStorage`, respeto inicial a `prefers-color-scheme` y script anti-FOUC para evitar flash en el primer paint.
- Galerías con paginación incremental (botón "cargar más") y deduplicación de resultados por ID.
- **Cache persistente por sesión** (`sessionStorage`): volver a una galería —o recargar con F5 dentro de la misma pestaña— restaura los items previamente cargados, los nombres asignados a cada gato y la página de paginación. El botón **Actualizar** es el **único** opt-in explícito a fetchear contenido nuevo y preserva la posición de scroll. Cerrar la pestaña descarta todo el cache.
- Modal con elemento **`<dialog>` nativo**: focus trap, cierre con `Escape` o click en backdrop, skeleton de imagen mientras carga.
- Fetch con **timeout de 10s** (`AbortSignal.any` componiendo señales de router + timeout) y traducción del `AbortError` a mensaje legible.
- Home con cards CTA que linkean a las galerías.
- Skeleton loaders durante el fetch inicial y mientras carga la imagen del modal.
- Estados de error tipados (network, timeout, JSON inválido) con botón de reintento global y por-acción.
- **Content Security Policy** declarada via `<meta http-equiv>`: limita imágenes a los CDNs de las APIs y `connect-src` a sus endpoints, defensa en profundidad contra XSS si se filtra contenido externo.
- Meta tags para SEO básico (`description`, `theme-color` sincronizado al tema activo, `canonical`).
- Fallback con `<noscript>` para usuarios con JavaScript desactivado.
- Soporte de `prefers-reduced-motion` y `prefers-color-scheme`.
- Cards y nav implementados con elementos nativos (`<button>`, `<a>`) — no `<div role="...">`.
- Sin build step, sin `node_modules`.

## APIs consumidas

- [The Cat API](https://thecatapi.com/) — galería de gatos.
- [Pixabay](https://pixabay.com/api/docs/) — galería de autos.

## Stack

| | |
|---|---|
| Lenguaje | JavaScript (ES modules) |
| Markup | HTML5 |
| Estilos | CSS3 |
| Dependencias | Ninguna |
| Deploy | Vercel |

## Desarrollo local

1. Abrir la carpeta en VS Code (o el workspace que la contenga).
2. Clic derecho sobre `index.html` → **Open with Live Server**.
3. La app queda corriendo en `http://127.0.0.1:5500/<ruta-a-appJS>/`.

El router detecta automáticamente el directorio donde está montada la app (vía `import.meta.url`), por lo que funciona indistintamente si abrís VS Code en `appJS` directamente o en una carpeta padre que la contenga.

> **Nota sobre la notación de rutas en este documento**: las URLs como `/cats` o `/cars` refieren a la ruta lógica del router (relativa al directorio donde vive la app). En la barra del navegador, la URL completa incluye el path donde el server esté sirviendo la app. En Vercel coinciden con la URL real; en Live Server abierto desde un workspace padre, quedan prefijadas (por ejemplo `localhost:5500/TyGW/tp1/appJS/cats`).

### Limitación de Live Server con History API

La app usa History API, lo que implica URLs como `/cats` en lugar de `#cats`. Esto requiere que el servidor haga **SPA fallback**: cualquier ruta desconocida debe responder con `index.html` para que el router del cliente pueda procesarla.

**Live Server (Ritwick Dey) no implementa SPA fallback por defecto.** En la práctica esto significa:

| Acción | Resultado |
|---|---|
| Entrar desde la raíz y navegar haciendo clic en los botones | OK |
| Recargar (F5) estando en una ruta interna válida (`/cats`, `/cars`) | 404 del server (HTML genérico de Live Server) |
| Pegar una URL desconocida en una pestaña nueva | 404 del server — el 404 explícito de la app **no** llega a renderizarse |

Esta limitación **solo afecta al desarrollo local**. En producción (Vercel) el `vercel.json` configura SPA fallback, así que tanto las rutas válidas como las inválidas llegan al `index.html` y el router del cliente decide qué mostrar (galería o página 404 de la app).

Si te molesta durante el desarrollo, dos alternativas opcionales:

- **Five Server** ([extensión `yandeu.five-server`](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server)) — fork moderno de Live Server con SPA fallback. Crear `.fiveserverrc` con `{ "single": true }`.
- **`npx serve -s .`** — el flag `-s` activa modo single-page application. Requiere Node.

## Deploy en producción

El archivo [`vercel.json`](./vercel.json) define un rewrite catch-all que sirve `index.html` para cualquier ruta no resuelta:

```json
{
    "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
    ]
}
```

Vercel evalúa los rewrites **después** de chequear el filesystem, por lo que los assets estáticos (`styles.css`, `scripts.js`, `favicon.png`) se sirven directo sin pasar por la regla. Solo las rutas que no corresponden a archivos reales (`/cats`, `/cars`, etc.) caen en el fallback.

## Estructura

```
appJS/
├── index.html       # Shell HTML; el contenido se inyecta dinámicamente
├── styles.css
├── scripts.js       # Router, fetch, render de cards, modal, dark mode
├── favicon.png
├── vercel.json      # SPA fallback en Vercel
└── README.md
```
