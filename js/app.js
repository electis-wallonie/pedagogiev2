// Point d'entrée : chargement des données, routes, délégation des événements
import * as d from './data.js';
import { ACT, FORMS, CHANGE, hydrateAudio, closeModal, ic } from './ui.js';
import { seed, SEED_VERSION } from './seed.js';
import * as pub from './public.js';
import * as adm from './admin.js';
import * as prof from './prof.js';
import { importView } from './import.js';
import * as gest from './gestion.js';
import * as contact from './contact.js';
import * as mosq from './mosquee.js';
import * as compta from './compta.js';
import * as dem from './demandes.js';
import { startAutoTranslate, setLang, isAr } from './i18n.js';

const app = document.getElementById('app');

function guard(role) {
  const u = d.me();
  if (!u) { location.hash = '#/login'; return null; }
  if (u.mustChange) { location.hash = '#/mdp'; return null; }
  const ok = role === 'admin' ? d.isAdmin(u) : role === 'compta' ? d.canCompta(u) : role === 'team' ? true : ['prof', 'admin'].includes(u.role);
  if (!ok) { location.hash = d.homeOf(u); return null; }
  return u;
}
const R = [
  [/^\/?$/, (m, q) => { if (mosq.teamHost()) { const u = d.me(); location.hash = u ? d.homeOf(u) : '#/login'; return null; } return mosq.prieres(q); }],
  [/^\/mosquee$/, () => { location.replace('#/'); return ''; }],
  [/^\/imam$/, (m, q) => mosq.imam(q)],
  [/^\/cours$/, () => pub.home()],
  [/^\/inscription$/, (m, q) => dem.inscription(q)],
  [/^\/admin\/demandes$/, (m, q) => { const u = guard('admin'); return u && dem.demandesView(u, q); }],
  [/^\/installer$/, () => pub.install()],
  [/^\/contact$/, (m, q) => contact.contactPage(q)],
  [/^\/prof\/annuaire$/, () => { const u = guard('team'); return u && contact.annuaire(u); }],
  [/^\/admin\/public$/, () => { const u = guard('admin'); return u && mosq.adminPublic(u); }],
  [/^\/compta(?:\/(\w+))?$/, (m, q) => { const u = guard('compta'); return u && compta.view(u, m[1] || 'bord', q); }],
  [/^\/f\/([^/]+)(?:\/(\w+))?$/, (m, q) => pub.fiche(m[1], m[2], q)],
  [/^\/login$/, () => { const u = d.me(); if (u && !u.mustChange) { location.hash = d.homeOf(u); return null; } return adm.loginView(); }],
  [/^\/mdp$/, () => { const u = d.me(); if (!u) { location.hash = '#/login'; return null; } return adm.pwView(u); }],
  [/^\/admin\/locaux$/, (m, q) => { const u = guard('admin'); return u && gest.locauxView(u, q); }],
  [/^\/admin\/locaux\/pdf$/, () => { const u = guard('admin'); return u && gest.locauxPdf(u); }],
  [/^\/admin\/finances$/, () => { location.hash = '#/compta'; return null; }],
  [/^\/prof\/familles$/, () => { const u = guard('prof'); return u && gest.famillesView(u); }],
  [/^\/admin$/, () => { const u = guard('admin'); return u && adm.adminView(u); }],
  [/^\/prof$/, () => { const u = guard('prof'); return u && prof.dashboard(u); }],
  [/^\/prof\/classes$/, (m, q) => { const u = guard('prof'); return u && prof.classes(u, q); }],
  [/^\/prof\/classe\/(\w+)$/, (m) => { const u = guard('prof'); return u && prof.classe(u, m[1]); }],
  [/^\/prof\/classe\/(\w+)\/appel(?:\/(\w+))?$/, (m, q) => { const u = guard('prof'); return u && prof.appel(u, m[1], m[2], q); }],
  [/^\/prof\/classe\/(\w+)\/appel\/(\w+)\/ok$/, (m) => { const u = guard('prof'); return u && prof.appelOk(u, m[1], m[2]); }],
  [/^\/prof\/classe\/(\w+)\/objectifs$/, (m, q) => { const u = guard('prof'); return u && prof.classeObjectifs(u, m[1], q); }],
  [/^\/prof\/classe\/(\w+)\/historique$/, (m) => { const u = guard('prof'); return u && prof.historique(u, m[1]); }],
  [/^\/prof\/eleves$/, (m, q) => { const u = guard('prof'); return u && prof.eleves(u, q); }],
  [/^\/prof\/eleve\/new$/, (m, q) => { const u = guard('prof'); return u && prof.eleveNew(u, q); }],
  [/^\/prof\/eleve\/(\w+)\/cree$/, (m) => { const u = guard('prof'); return u && prof.eleveCree(u, m[1]); }],
  [/^\/prof\/eleve\/(\w+)\/edit$/, (m) => { const u = guard('prof'); return u && prof.eleveEdit(u, m[1]); }],
  [/^\/prof\/eleve\/(\w+)(?:\/(coran|langue|presence|notes))?$/, (m, q) => { const u = guard('prof'); return u && prof.eleve(u, m[1], m[2], q); }],
  [/^\/prof\/import$/, () => { const u = guard('prof'); return u && importView(u); }],
  [/^\/prof\/reglages$/, () => { const u = guard('prof'); return u && prof.reglages(u); }],
  [/^\/prof\/objectifs$/, (m, q) => { const u = guard('prof'); return u && prof.objectifs(u, q); }],
];

