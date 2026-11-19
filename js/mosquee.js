// Espace public de la mosquée (sans compte) : Prières (Mawaqit) · Imam · Cours · Contact
// + réglages côté direction : nom de la mosquée, lien Mawaqit, destinataires de Contact, questions à l'imam
import * as d from './data.js';
import { ACT, FORMS, esc, ic, pill, toast, openModal, closeModal, ask, brandLogo } from './ui.js';
import { isAr, locale } from './i18n.js';
import { shell } from './prof.js';

const rerender = () => window.dispatchEvent(new Event('hashchange'));
const okMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m || '').trim());
const logo = (s = 40) => brandLogo(s);
const langBtn = () => `<button class="btn2 sm" data-act="lang" lang="${isAr ? 'fr' : 'ar'}" aria-label="${isAr ? 'Français' : 'العربية'}">${ic('globe', 18)}<span class="hide-sm" data-notr dir="auto">${isAr ? 'Français' : 'العربية'}</span></button>`;

// ---------- navigation publique : 4 rubriques ----------
const PUB = [['#/', 'clock', 'Prières'], ['#/imam', 'chat', 'Questions'], ['#/cours', 'book', 'Cours']];
// Connexion séparée : l'équipe se connecte sur « domaineEquipe » (ex. connexion.ma-mosquee.fr), le public ne voit jamais de bouton de connexion.
export const teamHost = () => { const h = location.hostname; const c = (CFG && CFG.domaineEquipe) || ''; return (c && h === c) || /^connexion\./.test(h); };
export const publicOnly = () => !!(CFG && CFG.domaineEquipe) && !teamHost();
export const teamUrl = () => `${location.protocol}//${CFG.domaineEquipe}${location.pathname}#/login`;
export const mosqueName = () => { const m = d.D().mosque || {}; return m.name || (CFG && CFG.nom) || (MW && (MW.label || MW.name)) || 'Notre mosquée'; };
export function pubShell(active, body) {
  if (!MW && !MW_ERR) loadMawaqit();
  return `<div class="page pub">
  <div class="row" style="gap:8px"><a href="#/" class="row" style="text-decoration:none;color:var(--ink);gap:10px;flex:1;min-width:0">${logo(44)}<span class="b" style="font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-notr dir="auto">${esc(mosqueName())}</span></a>${langBtn()}<a href="#/contact" class="btn2 sm ${active === -1 ? 'on-pill' : ''}" aria-label="Contact">${ic('mail', 18)}<span class="hide-sm">Contact</span></a></div>
  <nav class="seg desk" aria-label="Rubriques">${PUB.map(([h, i, l], k) => `<a href="${h}" class="${k === active ? 'on' : ''}">${ic(i, 18)}&nbsp;${l}</a>`).join('')}</nav>
  ${body}</div>
  <nav class="tabbar" aria-label="Rubriques">${PUB.map(([h, i, l], k) => `<a href="${h}" class="${k === active ? 'on' : ''}"><span>${ic(i, 22)}</span>${l}</a>`).join('')}</nav>`;
}

