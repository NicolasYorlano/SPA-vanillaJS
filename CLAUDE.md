# CLAUDE.md — appJS (Cats & Cars)

## Proyecto
SPA en **HTML/CSS/JavaScript vanilla** (ES modules nativos del browser, sin build step, sin dependencias en runtime). Consume The Cat API y Pixabay y las renderiza como galerías paginadas con modal de detalle. Es la mitad "vanilla" del **TP1 de Tecnología y Gestión Web (TyGW)**; existe una contraparte `appReact` con la que se compara. Deploy en Vercel: https://catsandcars-js.vercel.app/

La arquitectura, decisiones de diseño y estructura ya están documentadas en detalle en [README.md](./README.md) — **leelo antes de tocar código y no dupliques esa info acá.**

## Comandos
- `npm run dev` → static server con SPA fallback en `localhost:3000` (`npx -y serve --single src`). No requiere `npm install`.
- No hay build, linter ni test runner configurado.

## Convenciones no-obvias (respetar)
- **Utility classes siempre con `!important`** (`.hidden`, etc.): sin él, el source order deja que otra clase del mismo elemento (ej. `.btn-primary`) le gane el `display`.
- **Sistema de tokens CSS en `:root`** (70+ vars): los componentes NUNCA usan valores literales de color/spacing/tipografía. El dark theme solo overridea vars. Cambiar algo = tocar la var, no el componente.
- **Tres espejos manuales JS↔CSS/HTML** (documentados en su sitio; mantener sincronizados en el mismo cambio):
  - `ICON_SIZE` en `lib/icons.js` ↔ `--icon-*` en `styles.css`.
  - `--primary-color` dark en el script anti-FOUC de `index.html` ↔ bloque `[data-theme="dark"]`.
  - `catNames.length` (`views/cats.js`) ↔ `MAX_ITEMS` (`lib/config.js`).
- **Sin frameworks ni deps en runtime.** No agregar librerías: la consigna del TP es vanilla. `serve` es solo dev server vía `npx`.
- **`CACHE_VERSION` (`lib/config.js`):** bumpear ante CUALQUIER cambio de shape de un cache persistido en `sessionStorage`.
- **Idioma:** comentarios y strings de UI en español (argentino); identificadores en inglés. Mantener ese patrón.

## Skills — cuándo usarlas
Al empezar una sesión consultá **`using-agent-skills`** (meta-skill que gobierna el descubrimiento). Mapeo de tareas frecuentes en este proyecto:

### Diseño y UI (lo más usado acá)
- **`frontend-design`** → al construir o re-estilar cualquier vista/componente: definir y sostener la dirección visual (paleta, tipografía, estructura, textura). Respetar los tokens existentes; nada de strings de relleno (usar info real, no placeholders).
- **`frontend-ui-engineering`** → al implementar componentes, layouts o estado de UI que deban verse production-quality, no "AI-generated".

### Calidad de código
- **`code-review-and-quality`** → antes de dar por cerrado cualquier cambio. Es el modo "review senior/tech-lead" que ya pido por defecto.
- **`code-simplification`** → refactors de claridad sin cambiar comportamiento (ej. extraer un `createVersionedCache` para la duplicación entre `cats.js` y `cars.js`).
- **`debugging-and-error-recovery`** → cuando algo falla o no matchea lo esperado: ir a root-cause, no parchar a ciegas.
- **`test-driven-development`** → si se agrega lógica testeable (dedup, paginación, parseo de tags de Pixabay, asignación de nombres).

### Producto y planificación
- **`planning-and-task-breakdown`** + **`incremental-implementation`** → features que tocan más de un archivo: entregar por pasos, no un commit gigante.
- **`spec-driven-development`** / **`idea-refine`** / **`interview-me`** → cuando el pedido es vago: refinar y acotar antes de codear.

### Transversales
- **`security-and-hardening`** → al tocar la CSP, el manejo de la API key de Pixabay (expuesta a propósito — decisión aceptada) o cualquier input externo.
- **`performance-optimization`** → Core Web Vitals, tiempos de carga, `loading="lazy"`, peso de assets.
- **`documentation-and-adrs`** → registrar decisiones de arquitectura (el README ya sigue ese espíritu; mantenerlo).
- **`git-workflow-and-versioning`** → commits y branching.
- **`browser-testing-with-devtools`** → verificar comportamiento real en el browser (requiere el MCP `chrome-devtools` configurado).

## Cómo trabajar acá
- Reviews y explicaciones en **español argentino**, tono senior/tech-lead, sin inflar.
- Antes de proponer librerías o build steps: **no**. Vanilla es requisito del TP.
- Si cambiás un valor con espejo manual (ver Convenciones), tocá ambos lados en el mismo cambio.
