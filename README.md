# appJS

SPA (Single Page Application) construida con **HTML, CSS y JavaScript vanilla**, sin frameworks ni dependencias en runtime. Consume dos APIs públicas y las renderiza como galerías paginadas con un modal de detalle.

APP EN PRODUCCIÓN: https://catsandcars-js.vercel.app/

## Features

- Routing con **History API** (URLs limpias: `/`, `/cats`, `/cars`) con cancelación de fetches en vuelo al cambiar de ruta (`AbortController`).
- **404 dedicada** con diseño editorial: layout horizontal con "404" como acento numérico, divisor vertical y contenido a la derecha. Preserva la URL inválida en la barra para que el usuario vea qué path intentó. Requiere SPA fallback del server para que el render lo dispare la app y no el server.
- **Dark mode** con toggle persistente en `localStorage`, respeto inicial a `prefers-color-scheme` y script anti-FOUC inline para evitar flash en el primer paint.
- Galerías con paginación incremental (botón "Cargar más") y deduplicación de resultados por ID. **Garantía de N cards por click incluso ante APIs sin unicidad entre llamadas**: cuando un lote trae duplicados, el render reintenta hasta `MAX_RETRIES` con cap por target — la cantidad de clicks para llenar la galería queda predecible.
- **Cache persistente por sesión** (`sessionStorage`): volver a una galería —o recargar con F5 dentro de la misma pestaña— restaura los items previamente cargados, los nombres asignados a cada gato y la página de paginación. El botón **Actualizar** es el **único** opt-in explícito a fetchear contenido nuevo y preserva la posición de scroll. Cerrar la pestaña descarta todo el cache. El cache está versionado (`{ v, data }`) — un bump de `CACHE_VERSION` invalida limpiamente los caches viejos en el próximo F5.
- Modal con elemento **`<dialog>` nativo**: focus trap, cierre con `Escape` o click en backdrop, skeleton de imagen mientras carga, auto-cierre al navegar a otra ruta.
- Fetch con **timeout de 10s** (`AbortSignal.any` componiendo señales de router + timeout) y traducción del `AbortError` a mensaje legible.
- Estados de error tipados (network, timeout, JSON inválido) con botón de reintento global y por-acción (reintento de "Cargar más" sin perder el progreso de la galería). Loading state real con spinner CSS (`.is-loading`) — el botón mantiene 100% de opacidad y comunica progreso, distinto de un `disabled` inerte que se ve igual que un botón muerto.
- **Iconografía SVG inline** estilo Lucide (24×24 viewBox, stroke-width 2, `currentColor`) — heredan el color del contenedor, sin requests adicionales.
- **Content Security Policy** declarada via `<meta http-equiv>`: restringe `script-src` y `style-src` a `'self' 'unsafe-inline'` (`unsafe-inline` es necesario por el script anti-FOUC y el `<style>` del `<noscript>`), `connect-src` a los endpoints de las APIs, y `img-src` a HTTPS arbitrario (necesario porque TheCatAPI sirve imágenes desde CDNs externos rotativos: tumblr, flickr, imgur, etc.). Defensa en profundidad contra XSS si se filtra contenido externo.
- **Meta tags Open Graph** + `apple-touch-icon` + `twitter:card`: preview card profesional al compartir el link en redes (1200×630 @ 2x retina, diseño editorial).
- Fallback con `<noscript>` para usuarios con JavaScript desactivado.
- Soporte de `prefers-reduced-motion` y `prefers-color-scheme`.
- Cards, nav y botones implementados con elementos nativos (`<button>`, `<a>`) — no `<div role="...">`.
- Sin build step, sin `node_modules` local. La única dependencia es `serve` (resuelta vía `npx` para el dev server, no para la app).

## Arquitectura

El código está modularizado por dominio en ES modules nativos del browser (sin bundler). El grafo de dependencias es acíclico, las capas inferiores no conocen a las superiores y la inyección de dependencias evita acoplamientos rígidos.

```
main.js (entry: ensambla todo y arranca init)
   │
   ├── views/                ← rutas concretas
   │   ├── home.js
   │   ├── notFound.js
   │   ├── cats.js           (cache de gatos + asignación de nombres)
   │   └── cars.js           (cache de autos + rotación de página inicial)
   │
   ├── ui/                   ← componentes visuales sin lógica de dominio
   │   ├── card.js
   │   ├── modal.js
   │   ├── gallery.js        (createGallerySection + loadGallery genérico
   │   │                      con strategy injection: cats y cars le pasan
   │   │                      sus implementaciones de fetch/cache/dedupe)
   │   ├── skeleton.js
   │   ├── empty.js
   │   ├── error.js
   │   └── toast.js
   │
   └── lib/                  ← infraestructura reusable
       ├── router.js         (History API; recibe routes table y basePath
       │                      via initRouter — no conoce a las views)
       ├── fetch.js          (fetchWithTimeout con signal externo por DI)
       ├── storage.js        (safe* wrappers defensivos)
       ├── theme.js
       ├── icons.js
       ├── dom.js            (refs DOM compartidas)
       └── config.js         (MAX_ITEMS, ITEMS_PER_PAGE, CACHE_VERSION, etc)
```