// ---------- Prières (Mawaqit) ----------
// data/mawaqit.json est réécrit chaque jour par GitHub Actions à partir de la page Mawaqit officielle
// (lien dans mosquee.json). Rien n'est stocké sur l'appareil : lu à chaque ouverture, gardé en mémoire.
let MW = null, MW_ERR = false, MW_LOADING = false, CFG = null;
// mosquee.json : configuration propre à chaque mosquée (nom, style, lien Mawaqit…)
export async function loadConfig() {
  try { const r = await fetch('./mosquee.json', { cache: 'no-cache' }); if (r.ok) CFG = await r.json(); } catch {}
  const style = (CFG && CFG.style) || 'pastille';
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `css/styles/${encodeURIComponent(style)}.css`; document.head.appendChild(l);
  document.documentElement.dataset.style = style;
  if (CFG && CFG.couleurTheme) document.querySelector('meta[name=theme-color]')?.setAttribute('content', CFG.couleurTheme);
  return CFG;
}
export const config = () => CFG || {};
export async function loadMawaqit(force = false) {
  if ((MW || MW_LOADING) && !force) return MW;
  MW_LOADING = true;
  try { const r = await fetch('./data/mawaqit.json', { cache: 'no-cache' }); if (!r.ok) throw 0; MW = await r.json(); MW_ERR = false; }
  catch { MW_ERR = true; }
  MW_LOADING = false;
  window.dispatchEvent(new CustomEvent('soft-render'));
  return MW;
}
export const mawaqitData = () => MW;
const PR = [['Fajr', 'الفجر'], ['Chourouq', 'الشروق'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
const toM = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fmt = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function dayTimes(date) {
  const cal = MW && MW.calendar && MW.calendar[date.getMonth()];
  const t = cal && cal[String(date.getDate())];
  if (t && t.length >= 6) return t;
  if (MW && MW.times && MW.shuruq) return [MW.times[0], MW.shuruq, ...MW.times.slice(1)];
  return null;
}
function dayIqama(date, times) {
  if (!MW || !MW.iqamaEnabled) return null;
  const iq = MW.iqamaCalendar && MW.iqamaCalendar[date.getMonth()] && MW.iqamaCalendar[date.getMonth()][String(date.getDate())];
  if (!iq) return null;
  const five = [times[0], times[2], times[3], times[4], times[5]];
  return iq.map((v, i) => (String(v).startsWith('+') ? fmt(toM(five[i]) + parseInt(v, 10)) : v));
}
// prochaine prière (les 5 prières, pas le chourouq)
function nextPrayer(now = new Date()) {
  const t = dayTimes(now);
  if (!t) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const i of [0, 2, 3, 4, 5]) if (toM(t[i]) > cur) return { i, time: t[i], at: toM(t[i]) - cur };
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  const t2 = dayTimes(tm);
  return t2 ? { i: 0, time: t2[0], at: toM(t2[0]) + 1440 - cur, tomorrow: true } : null;
}
const inLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`);
function hijri(date) {
  try {
    const d2 = new Date(date); d2.setDate(d2.getDate() + (+(MW && MW.hijriAdjustment) || 0));
    return new Intl.DateTimeFormat(isAr ? 'ar-u-ca-islamic-umalqura-nu-latn' : 'fr-FR-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d2);
  } catch { return ''; }
}
const SERVICES = [['womenSpace', 'Espace femmes'], ['ablutions', 'Salle d’ablutions'], ['janazaPrayer', 'Prière mortuaire (janaza)'], ['aidPrayer', 'Prière de l’Aïd'], ['childrenCourses', 'Cours pour enfants'], ['adultCourses', 'Cours pour adultes'], ['ramadanMeal', 'Repas du Ramadan'], ['handicapAccessibility', 'Accès handicapés'], ['parking', 'Parking']];
// Compte à rebours en direct (chaque seconde) ; à zéro, la page passe d'elle-même à la prière suivante.
const cdText = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60, p2 = (n) => String(n).padStart(2, '0'); return h ? `${h}:${p2(m)}:${p2(sec)}` : `${p2(m)}:${p2(sec)}`; };
const targetOf = (np) => { const x = new Date(); if (np.tomorrow) x.setDate(x.getDate() + 1); const [h, m] = np.time.split(':').map(Number); x.setHours(h, m, 0, 0); return x.getTime(); };
let cdDone = 0;
setInterval(() => {
  const el = document.getElementById('np-in'); if (!el) return;
  const left = +el.dataset.at - Date.now();
  el.textContent = cdText(left);
  if (left <= 0 && Date.now() - cdDone > 5000) { cdDone = Date.now(); window.dispatchEvent(new CustomEvent('soft-render')); }
}, 1000);
export function prieres(q) {
  if (!MW && !MW_ERR) { loadMawaqit(); return pubShell(0, `<h1>Horaires de prière</h1><div class="ck pad"><p class="b">Chargement des horaires…</p></div>`); }
  const tilesHtml = '';
  const now = new Date();
  const t = MW && dayTimes(now);
  if (!t) return pubShell(0, `<h1>Horaires de prière</h1><div class="ck pad col" style="background:var(--hi)"><h2>Horaires bientôt disponibles</h2><p class="b" style="font-weight:600">La synchronisation avec Mawaqit n’a pas encore eu lieu.</p></div>${tilesHtml}`);
  const iq = dayIqama(now, t);
  const np = nextPrayer(now);
  const fri = now.getDay() === 5;
  const jum = [MW.jumua, MW.jumua2, MW.jumua3].filter(Boolean);
  const name = MW.label || MW.name;
  const showMonth = q && q.get('mois');
  let month = '';
  if (showMonth) {
    const y = now.getFullYear(), mo = now.getMonth(), days = new Date(y, mo + 1, 0).getDate();
    const rows = [];
    for (let k = 1; k <= days; k++) { const dd = new Date(y, mo, k); const tt = dayTimes(dd); if (tt) rows.push(`<tr style="border-top:2px solid var(--neutral);${k === now.getDate() ? 'background:var(--hi);font-weight:800' : ''}"><td style="padding:6px 8px">${dd.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}</td>${tt.map((x) => `<td style="padding:6px 8px;text-align:center">${x}</td>`).join('')}</tr>`); }
    month = `<div class="ck pad col"><div class="row between"><h2>${now.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</h2><a href="#/" class="small b">Fermer</a></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:var(--neutral)"><th style="padding:6px 8px;text-align:start">Jour</th>${PR.map(([f], j) => `<th style="padding:6px 8px">${f}${j === 1 ? `<span class="sun-l" style="justify-content:center">${ic('sunrise', 12, 2)}<span>lever</span></span>` : ''}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
  }
  // Design T3 : la journée entière en bandes ; passées en gris compact, la prochaine devient le bloc bleu nuit.
  const COL = ['var(--blue2)', 'var(--hi)', 'var(--yellow)', 'var(--mint)', 'var(--pink)', 'var(--blue2)'];
  const ROT = [-1, 0.8, -0.6, 1, -0.8, 0.6];
  const label = (i) => (i === 2 && fri && jum.length ? ['Jumu’a', 'الجمعة'] : PR[i]);
  const timeOf = (i) => (i === 2 && fri && jum.length ? jum[0] : t[i]);
  const iqOf = (i) => { const qi = i === 0 ? 0 : i >= 2 ? i - 1 : -1; return iq && qi >= 0 ? iq[qi] : ''; };
  const block = (i, time, extra, tomorrow) => { const [f, a] = tomorrow ? PR[0] : label(i); return `<div class="pt3-next" style="--rot:${tomorrow ? 0 : ROT[i]}deg"><div class="row between" style="gap:10px;align-items:center"><div class="col" style="gap:0;min-width:0"><span class="tiny b up" style="color:var(--yellow);letter-spacing:1.5px"><span>${tomorrow ? 'Demain' : 'Prochaine'}</span> · ${isAr ? '' : `<span data-notr>${esc(f)}</span> `}<span data-notr lang="ar">${a}</span></span><span class="pt3-big">${time}</span>${extra}</div><span class="pt3-cd"><b id="np-in" class="cd" data-at="${targetOf(np)}">${cdText(targetOf(np) - Date.now())}</b><span>avant l’adhan</span></span></div></div>`; };
  const band = (i) => { const [f, a] = label(i); const past = !!np && (np.tomorrow || i < np.i); const time = timeOf(i), q = iqOf(i);
    if (np && !np.tomorrow && i === np.i) return block(i, time, q ? `<span class="small b">Iqama ${q}</span>` : '');
    if (past) return `<div class="pt3 past" style="--rot:${ROT[i]}deg"><span class="pt3-chk">${ic('check', 15)}</span><span class="grow col" style="gap:0;min-width:0"><span class="b">${f} ${isAr ? '' : `<span data-notr lang="ar" class="small">${a}</span>`}</span>${i === 1 ? `<span class="sun-l">${ic('sunrise', 13, 2)}<span>Lever du soleil</span></span>` : ''}</span><span class="pt3-t">${time}</span></div>`;
    return `<div class="pt3" style="--rot:${ROT[i]}deg;background:${COL[i]}"><span class="col grow" style="gap:0;min-width:0"><span class="b pt3-n">${f} ${isAr ? '' : `<span data-notr lang="ar">${a}</span>`}</span>${i === 1 ? `<span class="sun-l big">${ic('sunrise', 15, 2)}<span>Lever du soleil</span></span>` : `<span class="small b">${q ? 'Iqama ' + q : ''}</span>`}</span><span class="pt3-t big">${time}</span></div>`; };
  return pubShell(0, `
  <div class="row between wrap" style="gap:6px"><span class="b">${esc(now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))}</span><span class="small b mut" data-notr>${esc(hijri(now))}</span></div>
  <div class="pt3-stack">${np && np.tomorrow ? block(0, np.time, '', true) : ''}${[0, 1, 2, 3, 4, 5].map(band).join('')}</div>
  <div class="row wrap" style="gap:8px">${jum.length ? pill(`${ic('star', 14)} Jumu’a : ${jum.join(' · ')}`, 'var(--pink)') : ''}${[MW.aidPrayerTime, MW.aidPrayerTime2, MW.aidPrayerTime3].filter(Boolean).length ? pill(`Prière de l’Aïd : ${[MW.aidPrayerTime, MW.aidPrayerTime2, MW.aidPrayerTime3].filter(Boolean).join(' · ')}`, 'var(--mint)') : ''}<a class="pill" href="#/?mois=1" style="background:var(--surface);text-decoration:none">${ic('cal', 14)} Le mois</a>${MW.latitude ? `<a class="pill" href="https://www.google.com/maps/dir/?api=1&destination=${MW.latitude},${MW.longitude}" target="_blank" rel="noopener" style="background:var(--surface);text-decoration:none">${ic('arrow', 14)} Itinéraire</a>` : ''}</div>
  ${month}
  ${(MW.announcements || []).length ? `<div class="ck pad col"><h2>${ic('mega', 20)} Annonces de la mosquée</h2>${MW.announcements.map((a) => `<div class="col" style="gap:4px"><span class="b" data-notr dir="auto">${esc(a.title || '')}</span><span style="white-space:pre-wrap" data-notr dir="auto">${esc(a.content || '')}</span></div>`).join('<hr style="border:0;border-top:2px solid var(--neutral);width:100%">')}</div>` : ''}
  <p class="tiny mut b">Horaires repris de la page Mawaqit officielle de la mosquée. <a href="${esc(MW.source || MW.url || 'https://mawaqit.net')}" target="_blank" rel="noopener">Voir sur Mawaqit</a></p>`);
}

