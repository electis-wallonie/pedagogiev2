// Côté parents / élèves : accueil avec le code, fiche en lecture seule, installation
import * as d from './data.js';
import { schedLabel, nextLabel, brandLogo } from './ui.js';
import { ACT, FORMS, esc, ic, av, pill, fdate, flong, toast, openModal, initials } from './ui.js';
import * as F from './fiche.js';
import { annoncesHtml } from './annonces.js';
import { isAr } from './i18n.js';
import { pubShell, config } from './mosquee.js';
import { openYears } from './demandes.js';
export const langBtn = () => `<button class="btn2 sm" data-act="lang" lang="${isAr ? 'fr' : 'ar'}">${ic('globe', 18)}<span data-notr dir="auto">${isAr ? 'Français' : 'العربية'}</span></button>`;

let lastError = null;

const logo = (s = 44) => brandLogo(s);
const blobs = () => `<div class="hero" aria-hidden="true">
<i style="width:230px;height:230px;border-radius:999px;background:var(--yellow);left:-40px;top:20px"></i>
<i style="width:150px;height:150px;border-radius:24px;background:var(--blue2);right:20px;top:46px;transform:rotate(12deg)"></i>
<i style="width:92px;height:92px;border-radius:999px;background:var(--mint);right:140px;top:170px"></i>
<i style="width:58px;height:58px;border-radius:14px;background:var(--pink);left:200px;top:10px;transform:rotate(-14deg)"></i></div>`;

const regBtn = () => (openYears().length ? `<a href="#/inscription" class="btn2 full" style="margin-top:2px">${ic('edit', 18)}Faire une demande d’inscription</a>` : `<div class="btn2 full" aria-disabled="true" style="margin-top:2px;opacity:.7;cursor:default">${ic('clock', 18)}Inscriptions closes pour le moment</div>`);
export function home() {
  const saved = d.savedCodes().map((c) => d.byCode(c)).filter(Boolean);
  const err = lastError;
  lastError = null;
  const kids = saved.length ? `<div class="col"><h2>Mes fiches enregistrées</h2>${saved.map((s) => {
    const c = d.cls(s.classId);
    return `<a href="#/f/${encodeURIComponent(s.code)}" class="ck pad row" style="text-decoration:none;color:var(--ink)">${av(initials(s), 48, 'var(--yellow)', 16)}<span class="grow"><span class="b" style="display:block;font-size:17px">${esc(s.prenoms.split(' ')[0])} ${esc(s.nom)}</span><span class="small mut b">${esc(c ? c.name : '')}</span></span>${ic('chev', 20)}</a>`;
  }).join('')}<button class="btn2 sm" data-act="forget-codes" style="align-self:flex-start">Oublier ces fiches sur cet appareil</button></div>` : '';
  // Design W1 « Mon suivi » : la carte bleue avec le code, puis la liste blanche des cours (mosquee.json → "cours").
  const COL = { mint: 'var(--mint)', jaune: 'var(--yellow)', rose: 'var(--pink)', bleu: 'var(--blue2)' };
  const cours = (config().cours || []).filter((c) => c && c.public);
  const list = cours.length ? `<div class="col" style="gap:10px"><h2 style="margin-top:6px">Nos cours</h2>${cours.map((c, k) => `<div class="w1-c"><span class="w1-ic" style="background:${COL[c.couleur] || ['var(--mint)', 'var(--yellow)', 'var(--pink)'][k % 3]}">${ic(c.icone || ['users', 'book', 'hands'][k % 3], 20)}</span><span class="col grow" style="gap:1px;min-width:0"><span class="b" style="font-size:16px" dir="auto">${esc(c.public)}</span>${c.detail ? `<span class="small mut" style="font-weight:600" dir="auto">${esc(c.detail)}</span>` : ''}${c.horaires ? `<span class="small b" dir="auto">${esc(c.horaires)}</span>` : ''}</span></div>`).join('')}
    ${regBtn()}</div>` : `<div class="col" style="gap:10px">${regBtn()}</div>`;
  return pubShell(0, `<div class="home-grid w1-grid">
  <div class="col" style="gap:16px">
    <form class="w1-card" data-form="code" novalidate>
      <span class="w1-blob" aria-hidden="true"><i></i><i></i></span>
      <span class="col" style="gap:2px;position:relative;padding-inline-end:70px"><h1 class="w1-h">Mon suivi</h1><span class="small b" style="font-weight:600">Entrez le code donné par l’enseignant.</span></span>
      <label class="sr" for="code">Code de suivi</label>
      <input id="code" name="code" class="inp code w1-in" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="YB3516-K7Q" value="${esc(err || '')}" ${err ? 'aria-invalid="true" aria-describedby="code-err"' : ''}>
      ${err ? `<div id="code-err" class="w1-err" role="alert">${ic('x', 15)}Code introuvable. Vérifiez chaque lettre, ou demandez-le à l’enseignant.</div>` : ''}
      <label class="check w1-check"><input type="checkbox" name="remember" checked>Se souvenir de ce code sur cet appareil</label>
      <button class="btn full y">${ic('key', 18)}Voir la fiche</button>
    </form>
    ${kids}
  </div>
  ${list}
  </div>`);
}
FORMS.code = (f, fd) => {
  const code = (fd.get('code') || '').trim();
  const st = d.byCode(code);
  if (!st) {
    lastError = code || ' ';
    if (['', '#', '#/'].includes(location.hash)) window.dispatchEvent(new Event('hashchange')); else location.hash = '#/';
    return;
  }
  if (fd.get('remember')) d.rememberCode(st.code);
  location.hash = `#/f/${encodeURIComponent(st.code)}`;
};
ACT['forget-codes'] = () => { d.forgetCodes(); toast('Fiches oubliées sur cet appareil'); window.dispatchEvent(new Event('hashchange')); };

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
export function install() {
  const steps = [['Ouvrez le menu', 'Bouton Partager sur iPhone, ou ⋮ sur Android'], ['Choisissez', '« Sur l’écran d’accueil » / « Installer l’application »'], ['C’est prêt', 'Suivi s’ouvre comme une vraie application']];
  return `<div class="page narrow">
  <div class="top"><a href="#/" class="ib" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><h1>Installer Suivi</h1></div></div>
  ${deferredPrompt ? `<button class="btn full" data-act="install">${ic('dl', 20)}Installer maintenant</button>` : ''}
  <div class="ck pad col" style="gap:16px">${steps.map(([a, b], i) => `<div class="row" style="align-items:flex-start">${av(i + 1, 38, ['var(--blue2)', 'var(--mint)', 'var(--yellow)'][i], 16)}<div><div class="b">${a}</div><div class="small mut b" style="font-weight:600">${b}</div></div></div>`).join('')}</div>
  <a href="#/" class="btn2 full">Retour</a></div>`;
}
ACT.install = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; };