**Decisiones clave**:

- **`basePath` calculado en `main.js`**: usa `new URL('.', import.meta.url).pathname` desde el entry point, no desde `lib/router.js` (que apuntaría a `/lib/` y daría un base incorrecto).
- **`fetchWithTimeout` recibe el `signal` por parámetro**: no importa al router. Las views le pasan `getCurrentController()?.signal` — el módulo de fetch queda como utilitario puro.
- **Router no conoce caches**: `reloadCurrentRoute()` invoca al handler con `{ reload: true }`. Cada view (cats, cars) limpia su propio cache al ver esa señal. Inversion of control.
- **`routes` table ensamblada en `main.js`**: el router recibe el map vía `initRouter({ routes, basePath })`. Las views dependen del router; el router NO depende de las views — sin ciclo.
- **Sistema de tokens semánticos en `:root`**: 70+ variables CSS (color, spacing, shadows, typography, tracking, transitions, animation durations, icon sizes). El dark theme solo overridea las variables relevantes — los componentes nunca tocan valores literales. Cambiar el color primario o la tipografía base es modificar un solo lugar. `ICON_SIZE` en JS (`lib/icons.js`) espeja `--icon-*` del CSS para que los `<svg>` que se crean por JS usen la misma escala.

## APIs consumidas

- [The Cat API](https://thecatapi.com/) — galería de gatos. Sin API key (modo público); buffer interno para reconciliar el batch fijo de la API (10) con el page size de la UI (6).
- [Pixabay](https://pixabay.com/api/docs/) — galería de autos. API key pública expuesta intencionalmente (app estática sin backend).

## Stack

| | |
|---|---|
| Lenguaje | JavaScript (ES modules) |
| Markup | HTML5 |
| Estilos | CSS3 con tokens (`:root` custom properties) |
| Dependencias en runtime | Ninguna |
| Dependencias en dev | `serve` (resuelta por `npx`, no instalada localmente) |
| Deploy | Vercel |

## Desarrollo local

Requiere [Node.js](https://nodejs.org/) instalado (cualquier versión LTS reciente).

```bash
npm run dev
```

Eso arranca un static server con SPA fallback en `http://localhost:3000` sirviendo desde `src/`. El script `dev` ejecuta `npx -y serve --single src` — **no hace falta `npm install`**; la primera vez baja `serve` al cache global de npm y queda disponible. El repo no genera `node_modules/` local.

> ¿Por qué no Live Server? Live Server no implementa SPA fallback, así que un F5 en `/cats` o una URL inválida tipo `/cars/pepe` rompe localmente. `serve --single` replica el comportamiento de Vercel en producción — el ambiente de dev es lo más parecido posible al de prod.

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

- **`outputDirectory: "src"`** le dice a Vercel que el sitio servido es la carpeta `src/`, no el root del repo (donde viven `package.json`, `README.md`, etc).
- **`rewrites`** es el catch-all que sirve `index.html` para cualquier ruta no resuelta. Vercel evalúa rewrites **después** de chequear el filesystem, así que los assets estáticos (`/styles.css`, `/main.js`, `/lib/router.js`, `/assets/og-image.png`, etc.) se sirven directos. Solo las rutas que no corresponden a archivos reales (`/cats`, `/cars/pepe`, etc.) caen en el fallback y el router del cliente decide qué renderizar.

## Estructura

```
appJS/
├── src/                       # Todo el sitio servido (Vercel outputDirectory)
│   ├── index.html             # Shell HTML; el contenido se inyecta dinámicamente
│   ├── styles.css
│   ├── main.js                # Entry point: ensambla routes y arranca init
│   ├── lib/
│   │   ├── config.js
│   │   ├── dom.js
│   │   ├── fetch.js
│   │   ├── icons.js
│   │   ├── router.js
│   │   ├── storage.js
│   │   └── theme.js
│   ├── ui/
│   │   ├── card.js
│   │   ├── empty.js
│   │   ├── error.js
│   │   ├── gallery.js
│   │   ├── modal.js
│   │   ├── skeleton.js
│   │   └── toast.js
│   ├── views/
│   │   ├── cars.js
│   │   ├── cats.js
│   │   ├── home.js
│   │   └── notFound.js
│   └── assets/
│       ├── apple-touch-icon.png
│       ├── favicon.png
│       └── og-image.png
├── package.json               # Script `npm run dev` (no hay deps en runtime)
├── vercel.json                # outputDirectory + SPA fallback
├── README.md
└── .gitignore
```

> El rol de cada archivo está documentado en la sección [Arquitectura](#arquitectura) — esta vista es solo el mapa del filesystem.
