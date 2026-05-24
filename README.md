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

Requiere [Node.js](https://nodejs.org/) instalado (cualquier versión LTS reciente).

```bash
npm run dev
```

Eso arranca un static server con SPA fallback en `http://localhost:3000` sirviendo desde `src/`. `npm run dev` usa `npx -y serve --single src` — no hace falta `npm install`; la primera vez baja `serve` al cache global de npm y queda disponible.

> ¿Por qué no Live Server? Live Server no implementa SPA fallback, así que un F5 en `/cats` o `/cars/pepe` rompe localmente. `serve --single` replica el comportamiento de Vercel en producción.

## Deploy en producción

[`vercel.json`](./vercel.json) configura dos cosas:

```json
{
    "outputDirectory": "src",
    "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
    ]
}
```

- `outputDirectory: "src"` le dice a Vercel que el sitio servido es la carpeta `src/`, no el root del repo (donde viven `package.json`, `README.md`, etc).
- `rewrites` es el catch-all que sirve `index.html` para cualquier ruta no resuelta. Vercel evalúa rewrites **después** de chequear el filesystem, así que los assets estáticos (`/styles.css`, `/scripts.js`, `/assets/*`) se sirven directo. Solo las rutas que no corresponden a archivos reales (`/cats`, `/cars/pepe`, etc.) caen en el fallback y el router del cliente decide qué renderizar.

## Estructura

```
appJS/
├── src/                       # Todo el sitio servido
│   ├── index.html             # Shell HTML; el contenido se inyecta dinámicamente
│   ├── styles.css
│   ├── scripts.js             # Router, fetch, render, modal, dark mode
│   └── assets/                # PNGs públicos (favicon, apple-touch, og-image)
├── package.json               # Script npm run dev (no hay deps en runtime)
├── vercel.json                # outputDirectory + SPA fallback
├── README.md
└── .gitignore
```