function demoBar() {
  return d.D().demo ? `<div class="demo" role="note">${ic('alert', 14)}<span>Démo · les données restent sur cet appareil</span>${mosq.publicOnly() ? '' : '<a href="#/login">Comptes de test</a>'}</div>` : '';
}
let lastPath = null;
// Sur l'adresse publique (quand un domaine d'équipe est configuré), aucune page de l'équipe n'est servie : on renvoie vers le domaine d'équipe.
const TEAM = /^\/(login|mdp|prof|admin|compta)/;
function render(keep) {
  const raw = (location.hash || '#/').slice(1);
  if (mosq.publicOnly() && TEAM.test(raw.split('?')[0])) { location.href = mosq.teamUrl(); return; }
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  let html = null;
  for (const [re, fn] of R) {
    const m = path.match(re);
    if (m) { html = fn(m, q); break; }
  }
  if (html === null && !R.some(([re]) => re.test(path))) html = pub.home();
  if (html === null) return; // redirection en cours
  const samePage = keep === true || path === lastPath;
  const y = window.scrollY;
  document.body.classList.toggle('q', TEAM.test(path));
  app.innerHTML = demoBar() + html;
  if (samePage) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastPath = path;
  hydrateAudio(app);
  setTimeout(() => { const h = app.querySelector('h1'); document.title = (h ? h.textContent.trim() + ' · ' : '') + (isAr ? 'المتابعة' : 'Suivi'); }, 0);
}
window.addEventListener('hashchange', () => { closeModal(); render(); });
window.addEventListener('soft-render', () => render(true));

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el, e); return; }
  const m = document.getElementById('modal');
  if (m && e.target === m) closeModal();
  const a = e.target.closest('a[href^="#notes-"]');
  if (a) { e.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f || !FORMS[f.dataset.form]) return;
  e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  FORMS[f.dataset.form](f, new FormData(f));
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el, e);
});
document.addEventListener('input', (e) => {
  const inp = e.target.closest('[data-input]');
  if (inp && CHANGE[inp.dataset.input]) CHANGE[inp.dataset.input](inp, e);
  const el = e.target.closest('[data-filter]');
  if (!el) return;
  const q = el.value.trim().toLowerCase();
  document.querySelectorAll(el.dataset.filter).forEach((r) => { r.classList.toggle('hide', !!q && !(r.dataset.q || '').includes(q)); });
});
ACT.lang = () => setLang(isAr ? 'fr' : 'ar');
// glisser le doigt pour passer d'un niveau à l'autre
let sx = null, sy = null;
document.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
document.addEventListener('touchend', (e) => {
  const z = e.target.closest && e.target.closest('[data-swipe-prev],[data-swipe-next]');
  if (!z || sx == null) return;
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  sx = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const rtl = document.documentElement.dir === 'rtl';
  const target = (dx < 0) !== rtl ? z.dataset.swipeNext : z.dataset.swipePrev;
  if (target) location.hash = target;
}, { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

(async function start() {
  startAutoTranslate();
  await mosq.loadConfig();
  // Démo : si les données de démonstration de cet appareil datent d'une ancienne version, on les recharge
  // (seulement en mode démo : de vraies données ne sont jamais effacées).
  if (!d.load() || !d.D().users || (d.D().demo && d.D().seedV !== SEED_VERSION)) { d.logout(); await seed(); }
  d.load();
  await d.purgeExpired();
  render();
  // vérifie aussi les pièces jointes expirées quand on revient sur l'app
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && (await d.purgeExpired())) render(true); });
  // Mise à jour immédiate : le navigateur vérifie la nouvelle version à chaque ouverture et recharge une fois quand elle est prête.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  }
})();
