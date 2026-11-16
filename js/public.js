// Côté parents / élèves : accueil avec le code, fiche en lecture seule, installation
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, fdate, flong, toast, openModal, initials } from './ui.js';
import * as F from './fiche.js';

let lastError = null;

const logo = (s = 44) => `<span class="logo" style="width:${s}px;height:${s}px">${ic('book', Math.round(s * 0.52), 2.6)}</span>`;
const blobs = () => `<div class="hero" aria-hidden="true">
<i style="width:230px;height:230px;border-radius:999px;background:var(--yellow);left:-40px;top:20px"></i>
<i style="width:150px;height:150px;border-radius:24px;background:var(--blue2);right:20px;top:46px;transform:rotate(12deg)"></i>
<i style="width:92px;height:92px;border-radius:999px;background:var(--mint);right:140px;top:170px"></i>
<i style="width:58px;height:58px;border-radius:14px;background:var(--pink);left:200px;top:10px;transform:rotate(-14deg)"></i></div>`;

export function home() {
  const saved = d.savedCodes().map((c) => d.byCode(c)).filter(Boolean);
  const err = lastError;
  lastError = null;
  const kids = saved.length ? `<div class="col"><h2>Mes fiches</h2>${saved.map((s) => {
    const c = d.cls(s.classId);
    return `<a href="#/f/${encodeURIComponent(s.code)}" class="ck pad row" style="text-decoration:none;color:var(--ink)">${av(initials(s), 48, 'var(--yellow)', 16)}<span class="grow"><span class="b" style="display:block;font-size:17px">${esc(s.prenoms.split(' ')[0])} ${esc(s.nom)}</span><span class="small mut b">${esc(c ? c.name : '')}</span></span>${ic('chev', 20)}</a>`;
  }).join('')}<button class="btn2 sm" data-act="forget-codes" style="align-self:flex-start">Oublier ces fiches sur cet appareil</button></div>` : '';
  return `<div class="page"><div class="home-grid">
  <div class="col" style="gap:18px">
    <div class="row">${logo(48)}<span class="b" style="font-size:22px">Suivi</span><span class="grow"></span><a href="#/login" class="btn2 sm">Espace prof</a></div>
    <h1 style="font-size:clamp(34px,6vw,60px);line-height:1">Où en est<br>mon enfant ?</h1>
    <p class="mut b" style="font-weight:600;font-size:17px">Tapez le code donné par l’enseignant. Pas de compte, pas de mot de passe.</p>
    <form class="ck pad col" data-form="code" novalidate>
      <div class="field"><label class="lbl" for="code">Code de suivi</label>
      <input id="code" name="code" class="inp code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ex. CL2-YIB-KARIM-03052016-AB12" value="${esc(err || '')}" ${err ? 'aria-invalid="true" aria-describedby="code-err"' : ''}></div>
      ${err ? `<div id="code-err" class="err" role="alert">Aucune fiche ne correspond à ce code. Vérifiez les tirets et les chiffres, ou demandez le code à l’enseignant.</div>` : ''}
      <label class="check"><input type="checkbox" name="remember" checked>Se souvenir de ce code sur cet appareil</label>
      <button class="btn full">Voir la fiche ${ic('arrow', 20)}</button>
    </form>
    ${kids}
    <a href="#/installer" class="small">Installer l’app sur mon téléphone</a>
  </div>
  <div>${blobs()}</div>
  </div></div>`;
}
FORMS.code = (f, fd) => {
  const code = (fd.get('code') || '').trim();
  const st = d.byCode(code);
  if (!st) {
    lastError = code || ' ';
    if (location.hash === '#/') window.dispatchEvent(new Event('hashchange')); else location.hash = '#/';
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
const TABS = [['apercu', 'home', 'Aperçu'], ['coran', 'book', 'Coran'], ['langue', 'star', 'Langue'], ['presence', 'cal', 'Présence'], ['notes', 'note', 'Notes']];
let current = null;
export function fiche(code, tab = 'apercu') {
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
      <h2>Sourate en cours</h2>${F.enCoursCards(st, 'p-sour')}
      ${last ? `<div class="ck pad row between wrap"><div><div class="b">Dernier cours</div><div class="small mut b" style="font-weight:600;text-transform:capitalize">${flong(last.date)}</div></div>${pill(last.s === 'P' ? 'Présent' : last.s === 'A' ? 'Absent à ce cours' : 'Absent · prévenu', `var(--${last.s === 'P' ? 'present' : last.s === 'A' ? 'absent' : 'prev'})`, `var(--on${last.s === 'P' ? 'present' : last.s === 'A' ? 'absent' : 'prev'})`)}</div>` : ''}
      ${note ? `<div class="ck pad col" style="background:var(--ink);color:#fff;gap:6px"><span class="tiny b" style="color:var(--yellow)">DERNIÈRE NOTE · ${esc(fdate(note.at))}</span><span style="white-space:pre-wrap">${esc(note.text || 'Message vocal')}</span></div>` : ''}`;
  } else if (tab === 'coran') {
    body = `${F.coranHead(st)}${F.enCoursCards(st, 'p-sour')}<div class="ck pad col">${F.mushaf(st, 'p-sour')}${F.legend()}</div><p class="tiny mut">Touchez une sourate pour voir ses dates.</p>`;
  } else if (tab === 'langue') body = F.objectives(st, false);
  else if (tab === 'presence') body = F.presence(st);
  else body = F.notes(st, false);
  const desk = `<div class="seg desk" role="navigation" aria-label="Sections">${TABS.map(([id, , l]) => `<a href="${base}/${id}" class="${id === tab ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  const mob = `<nav class="tabbar" aria-label="Sections">${TABS.map(([id, i, l]) => `<a href="${base}/${id}" class="${id === tab ? 'on' : ''}"><span>${ic(i, 22)}</span>${l}</a>`).join('')}</nav>`;
  return `<div class="page">
  <div class="row between"><a href="#/" class="row" style="text-decoration:none;color:var(--ink)">${logo(36)}<span class="b">Suivi</span></a>${pill('Lecture seule', 'var(--neutral)')}</div>
  <div class="ck pad row">${av(initials(st), 60, 'var(--yellow)', 20)}<div class="grow"><h1 style="font-size:25px">${esc(st.prenoms)} ${esc(st.nom)}</h1>
  <div class="row wrap" style="gap:8px;margin-top:6px">${pill(esc(c ? c.name : ''), 'var(--blue2)')}<span class="small mut b">né(e) le ${fdate(st.naissance, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div></div></div>
  ${desk}<div class="col" style="gap:14px">${body}</div></div>${mob}`;
}
ACT['p-sour'] = (el) => {
  const n = +el.dataset.n;
  openModal(() => F.sourateSheet(current, n, false));
};
