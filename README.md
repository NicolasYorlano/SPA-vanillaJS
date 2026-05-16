# appJS

SPA (Single Page Application) construida con **HTML, CSS y JavaScript vanilla**, sin frameworks ni dependencias en runtime. Consume dos APIs públicas y las renderiza como galerías paginadas con un modal de detalle.

## Features

- Routing con **History API** (URLs limpias: `/`, `/cats`, `/cars`).
- Galerías con paginación incremental (botón "cargar más") y deduplicación de resultados.
- Modal accesible con foco atrapado, navegación por teclado y cierre con `Escape` o click en backdrop.
- Skeleton loaders durante el fetch.
- Estados de error con botón de reintento.
- Soporte de `prefers-reduced-motion` para animaciones.
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
| Recargar (F5) estando en una ruta interna | 404 |
| Pegar la URL de una ruta interna en una pestaña nueva | 404 |

Esta limitación **solo afecta al desarrollo local**. En producción (Vercel) no aparece porque el `vercel.json` configura SPA fallback automáticamente.

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
├── scripts.js       # Router, fetch, render de cards, modal
├── favicon.png
├── vercel.json      # SPA fallback en Vercel
└── README.md
```
