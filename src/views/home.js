import { mainContainer } from '../lib/dom.js';
import { ROUTE, pathFor, navigate } from '../lib/router.js';
import { createIcon } from '../lib/icons.js';

const HOME_PHRASES = [
    { text: "La tecnología es mejor cuando une a las personas.", className: "shadow-1" },
    { text: "El software es una combinación de arte e ingeniería.", className: "shadow-2" },
    { text: "La innovación distingue a los líderes de los seguidores.", className: "shadow-3" }
];

export function renderHome() {
    const selected = HOME_PHRASES[Math.floor(Math.random() * HOME_PHRASES.length)];

    mainContainer.replaceChildren();

    const title = document.createElement('h1');
    // --plain: sin underline. En home queremos que la quote (azul + glow)
    // gane el énfasis por color; mantener el underline en el h1 le crea un
    // segundo foco visual del mismo peso y queda empatado. Las otras vistas
    // (galerías, 404) sí lo necesitan como separador del contenido de abajo.
    title.className = 'content-title content-title--plain';
    title.textContent = 'Cats & Cars';

    const quote = document.createElement('h2');
    quote.className = `${selected.className} highlighted-quote`;
    quote.textContent = `"${selected.text}"`;

    const expectations = document.createElement('section');
    expectations.className = 'expectations-paragraph';
    const expectTitle = document.createElement('h3');
    expectTitle.textContent = 'Mis Expectativas';
    const expectText = document.createElement('p');
    expectText.textContent = 'Espero profundizar mis conocimientos en el desarrollo de aplicaciones web modernas con html, css y javascript, comprendiendo no solo la implementación técnica sino también la gestión eficiente de proyectos y nuevas tecnologías de la Web 2.0.';
    expectations.append(expectTitle, expectText);

    const ctas = document.createElement('section');
    ctas.setAttribute('aria-label', 'Explorá las galerías');
    const ctaGrid = document.createElement('div');
    ctaGrid.className = 'home-cta-grid';
    ctaGrid.append(
        createHomeCta(ROUTE.CATS, 'Galería de gatos', 'Imágenes aleatorias de gatos desde The Cat API con nombres asignados.'),
        createHomeCta(ROUTE.CARS, 'Galería de autos', 'Fotos de autos de lujo desde Pixabay — Ferraris, Lamborghinis y otros supercars.')
    );
    ctas.append(ctaGrid);

    mainContainer.append(title, quote, expectations, ctas);
}

function createHomeCta(routeName, titleText, descText) {
    const cta = document.createElement('a');
    cta.href = pathFor(routeName);
    cta.className = 'home-cta';
    cta.dataset.route = routeName;

    const title = document.createElement('h3');
    title.className = 'home-cta-title';
    title.append(document.createTextNode(titleText));
    const arrow = document.createElement('span');
    arrow.className = 'home-cta-arrow';
    // El SVG dentro ya tiene aria-hidden; el span existe solo para hookear el
    // hover translateX y el cambio de color a primary.
    arrow.append(createIcon('arrow-right', 20));
    title.append(arrow);

    const desc = document.createElement('p');
    desc.className = 'home-cta-desc';
    desc.textContent = descText;

    cta.append(title, desc);

    // Interceptar para navegar vía router (no recargar), respetando modifiers.
    cta.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(routeName);
    });

    return cta;
}