// ---------- fiche parent ----------
const TABS = [['apercu', 'home', 'Aperçu'], ['coran', 'book', 'Coran'], ['langue', 'star', 'Langue'], ['presence', 'cal', 'Présence'], ['notes', 'note', 'Devoirs & infos']];
let current = null;
export function fiche(code, tab = 'apercu', q = null) {
  const st = d.byCode(decodeURIComponent(code));
  if (!st) { lastError = decodeURIComponent(code); return home(); }
  current = st;
  const c = d.cls(st.classId);
  const base = `#/f/${encodeURIComponent(st.code)}`;
  const k = d.coranStats(st);
  const p = d.presence(st);
  const pid = d.profOfStudent(st);
  const objs = d.objectivesOf(pid, st.level || 1);
  const got = objs.filter((o) => st.acquired[o.id]).length;
  let body = '';
  if (tab === 'apercu') {
    const last = p.h[0];
    const note = d.notesForStudent(st)[0];
    body = `<div class="grid3">
      <a href="${base}/coran" class="ck stat" style="background:var(--yellow);text-decoration:none;color:var(--ink)"><div class="v">${k.v}</div><div class="l">sourates validées</div></a>
      <a href="${base}/langue" class="ck stat" style="background:var(--blue2);text-decoration:none;color:var(--ink)"><div class="v">${got}/${objs.length}</div><div class="l">objectifs</div></a>
      <a href="${base}/presence" class="ck stat" style="background:var(--mint);text-decoration:none;color:var(--ink)"><div class="v">${p.rate === null ? '—' : p.rate + '%'}</div><div class="l">présence</div></a></div>
      ${(() => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); const today = t.toISOString().slice(0, 10); const all = d.notesForStudent(st); const dv = all.filter((n) => n.kind === 'devoir' && n.due >= today).sort((a, b) => a.due.localeCompare(b.due))[0]; const inf = !dv && all.filter((n) => n.scope === 'class' && n.kind !== 'devoir' && Date.now() - new Date(n.at).getTime() < 7 * 864e5).sort((a, b) => b.at.localeCompare(a.at))[0]; const x = dv || inf;
        return x ? `<a href="${base}/notes" class="ck pad col" style="gap:6px;background:${dv ? 'var(--mint)' : 'var(--yellow)'};text-decoration:none;color:var(--ink)"><span class="tiny b">${ic(dv ? 'book' : 'bell', 14)} ${dv ? 'DEVOIR' : 'INFORMATION'}</span>${dv ? `<span class="b" style="font-size:19px">Pour le ${fdate(dv.due, { weekday: 'long', day: 'numeric', month: 'long' })}</span>` : `<span class="small b">Le ${fdate(x.at.slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long' })}</span>`}${x.text ? `<span data-notr dir="auto" style="white-space:pre-wrap;font-weight:500">${esc(x.text)}</span>` : ''}${(x.files || []).length || x.audioId ? '<span class="small b">+ pièce jointe ou vocal dans Devoirs & infos</span>' : ''}</a>` : ''; })()}
      <h2>Sourate en cours</h2>${F.enCoursCards(st, 'p-sour')}
      ${last ? `<div class="ck pad row between wrap"><div><div class="b">Dernier cours</div><div class="small mut b" style="font-weight:600">${flong(last.date)}</div></div>${pill(last.s === 'P' ? 'Présent' : last.s === 'A' ? 'Absent à ce cours' : 'Absent · prévenu', `var(--${last.s === 'P' ? 'present' : last.s === 'A' ? 'absent' : 'prev'})`, `var(--on${last.s === 'P' ? 'present' : last.s === 'A' ? 'absent' : 'prev'})`)}</div>` : ''}
      ${note ? `<div class="ck pad col" style="background:var(--ink);color:#fff;gap:6px"><span class="tiny b" style="color:var(--yellow)">DERNIÈRE NOTE · ${esc(fdate(note.at))}</span>${note.text ? `<span data-notr dir="auto" style="white-space:pre-wrap">${esc(note.text)}</span>` : (note.files || []).length ? '<span>Pièce jointe</span>' : '<span>Message vocal</span>'}${(note.files || []).length ? `<a href="#/f/${encodeURIComponent(st.code)}/notes" style="color:var(--yellow)">Voir les pièces jointes</a>` : ''}</div>` : ''}`;
  } else if (tab === 'coran') {
    body = `${F.coranHead(st)}${F.enCoursCards(st, 'p-sour')}<div class="ck pad col">${F.mushaf(st, 'p-sour')}${F.legend()}</div><p class="tiny mut">Touchez une sourate pour voir ses dates.</p>`;
  } else if (tab === 'langue') body = F.objectives(st, false, q && q.get('n'), `${base}/langue`);
  else if (tab === 'presence') body = F.presence(st);
  else body = F.notes(st, false);
  const desk = `<div class="seg desk" role="navigation" aria-label="Sections">${TABS.map(([id, , l]) => `<a href="${base}/${id}" class="${id === tab ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  const mob = `<nav class="tabbar" aria-label="Sections">${TABS.map(([id, i, l]) => `<a href="${base}/${id}" class="${id === tab ? 'on' : ''}"><span>${ic(i, 22)}</span>${l}</a>`).join('')}</nav>`;
  return `<div class="page">
  <div class="row between wrap" style="gap:8px"><a href="#/" class="row" style="text-decoration:none;color:var(--ink)">${ic('back', 20)}${logo(36)}<span class="b">Cours</span></a><div class="row" style="gap:8px">${langBtn()}<a href="#/contact" class="ib" aria-label="Contact">${ic('mail', 18)}</a></div></div>
  ${(() => { const nx = c && d.nextCourse(c); const k = nx ? Math.round((new Date(nx.when.getFullYear(), nx.when.getMonth(), nx.when.getDate()) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 864e5) : null;
    return `<div class="ck fid"><div class="row fid-in">${av(initials(st), 60, 'var(--yellow)', 20)}<div class="grow" style="min-width:0"><h1 style="font-size:24px">${esc(st.prenoms)} ${esc(st.nom)}</h1>
  <div class="row wrap" style="gap:6px;margin-top:6px">${pill(esc(c ? c.name : ''), 'var(--blue2)')}${d.ageOf(st) != null ? pill(`${d.ageOf(st)} ans`, 'var(--surface)') : ''}</div>${st.parent ? `<div style="margin-top:6px">${F.parentBadge(st)}</div>` : ''}</div></div>
  ${nx ? `<div class="fid-nx">${ic('clock', 18)}<span class="col grow" style="gap:0;min-width:0"><span class="fid-l">Prochain cours</span><span class="b">${nextLabel(nx)}</span></span>${k >= 2 ? `<span class="fid-k">dans ${k} j</span>` : ''}</div>` : ''}</div>`; })()}
  ${tab === 'apercu' ? annoncesHtml() : ''}
  ${desk}<div class="col" style="gap:14px">${body}</div></div>${mob}`;
}
ACT['p-sour'] = (el) => {
  const n = +el.dataset.n;
  openModal(() => F.sourateSheet(current, n, false));
};
