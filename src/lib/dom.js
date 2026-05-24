// Referencias DOM compartidas. Single source of truth — quien las necesite
// las importa de acá en lugar de hacer querySelector por su cuenta.
// El entry point es <script type="module"> (deferred), así que el DOM ya
// existe cuando este módulo se evalúa.

export const mainContainer = document.querySelector('#main');
export const navLinks = document.querySelectorAll('.sidebar a[data-route]');