// ---------- Mosquée : la fiche de la mosquée (infos Mawaqit, itinéraire, don, contacts, services) ----------
export function mosquee() {
  if (!MW && !MW_ERR) loadMawaqit();
  const m = MW || {};
  const C = (d.D().contacts || []).filter((c) => okMail(c.email));
  const profsN = d.profs().filter((p) => okMail(p.email) && p.showContact !== false).length;
  const services = SERVICES.filter(([k]) => m[k]);
  const jum = [m.jumua, m.jumua2, m.jumua3].filter(Boolean);
  return pubShell(3, `<div class="ck col" style="padding:0;overflow:hidden">
    ${m.image ? `<div style="height:170px;background:var(--neutral) url('${esc(m.image)}') center/cover;border-bottom:var(--bw) solid var(--ink)"></div>` : ''}
    <div class="pad col" style="gap:4px"><span class="b" style="font-size:24px" data-notr dir="auto">${esc(mosqueName())}</span>${m.association ? `<span class="small mut b" data-notr dir="auto">${esc(m.association)}</span>` : ''}</div></div>
  <div class="grid2">${m.latitude ? `<a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}" target="_blank" rel="noopener">${ic('arrow', 18)}Itinéraire</a>` : ''}${m.paymentWebsite ? `<a class="btn y" href="${esc(m.paymentWebsite)}" target="_blank" rel="noopener">${ic('star', 18)}Faire un don</a>` : `<a class="btn y" href="#/contact?to=don">${ic('star', 18)}Faire un don</a>`}</div>
  ${jum.length ? `<div class="ck flat pad row between" style="background:var(--pink)"><span class="b">Jumu’a (vendredi)</span><span class="b" style="font-size:20px">${jum.join(' · ')}</span></div>` : ''}
  <h2>Nous contacter</h2>
  <div class="ck pad" style="padding-top:2px;padding-bottom:2px"><div class="list">
    ${C.map((c, i) => `<a class="li" href="#/contact?to=c:${c.id}" style="text-decoration:none;color:var(--ink)">${'<span class="av" style="width:42px;height:42px;background:' + ['var(--yellow)', 'var(--mint)', 'var(--blue2)', 'var(--pink)'][i % 4] + '">' + ic('mail', 18) + '</span>'}<span class="grow b">${esc(c.label)}</span>${ic('chev', 18)}</a>`).join('')}
    ${profsN ? `<a class="li" href="#/contact?to=profs" style="text-decoration:none;color:var(--ink)"><span class="av" style="width:42px;height:42px;background:var(--neutral)">${ic('book', 18)}</span><span class="grow b">Les enseignants</span>${ic('chev', 18)}</a>` : ''}
    ${!C.length && !profsN ? '<p class="small mut">Aucun contact pour le moment.</p>' : ''}</div></div>
  ${services.length ? `<h2>Services</h2><div class="row wrap" style="gap:8px">${services.map(([, l]) => pill(`${ic('check', 14)} ${l}`, 'var(--surface)')).join('')}</div>` : ''}
  ${(m.announcements || []).length ? `<div class="ck pad col"><h2>${ic('mega', 20)} Annonces</h2>${m.announcements.map((a) => `<div class="col" style="gap:4px"><span class="b" data-notr dir="auto">${esc(a.title || '')}</span><span style="white-space:pre-wrap" data-notr dir="auto">${esc(a.content || '')}</span></div>`).join('')}</div>` : ''}
  ${publicOnly() ? '' : `<a href="#/login" class="small b" style="align-self:center;margin-top:10px">${ic('lock', 14)} Espace équipe</a>`}`);
}

// ---------- Imam : poser une question + questions/réponses publiées ----------
const THEMES = ['Prière', 'Jeûne / Ramadan', 'Zakat / aumône', 'Famille / mariage', 'Coran', 'Vie quotidienne', 'Autre'];
export function imamMail() {
  const m = d.D().mosque || {};
  if (okMail(m.imamEmail)) return m.imamEmail;
  const c = (d.D().contacts || []).find((x) => /imam/i.test(x.label) && okMail(x.email)) || (d.D().contacts || []).find((x) => okMail(x.email));
  return c ? c.email : '';
}
export function imam(q) {
  // Design Z1·I : la grande bulle pour poser sa question, puis « Fréquentes » / « Récentes » en grands titres.
  const all = d.D().faq || [];
  const v = q && q.get('v') === 'r' ? 'r' : 'f';
  const rec = all.slice().sort((a, b) => b.at.localeCompare(a.at));
  const fav = all.filter((f) => f.freq);
  const freq = fav.length ? fav : all.slice().sort((a, b) => a.at.localeCompare(b.at));
  const list = v === 'r' ? rec : freq;
  const ago = (iso) => { const n = Math.floor((Date.now() - new Date(iso)) / 864e5); return n <= 0 ? 'aujourd’hui' : n === 1 ? 'hier' : n < 7 ? `il y a ${n} j` : n < 30 ? `il y a ${Math.floor(n / 7)} sem.` : `il y a ${Math.floor(n / 30)} mois`; };
  const mail = imamMail();
  return pubShell(1, `
  <form class="qz-bubble" data-form="imam-ask">
    <h1 class="qz-h">Une question ?<br>L’imam vous répond.</h1>
    ${mail ? `<label class="sr" for="qq">Votre question</label><textarea id="qq" name="question" class="inp" rows="3" required placeholder="Écrivez votre question…"></textarea>
    <button class="btn full ink">${ic('send', 20)}Envoyer à l’imam</button>` : '<p class="b">La mosquée n’a pas encore indiqué l’adresse de l’imam.</p>'}
    <svg class="qz-tail" width="46" height="34" viewBox="0 0 46 34" aria-hidden="true"><path d="M3 0 L3 31 L40 0" fill="var(--yellow)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"></path><path d="M5 0 H38" stroke="var(--yellow)" stroke-width="6"></path></svg>
  </form>
  <div class="qz-who">${logo(30)}<span class="small b">Réponse privée, par e-mail</span></div>
  <nav class="qz-tabs" aria-label="Questions">
    <a href="#/imam" class="${v === 'f' ? 'on' : ''}" ${v === 'f' ? 'aria-current="page"' : ''}>Fréquentes</a>
    <a href="#/imam?v=r" class="${v === 'r' ? 'on' : ''}" ${v === 'r' ? 'aria-current="page"' : ''}>Récentes</a>
  </nav>
  ${list.length ? `<div class="ck qz-list">${list.map((f) => `<details class="qz-item"><summary><span class="col grow" style="gap:2px;min-width:0"><span class="tiny b mut up"><span>${esc(f.theme)}</span>${v === 'r' ? ` · <span>${ago(f.at)}</span>` : ''}</span><span class="b qz-q" data-notr dir="auto">${esc(f.q)}</span></span><span class="qz-chev">${ic('chev', 16)}</span></summary><div class="qz-a" data-notr dir="auto">${esc(f.r)}</div></details>`).join('')}</div>`
    : '<p class="small mut">Aucune réponse publiée pour le moment.</p>'}`);
}
FORMS['imam-ask'] = (f, fd) => {
  const to = imamMail();
  if (!to) return;
  const subject = 'Question à l’imam';
  const body = (fd.get('question') || '').trim();
  location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// ---------- Direction → Mosquée & espace public ----------
export function publicTile() {
  const m = d.D().mosque || {};
  return `<a href="#/admin/public" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:var(--yellow)"><span class="row between"><span class="b" style="font-size:18px">${ic('moon', 20)} Mosquée &amp; espace public</span>${ic('chev', 18)}</span>
  <span style="font-size:22px;font-weight:800" data-notr dir="auto">${esc(mosqueName())}</span>
  <span class="small b" style="font-weight:600">Prières ${MW ? '✓ reliées à Mawaqit' : '· Mawaqit'} · ${(d.D().contacts || []).length} contact(s) · ${(d.D().faq || []).length} réponse(s) de l’imam</span></a>`;
}
export function adminPublic(u) {
  const m = d.D().mosque || {};
  const C = d.D().contacts || [];
  const faq = (d.D().faq || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  return shell(u, 4, `<div class="page narrow">
  <div class="top"><a href="#/admin" class="ib" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><div class="small mut b">Direction</div><h1>Mosquée &amp; espace public</h1></div><a class="btn2 sm" href="#/" target="_blank">${ic('share', 16)}Voir</a></div>
  <p class="mut b" style="font-weight:600">Ce que voient les fidèles sans compte : Prières · Imam · Cours · Contact.</p>
  <form class="ck pad col" data-form="mosque"><h2>${ic('moon', 20)} La mosquée</h2>
    <div class="field"><label class="lbl" for="mn">Nom affiché</label><input id="mn" name="name" class="inp" value="${esc(m.name || '')}" placeholder="${esc(mosqueName())}"><span class="hint">Laissez vide pour reprendre le nom de la configuration ou de Mawaqit.</span></div>
    <div class="ck flat pad col" style="gap:4px"><span class="b">${ic('clock', 16)} Horaires de prière : reliés à Mawaqit</span><span class="small b" style="font-weight:600">${MW ? `${esc(MW.label || MW.name || '')} · mis à jour le ${MW.updatedAt ? new Date(MW.updatedAt).toLocaleDateString(locale) : '—'}` : 'Synchronisation en attente'}</span><span class="tiny mut b">Le lien de la page Mawaqit est réglé une fois pour toutes par l’équipe technique (fichier mosquee.json) ; les horaires se mettent à jour tout seuls chaque nuit.</span></div>
    <button class="btn sm" style="align-self:flex-start">Enregistrer</button></form>
  <div class="ck pad col"><h2>${ic('mail', 20)} Page Contact</h2>
    <p class="small mut b" style="font-weight:600">Les personnes et services que le public peut contacter (direction, imam, trésorier, secrétariat, directeur de l’école…). Les adresses ne sont jamais affichées : le message s’ouvre directement dans l’application e-mail. Les enseignants qui ont un e-mail apparaissent aussi automatiquement.</p>
    <div class="list">${C.map((c) => `<div class="li"><div class="grow"><div class="b">${esc(c.label)}</div><div class="small mut b" style="font-weight:600;word-break:break-all">${esc(c.email || 'e-mail manquant')}</div></div><button class="ib sm" data-act="ct-edit" data-id="${c.id}" aria-label="Modifier ${esc(c.label)}">${ic('edit', 16)}</button><button class="ib sm" data-act="ct-del" data-id="${c.id}" aria-label="Supprimer ${esc(c.label)}">${ic('trash', 16)}</button></div>`).join('') || '<p class="small mut">Aucun destinataire.</p>'}</div>
    <button class="btn2 sm" data-act="ct-edit" style="align-self:flex-start">${ic('plus', 16)}Ajouter un destinataire</button></div>
  <div class="ck pad col"><h2>${ic('chat', 20)} Questions à l’imam</h2>
    <form class="row" data-form="imam-mail"><div class="field grow"><label class="lbl" for="im">E-mail qui reçoit les questions</label><input id="im" name="email" type="email" class="inp" value="${esc(m.imamEmail || '')}" placeholder="${esc(imamMail() || 'imam@…')}"></div><button class="btn sm" style="align-self:flex-end">Enregistrer</button></form>
    <p class="small mut b" style="font-weight:600">Publiez les réponses utiles à tous (sans le nom de la personne) : elles s’affichent dans la rubrique Imam.</p>
    <button class="btn sm" data-act="faq-edit" style="align-self:flex-start">${ic('plus', 16)}Publier une réponse</button>
    <div class="list">${faq.map((f) => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="tiny b mut">${esc(f.theme)}</div><div class="b" data-notr dir="auto">${esc(f.q)}</div></div><button class="ib sm" data-act="faq-edit" data-id="${f.id}" aria-label="Modifier">${ic('edit', 16)}</button><button class="ib sm" data-act="faq-del" data-id="${f.id}" aria-label="Supprimer">${ic('trash', 16)}</button></div>`).join('')}</div></div>
  </div>`);
}
FORMS.mosque = (f, fd) => { d.D().mosque.name = (fd.get('name') || '').trim(); d.save(); toast('Enregistré'); rerender(); };
FORMS['imam-mail'] = (f, fd) => { const e = (fd.get('email') || '').trim().toLowerCase(); if (e && !okMail(e)) { toast('Adresse e-mail invalide'); return; } d.D().mosque.imamEmail = e; d.save(); toast('Enregistré'); rerender(); };
ACT['ct-edit'] = (el) => {
  const c = d.D().contacts.find((x) => x.id === el.dataset.id) || { id: '', label: '', email: '' };
  openModal(() => `<div class="row between"><h2>${c.id ? 'Modifier' : 'Nouveau destinataire'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="ct" data-id="${c.id}"><div class="field"><label class="lbl" for="cl">Nom affiché au public</label><input id="cl" name="label" class="inp" required value="${esc(c.label)}" placeholder="ex. L’imam, Le trésorier, Le secrétariat…"></div>
  <div class="field"><label class="lbl" for="cm">E-mail (jamais affiché)</label><input id="cm" name="email" type="email" class="inp" required value="${esc(c.email)}"></div><button class="btn full">Enregistrer</button></form>`);
};
FORMS.ct = (f, fd) => {
  const v = { label: (fd.get('label') || '').trim(), email: (fd.get('email') || '').trim().toLowerCase() };
  if (!okMail(v.email)) { toast('Adresse e-mail invalide'); return; }
  const c = d.D().contacts.find((x) => x.id === f.dataset.id);
  if (c) Object.assign(c, v); else d.D().contacts.push({ id: d.uid(), ...v });
  d.save(); closeModal(); rerender();
};
ACT['ct-del'] = (el) => { if (!ask('Supprimer ce destinataire ?')) return; d.D().contacts = d.D().contacts.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
ACT['faq-edit'] = (el) => {
  const f = d.D().faq.find((x) => x.id === el.dataset.id) || { id: '', theme: THEMES[0], q: '', r: '' };
  openModal(() => `<div class="row between"><h2>${f.id ? 'Modifier la réponse' : 'Publier une réponse'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="faq" data-id="${f.id}"><div class="field"><label class="lbl" for="ft">Thème</label><select id="ft" name="theme" class="inp">${THEMES.map((t) => `<option ${t === f.theme ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div class="field"><label class="lbl" for="fqq">Question</label><textarea id="fqq" name="q" class="inp" required>${esc(f.q)}</textarea></div>
  <div class="field"><label class="lbl" for="fr">Réponse de l’imam</label><textarea id="fr" name="r" class="inp" rows="7" required>${esc(f.r)}</textarea></div>
  <label class="row" style="gap:10px;font-weight:800"><input type="checkbox" name="freq" ${f.freq ? 'checked' : ''} style="width:22px;height:22px"> Afficher dans « Fréquentes »</label><button class="btn full">Publier</button></form>`);
};
FORMS.faq = (f, fd) => {
  const v = { theme: fd.get('theme'), q: (fd.get('q') || '').trim(), r: (fd.get('r') || '').trim(), freq: !!fd.get('freq') };
  const x = d.D().faq.find((y) => y.id === f.dataset.id);
  if (x) Object.assign(x, v); else d.D().faq.push({ id: d.uid(), at: new Date().toISOString(), ...v });
  d.save(); closeModal(); toast('Réponse publiée'); rerender();
};
ACT['faq-del'] = (el) => { if (!ask('Supprimer cette réponse ?')) return; d.D().faq = d.D().faq.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
