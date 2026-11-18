// Gestion de l'association (admin) : locaux, heures des professeurs, familles & cotisations, finances
import * as d from './data.js';
import { locale } from './i18n.js';
import { ACT, FORMS, CHANGE, esc, ic, av, pill, fdate, toast, openModal, closeModal, refreshModal, todayISO, ask, askText, DAYS, ACC, initials, fullName , hero } from './ui.js';
import { shell } from './prof.js';
import { mosqueName } from './mosquee.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
const rerender = () => window.dispatchEvent(new Event('hashchange'));
const softRender = () => window.dispatchEvent(new CustomEvent('soft-render'));
const top = (title, sub, back, right = '') => `<div class="top">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div>${right}</div>`;
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const hh = (t) => (t || '').replace(/^0(\d)/, '$1').replace(':', 'h').replace(/h00$/, 'h');
export const eur = (n) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(+n || 0);
export const monthLabel = (m) => { const s = new Date(m + '-15T12:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : Math.round(x * 100) / 100; };

// =====================================================================
// LOCAUX
// =====================================================================
function usage() {
  const out = [];
  for (const c of d.D().classes) d.slotsOf(c).forEach((s, i) => { if (s.localId && d.local(s.localId)) out.push({ c, s, i }); });
  return out;
}
const endMin = (s) => (s.end ? d.toMin(s.end) : d.toMin(s.time) + 60);
// créneaux occupés d'un local un jour donné (les chevauchements sont signalés)
function blocks(day, lid, skip = null) {
  const items = usage().filter((x) => +x.s.day === day && x.s.localId === lid && !(skip && skip(x)))
    .map((x) => ({ a: d.toMin(x.s.time), b: endMin(x.s), names: [x.c.name], ids: [x.c.id], noEnd: !x.s.end })).sort((x, y) => x.a - y.a);
  const out = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && it.a < last.b) { last.b = Math.max(last.b, it.b); last.names.push(...it.names); last.ids.push(...it.ids); last.conflict = true; last.noEnd = last.noEnd || it.noEnd; }
    else out.push({ ...it });
  }
  return out;
}
function conflicts() {
  let n = 0;
  for (const day of ORDER) for (const l of d.D().locaux) n += blocks(day, l.id).filter((b) => b.conflict).length;
  return n;
}
export function locauxSummary() {
  return { n: d.D().locaux.length, used: usage().length, conflicts: conflicts(), days: ORDER.filter((day) => usage().some((x) => +x.s.day === day)).length };
}
// Grille générique : colonnes (salles ou jours) × lignes de 30 minutes, créneaux occupés en rouge
function range() {
  const all = usage();
  if (!all.length) return [9 * 60, 12 * 60];
  return [Math.floor(Math.min(...all.map((x) => d.toMin(x.s.time))) / 60) * 60, Math.ceil(Math.max(...all.map((x) => endMin(x.s))) / 60) * 60];
}
function grid(cols, lo, hi, live = true) {
  const rows = (hi - lo) / 30;
  const plan = cols.map((c) => {
    const bl = [];
    for (const b of c.blocks) {
      const rs = Math.max(0, Math.floor((b.a - lo) / 30)), re = Math.max(rs + 1, Math.ceil((b.b - lo) / 30));
      const last = bl[bl.length - 1];
      if (last && rs < last.re) { last.re = Math.max(last.re, re); last.names.push(...b.names); last.ids.push(...b.ids); last.b = Math.max(last.b, b.b); last.conflict = last.conflict || b.conflict; continue; }
      bl.push({ ...b, rs, re });
    }
    return bl;
  });
  let body = '';
  for (let r = 0; r < rows; r++) {
    const t = lo + r * 30;
    body += `<tr><th scope="row" class="lt-h">${t % 60 === 0 ? hh(d.fromMin(t)) : ''}</th>`;
    cols.forEach((c, ci) => {
      const b = plan[ci].find((x) => x.rs <= r && r < x.re);
      if (!b) { body += `<td class="lt-free" title="${esc(c.label)} libre à ${hh(d.fromMin(t))}"></td>`; return; }
      if (b.rs !== r) return;
      const one = [...new Set(b.ids)].length === 1;
      const inner = `<span class="b">${esc([...new Set(b.names)].join(' + '))}</span><span class="tiny">${hh(d.fromMin(b.a))} – ${hh(d.fromMin(b.b))}${b.noEnd ? ' (fin ?)' : ''}</span>${b.conflict ? `<span class="tiny b">${ic('alert', 12)} Conflit</span>` : ''}`;
      body += `<td class="lt-busy${b.conflict ? ' lt-conf' : ''}" rowspan="${b.re - b.rs}">${live ? `<button type="button" class="lt-btn" ${one ? `data-act="loc-edit" data-id="${b.ids[0]}"` : ''} aria-label="${esc(c.label)} : ${esc(b.names.join(', '))}">${inner}</button>` : `<div class="lt-btn">${inner}</div>`}</td>`;
    });
    body += '</tr>';
  }
  return `<div class="lt-wrap"><table class="lt"><thead><tr><th></th>${cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
// Rendu « agenda » : une colonne par jour (ou par salle), un trait par heure, chaque cours en bloc à la couleur de sa classe.
const DAY0 = 6 * 60, DAY1 = 24 * 60; // de 6h à minuit
const CLS_COL = { blue: '#9DB5FF', mint: '#6EE7B7', yellow: '#FFD400', pink: '#FF8FB1' };
function span() { const [lo, hi] = range(); return [Math.min(lo, DAY0), Math.max(hi, DAY1)]; }
function cal(cols, lo, hi, live = true, pph = 34) {
  const H = ((hi - lo) / 60) * pph;
  const hours = []; for (let t = lo; t <= hi; t += 60) hours.push(t);
  const axis = `<div class="cal-axis" style="height:${H}px">${hours.map((t) => `<span style="top:${((t - lo) / 60) * pph}px">${t === 24 * 60 ? '0h' : hh(d.fromMin(t))}</span>`).join('')}</div>`;
  const colsHtml = cols.map((c) => `<div class="cal-col"><div class="cal-head">${esc(c.label)}</div><div class="cal-body" style="height:${H}px;background-size:100% ${pph}px">${c.blocks.map((b) => {
    const top = ((b.a - lo) / 60) * pph, h = Math.max(18, ((b.b - b.a) / 60) * pph);
    const cl = d.cls(b.ids[0]);
    const bg = b.conflict ? '' : `background:${CLS_COL[(cl || {}).color] || CLS_COL.blue}`;
    const one = [...new Set(b.ids)].length === 1;
    const inner = `<span class="b">${esc([...new Set(b.names)].join(' + '))}</span><span class="cal-t">${hh(d.fromMin(b.a))} – ${hh(d.fromMin(b.b))}</span>${b.conflict ? `<span class="cal-t b">${ic('alert', 11)} Conflit</span>` : ''}`;
    return live && one ? `<button type="button" class="cal-ev${b.conflict ? ' lt-conf' : ''}" style="top:${top}px;height:${h}px;${bg}" data-act="loc-edit" data-id="${b.ids[0]}" aria-label="${esc(c.label)} : ${esc(b.names.join(', '))}">${inner}</button>`
      : `<div class="cal-ev${b.conflict ? ' lt-conf' : ''}" style="top:${top}px;height:${h}px;${bg}">${inner}</div>`;
  }).join('')}</div></div>`).join('');
  return `<div class="cal-wrap"><div class="cal"><div class="cal-col cal-axcol"><div class="cal-head"></div>${axis}</div>${colsHtml}</div></div>`;
}
const usedDays = () => ORDER.filter((day) => usage().some((x) => +x.s.day === day));
// vue par salle : une carte par salle, la semaine en colonnes
function roomCard(l, days, lo, hi, live = true) {
  const n = usage().filter((x) => x.s.localId === l.id).length;
  const cols = days.map((day) => ({ label: DAYS[day], blocks: blocks(day, l.id) }));
  return `<div class="ck pad col lt-card" style="gap:10px"><div class="row between wrap"><h2>${ic('door', 20)} ${esc(l.name)}</h2>${pill(n ? `${n} créneau(x) par semaine` : 'Libre toute la semaine', n ? 'var(--neutral)' : 'var(--present)')}</div>
  ${days.length ? cal(cols, lo, hi, live, live ? 34 : 15) : ''}</div>`;
}
// vue par jour : une carte par jour, les salles en colonnes
function dayCard(day, lo, hi, live = true) {
  const cols = d.D().locaux.map((l) => ({ label: l.name, blocks: blocks(day, l.id) }));
  return `<div class="ck pad col lt-card" style="gap:10px"><h2>${DAYS[day]}</h2>${cal(cols, lo, hi, live)}</div>`;
}
function freeList(day, a, b) {
  if (!(b > a)) return '<p class="small err">L’heure de fin doit être après l’heure de début.</p>';
  const res = d.D().locaux.map((l) => ({ l, busy: blocks(day, l.id).filter((x) => x.a < b && a < x.b) }));
  return `<div class="row wrap" style="gap:8px">${res.map(({ l, busy }) => busy.length
    ? pill(`${esc(l.name)} · occupé (${esc(busy.flatMap((x) => x.names).join(', '))})`, 'var(--absent)', 'var(--onabsent)')
    : pill(`${ic('check', 14)} ${esc(l.name)} · libre`, 'var(--present)', 'var(--onpresent)')).join('')}</div>`;
}
CHANGE['loc-find'] = () => {
  const day = +document.getElementById('lf-d').value, a = d.toMin(document.getElementById('lf-a').value), b = d.toMin(document.getElementById('lf-b').value);
  document.getElementById('lf-res').innerHTML = freeList(day, a, b);
};
export function locauxView(u, q) {
  const L = d.D().locaux;
  const v = q && q.get('v') === 'jour' ? 'jour' : 'salle';
  const days = usedDays();
  const [lo, hi] = span();
  const missing = d.D().classes.filter((c) => !d.slotsOf(c).length || d.slotsOf(c).some((s) => !s.localId || !d.local(s.localId)));
  const nconf = conflicts();
  const locRows = L.map((l) => {
    const n = usage().filter((x) => x.s.localId === l.id).length;
    return `<div class="li"><span class="av" style="width:40px;height:40px;background:var(--blue2)">${ic('door', 18)}</span><div class="grow"><div class="b">${esc(l.name)}</div><div class="small mut b" style="font-weight:600">${n ? `${n} créneau(x) par semaine` : 'Jamais utilisé'}</div></div>
    <button class="ib sm" data-act="loc-ren" data-id="${l.id}" aria-label="Renommer ${esc(l.name)}">${ic('edit', 16)}</button><button class="ib sm" data-act="loc-del" data-id="${l.id}" aria-label="Supprimer ${esc(l.name)}">${ic('trash', 16)}</button></div>`;
  }).join('');
  const listCard = `<div class="ck pad col" id="salles" style="box-shadow:5px 5px 0 var(--blue2)"><div class="row between"><h2 class="sec-t" style="margin:0">${ic('door', 24)} Les salles</h2>${pill(L.length + ' local(aux)', 'var(--neutral)')}</div>
    <p class="small mut b" style="font-weight:600">Ajoutez vos salles avec les noms que vous voulez (salle de prière, salle de classe, bureau, cuisine…).</p>
    <div class="list">${locRows || '<p class="small mut">Aucune salle pour le moment.</p>'}</div>
    <form class="row" data-form="loc-add"><label class="sr" for="la">Nom du local</label><input id="la" name="name" class="inp" placeholder="ex. Salle polyvalente" required><button class="btn sm">${ic('plus', 18)}Ajouter</button></form></div>`;
  const finder = `<div class="bcard col"><span class="w1-blob" aria-hidden="true"></span><h2>${ic('clock', 20)} Trouver un local libre</h2><p class="small b" style="font-weight:600;color:#DCE3FF">Ex. : un prof veut ouvrir une classe le samedi matin.</p>
    <div class="grid2" style="gap:8px"><div class="field" style="grid-column:1/-1"><label class="lbl" for="lf-d">Jour</label><select id="lf-d" class="inp" data-change="loc-find">${ORDER.map((k) => `<option value="${k}" ${k === 6 ? 'selected' : ''}>${DAYS[k]}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="lf-a">De</label><input id="lf-a" type="time" class="inp" value="09:00" data-change="loc-find"></div>
    <div class="field"><label class="lbl" for="lf-b">À</label><input id="lf-b" type="time" class="inp" value="12:00" data-change="loc-find"></div></div>
    <div id="lf-res">${freeList(6, 540, 720)}</div></div>`;
  return shell(u, 4, `<div class="page">${top('Locaux', 'Direction · emploi du temps des salles', '#/admin', L.length ? `<a class="btn sm" href="#/admin/locaux/pdf">${ic('dl', 18)}PDF</a>` : '')}
  ${hero('Locaux de la mosquée', `${L.length} salle(s)`, { sub: `${usage().length} créneau(x) par semaine${nconf ? ` · ${nconf} conflit(s)` : ''}`, chip: days.length ? days.length + ' j' : '', chipSub: days.length ? 'utilisés' : '', shadow: nconf ? 'var(--pink)' : 'var(--mint)' })}
  ${L.length ? finder : ''}
  ${L.length ? `<div class="row wrap between" style="gap:8px"><div class="seg" style="flex:1 1 260px"><a href="#/admin/locaux" class="${v === 'salle' ? 'on' : ''}">Par salle</a><a href="#/admin/locaux?v=jour" class="${v === 'jour' ? 'on' : ''}">Par jour</a></div>
  <div class="row wrap" style="gap:8px">${pill('&nbsp;', 'var(--present)')}<span class="small b">Libre</span>${pill('&nbsp;', 'var(--absent)')}<span class="small b">Pris</span></div></div>
  ${nconf ? `<div class="err">${ic('alert', 16)} ${nconf} conflit(s) : deux classes dans la même salle en même temps.</div>` : ''}
  <p class="small mut b" style="font-weight:600">Seuls les jours où une salle est utilisée sont affichés. Touchez un créneau rouge pour changer la salle ou l’horaire de la classe.</p>
  ${!days.length ? `<div class="ck pad col" style="background:var(--hi)"><h2>Aucun créneau pour le moment</h2><p class="b" style="font-weight:600">Indiquez pour chaque classe la salle utilisée (bouton « Local utilisé » sur la classe) : l’emploi du temps se remplit tout seul.</p></div>`
    : v === 'salle' ? L.map((l) => roomCard(l, days, lo, hi)).join('') : days.map((day) => dayCard(day, lo, hi)).join('')}` : ''}
  ${missing.length && L.length ? `<div class="ck pad col"><h2>Classes sans salle</h2><div class="list">${missing.map((c) => `<div class="li"><span class="grow b">${esc(c.name)}</span><button class="btn2 sm" data-act="loc-edit" data-id="${c.id}">${ic('door', 16)}Local utilisé</button></div>`).join('')}</div></div>` : ''}
  ${listCard}</div>`);
}
// ---------- PDF : emploi du temps de toutes les salles, à envoyer à qui veut réserver un créneau ----------
export function locauxPdf(u) {
  // toute la semaine, de 8h à 22h (au moins), pour que la personne voie aussi les jours entièrement libres
  const L = d.D().locaux, days = ORDER;
  const [lo, hi] = span();
  const now = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  return `<div class="page pdf"><div class="row between wrap noprint" style="gap:8px"><a class="btn2 sm" href="#/admin/locaux">${ic('back', 18)}Retour</a><button class="btn sm" data-act="print">${ic('dl', 18)}Enregistrer en PDF / imprimer</button></div>
  <p class="small mut b noprint" style="font-weight:600">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » (sur téléphone : Partager → Imprimer → PDF). Vous pouvez ensuite l’envoyer par e-mail ou WhatsApp.</p>
  <div class="col" style="gap:4px"><span class="b" style="font-size:26px">Emploi du temps des salles</span><span class="b" data-notr dir="auto">${esc(mosqueName())}</span><span class="small mut b">Au ${now} · de 6h à minuit · chaque bloc = un cours, à la couleur de sa classe · zone vide = salle libre</span></div>
  ${L.map((l) => roomCard(l, days, lo, hi, false)).join('')}
  ${!days.length ? '<p class="b">Aucune salle n’est encore utilisée : tous les créneaux sont libres.</p>' : ''}</div>`;
}
ACT.print = () => window.print();
FORMS['loc-add'] = (f, fd) => { const name = (fd.get('name') || '').trim(); if (!name) return; d.D().locaux.push({ id: d.uid(), name }); d.save(); toast('Local ajouté'); rerender(); };
ACT['loc-ren'] = (el) => { const l = d.local(el.dataset.id); const n = askText('Nouveau nom du local', l.name); if (n && n.trim()) { l.name = n.trim(); d.save(); rerender(); } };
ACT['loc-del'] = (el) => {
  const l = d.local(el.dataset.id);
  const n = usage().filter((x) => x.s.localId === l.id).length;
  if (!ask(`Supprimer ${l.name} ?${n ? `\n\n${n} créneau(x) de classe n’auront plus de local.` : ''}`)) return;
  d.D().classes.forEach((c) => (c.slots || []).forEach((s) => { if (s.localId === l.id) delete s.localId; }));
  d.D().locaux = d.D().locaux.filter((x) => x.id !== l.id); d.save(); rerender();
};

// ----- « Local utilisé » : choix du local et du créneau pour une classe -----
let lm = null;
function lmRow(s, i) {
  const day = +s.day, a = d.toMin(s.time), b = s.end ? d.toMin(s.end) : a + 60;
  const opts = d.D().locaux.map((l) => {
    const busy = blocks(day, l.id, (x) => x.c.id === lm.cid).filter((x) => x.a < b && a < x.b);
    return `<option value="${l.id}" ${s.localId === l.id ? 'selected' : ''}>${esc(l.name)}${busy.length ? ` — occupé (${esc(busy.flatMap((x) => x.names).join(', '))})` : ' — libre'}</option>`;
  }).join('');
  return `<fieldset class="ck flat pad col" style="margin:0;gap:10px"><legend class="lbl" style="padding:0 6px">Créneau ${i + 1}</legend>
  <div class="field"><label class="lbl" for="lm-l${i}">Local</label><select id="lm-l${i}" class="inp" data-change="lm" data-i="${i}" data-k="localId" style="background:var(--blue2)"><option value="">— Choisir un local —</option>${opts}</select></div>
  <div class="grid3" style="gap:8px"><div class="field"><label class="lbl" for="lm-d${i}">Jour</label><select id="lm-d${i}" class="inp" data-change="lm" data-i="${i}" data-k="day">${ORDER.map((k) => `<option value="${k}" ${day === k ? 'selected' : ''}>${DAYS[k]}</option>`).join('')}</select></div>
  <div class="field"><label class="lbl" for="lm-a${i}">Début</label><input id="lm-a${i}" type="time" class="inp" value="${s.time}" data-change="lm" data-i="${i}" data-k="time"></div>
  <div class="field"><label class="lbl" for="lm-b${i}">Fin</label><input id="lm-b${i}" type="time" class="inp" value="${s.end || ''}" data-change="lm" data-i="${i}" data-k="end"></div></div>
  ${lm.slots.length > 1 ? `<button type="button" class="btn2 sm" data-act="lm-rm" data-i="${i}" style="align-self:flex-start">${ic('trash', 16)}Retirer ce créneau</button>` : ''}</fieldset>`;
}
function lmModal() {
  const c = d.cls(lm.cid);
  openModal(() => `<div class="row between"><h2>Local utilisé · ${esc(c.name)}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <p class="small mut b" style="font-weight:600">Choisissez le local, le jour et les heures de début et de fin. Le planning des locaux et le compteur d’heures du professeur se remplissent tout seuls.</p>
  <div class="col" style="gap:10px">${lm.slots.map(lmRow).join('')}</div>
  <button type="button" class="btn2 sm" data-act="lm-add" style="align-self:flex-start">${ic('plus', 16)}Ajouter un créneau</button>
  <button type="button" class="btn full" data-act="lm-save">Enregistrer</button>`);
}
ACT['loc-edit'] = (el) => {
  const c = d.cls(el.dataset.id);
  if (!c) return;
  const sl = d.slotsOf(c).map((s) => ({ ...s }));
  lm = { cid: c.id, slots: sl.length ? sl : [{ day: 6, time: '10:00', end: '12:00' }] };
  lmModal();
};
CHANGE.lm = (el) => { const s = lm.slots[+el.dataset.i]; const k = el.dataset.k; s[k] = k === 'day' ? +el.value : el.value; if (k === 'localId' && !el.value) delete s.localId; refreshModal(); };
ACT['lm-add'] = () => { const l = lm.slots[lm.slots.length - 1]; lm.slots.push({ day: l ? l.day : 6, time: '10:00', end: '12:00' }); refreshModal(); };
ACT['lm-rm'] = (el) => { lm.slots.splice(+el.dataset.i, 1); refreshModal(); };
ACT['lm-save'] = () => {
  for (const s of lm.slots) {
    if (!s.time) { toast('Indiquez l’heure de début'); return; }
    if (s.end && d.toMin(s.end) <= d.toMin(s.time)) { toast('L’heure de fin doit être après l’heure de début'); return; }
  }
  const c = d.cls(lm.cid);
  delete c.day; delete c.time;
  c.slots = lm.slots.map((s) => ({ ...s }));
  d.save();
  const clash = c.slots.some((s) => s.localId && blocks(+s.day, s.localId).some((b) => b.conflict && b.ids.includes(c.id)));
  closeModal(); rerender();
  toast(clash ? 'Enregistré · attention : ce local est déjà utilisé sur ce créneau' : 'Local et horaires enregistrés');
};
export function localLine(c) {
  const ls = [...new Set(d.slotsOf(c).map((s) => s.localId && d.local(s.localId) ? d.local(s.localId).name : null).filter(Boolean))];
  return ls.length ? `Local : ${esc(ls.join(', '))}` : 'Local à renseigner';
}

// =====================================================================
// COMPTEUR D'HEURES DES PROFESSEURS (remis à zéro chaque 1er du mois)
// =====================================================================
export function hoursPill(p) {
  const h = d.profHours(p.id);
  return pill(`${ic('clock', 13)} ${d.fmtH(h.min)} ce mois`, 'var(--mint)');
}
export function hoursCard() {
  const m = d.curMonth();
  const P = d.staff(m);
  if (!P.length) return '';
  return `<div class="ck pad col"><div class="row between wrap"><h2>${ic('clock', 20)} Heures de cours</h2>${pill(monthLabel(m), 'var(--neutral)')}</div>
  <p class="small mut b" style="font-weight:600">Chaque appel terminé ajoute la durée du cours au compteur de <b>la personne qui a fait l’appel</b> (le prof, ou l’admin qui le remplace). Le compteur repart à zéro le 1er de chaque mois.</p>
  <div class="list">${P.map((p) => { const h = d.profHours(p.id, m); return `<button type="button" class="li" data-act="hours-detail" data-id="${p.id}" data-m="${m}" style="background:none;border:0;border-bottom:2px solid var(--neutral);width:100%;text-align:start;cursor:pointer;font:inherit;color:var(--ink)">${av(p.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 40, p.role === 'admin' ? 'var(--yellow)' : 'var(--blue2)', 13)}<div class="grow"><div class="b">${esc(p.name)}${p.role === 'admin' ? ' · admin' : ''}</div><div class="small mut b" style="font-weight:600">${h.n} cours${h.missing ? ` · ${h.missing} sans heure de fin` : ''} · voir le détail</div></div><span class="b" style="font-size:22px">${d.fmtH(h.min)}</span>${ic('chev', 18)}</button>`; }).join('')}</div></div>`;
}
// détail : quels appels, quand, quelle classe, quelle durée
ACT['hours-detail'] = (el) => {
  const p = d.user(el.dataset.id), m = el.dataset.m, h = d.profHours(p.id, m);
  openModal(() => `<div class="row between"><h2>${esc(p.name)} · ${monthLabel(m)}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <div class="ck flat pad row between" style="background:var(--mint)"><span class="b">${h.n} cours</span><span class="b" style="font-size:22px">${d.fmtH(h.min)}</span></div>
  <div class="list">${h.list.map(({ a, min }) => { const c = d.cls(a.classId) || {}; const own = c.profId === p.id; const t = a.at ? new Date(a.at) : null; const tag = d.isCompta(d.me()) ? 'div' : 'a';
    return `<${tag} class="li" ${tag === 'a' ? `href="#/prof/classe/${a.classId}/appel/${a.id}"` : ''} style="text-decoration:none;color:var(--ink)"><div class="grow"><div class="b">${fdate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="small mut b" style="font-weight:600">${esc(c.name || '')}${t && !isNaN(t) ? ` · appel à ${hh(String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'))}` : ''}${own ? '' : ` · remplacement (titulaire : ${esc((d.user(c.profId) || {}).name || '—')})`}</div></div><span class="b">${min ? d.fmtH(min) : 'durée ?'}</span></${tag}>`; }).join('') || '<p class="small mut">Aucun appel ce mois-ci.</p>'}</div>`);
};

// =====================================================================
// FAMILLES & COTISATIONS
// =====================================================================
export const PAY = { unpaid: ['Pas payé', 'var(--absent)', 'var(--onabsent)'], partial: ['Partiel', '#FF9F43', 'var(--ink)'], paid: ['Payé', 'var(--present)', 'var(--onpresent)'] };
function payBtn(f) {
  const [l, bg, fg] = PAY[f.status] || PAY.unpaid;
  const pct = f.cotisation ? Math.round((d.famPaid(f) / f.cotisation) * 100) : 0;
  return `<button type="button" class="btn2 sm" data-act="fam-pay" data-id="${f.id}" style="background:${bg};color:${fg}" aria-label="État du paiement : ${l}">${f.status === 'partial' ? `${l} · ${eur(d.famPaid(f))} (${pct} %)` : l}</button>`;
}
export function elevesSeg(on) {
  return `<div class="seg" role="navigation" aria-label="Vue"><a href="#/prof/eleves" class="${on === 0 ? 'on' : ''}">Tous les élèves</a><a href="#/prof/familles" class="${on === 1 ? 'on' : ''}">Familles &amp; cotisations</a></div>`;
}
export function famPill(s) {
  const f = s.familyId && d.family(s.familyId);
  return f ? ` · ${esc(f.name)}` : '';
}
export function famillesView(u) {
  if (!d.isAdmin(u)) { location.hash = '#/prof/eleves'; return null; }
  const F = d.D().families.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const lone = d.D().students.filter((s) => !s.familyId || !d.family(s.familyId)).sort((a, b) => a.nom.localeCompare(b.nom));
  const c = d.cotisations();
  const cards = F.map((f) => {
    const kids = d.familyKids(f.id);
    return `<div class="ck pad col fam" style="gap:10px" data-q="${esc((f.name + ' ' + kids.map((k) => k.prenoms + ' ' + k.nom + ' ' + k.parent).join(' ')).toLowerCase())}">
    <div class="row between wrap" style="gap:8px"><span class="b" style="font-size:18px">${esc(f.name)}</span><span class="row wrap" style="gap:6px"><button type="button" class="btn2 sm" data-act="fam-pay" data-id="${f.id}" aria-label="Cotisation : ${eur(f.cotisation)}">${ic('euro', 16)}${eur(f.cotisation)}</button>${payBtn(f)}<button class="ib sm" data-act="fam-edit" data-id="${f.id}" aria-label="Modifier ${esc(f.name)}">${ic('edit', 16)}</button></span></div>
    <div class="row wrap" style="gap:6px">${kids.map((k, i) => `<a class="pill" href="#/prof/eleve/${k.id}" style="background:${ACC[i % 4]};text-decoration:none">${esc(k.prenoms.split(' ')[0])} · ${esc(d.cls(k.classId).name)}</a>`).join('') || '<span class="small mut">Aucun enfant</span>'}</div></div>`;
  }).join('');
  return shell(u, 2, `<div class="page">${top('Élèves', `${F.length} famille(s) · ${d.D().students.length} élève(s)`, null, `<button class="btn sm" data-act="fam-new">${ic('plus', 18)}Famille</button>`)}
  ${elevesSeg(1)}
  ${(() => { const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0; return hero('Cotisations encaissées', eur(c.real), { sub: `sur ${eur(c.theo)} prévus · reste ${eur(c.rest)}`, chip: pct + ' %', shadow: 'var(--mint)', extra: `<div class="hero-bar"><span style="width:${pct}%"></span></div>` }); })()}
  <p class="small mut b" style="font-weight:600">Une famille regroupe les fiches des frères et sœurs déjà inscrits (pas de compte à créer). Bouton 1 : montant de la cotisation. Bouton 2 : où en est le paiement (rouge = rien, orange = en partie, vert = tout).</p>
  ${lone.length ? `<div class="ck pad col" style="background:var(--hi)"><div class="row between wrap"><h2>${lone.length} élève(s) sans famille</h2><button class="btn sm" data-act="fam-auto">${ic('users', 18)}Regrouper automatiquement</button></div>
    <p class="small b" style="font-weight:600">« Regrouper automatiquement » crée une famille par nom de famille + prénom du parent. Vous pourrez corriger ensuite.</p>
    <div class="list">${lone.map((s) => `<div class="li"><span class="grow"><span class="b" style="display:block">${esc(fullName(s))}</span><span class="small mut b" style="font-weight:600">${esc(d.cls(s.classId).name)} · Parent : ${esc(s.parent)}</span></span><button class="btn2 sm" data-act="fam-assign" data-sid="${s.id}">${ic('plus', 16)}Famille</button></div>`).join('')}</div></div>` : ''}
  <div class="field"><label class="sr" for="fq">Rechercher</label><input id="fq" class="inp" placeholder="Rechercher une famille, un enfant, un parent…" data-filter=".fam"></div>
  <div class="col">${cards || '<p class="mut">Aucune famille pour le moment.</p>'}</div></div>`);
}
let fm = null;
function famModal() {
  const all = d.D().students.slice().sort((a, b) => (fm.kids.has(b.id) - fm.kids.has(a.id)) || a.nom.localeCompare(b.nom));
  openModal(() => `<div class="row between"><h2>${fm.id ? 'Modifier la famille' : 'Nouvelle famille'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="fam">
  <div class="field"><label class="lbl" for="fn">Nom de la famille</label><input id="fn" name="name" class="inp" required value="${esc(fm.name)}" placeholder="ex. Famille Benali"></div>
  <div class="grid2"><div class="field"><label class="lbl" for="fc">① Cotisation (€)</label><input id="fc" name="cotisation" class="inp" inputmode="decimal" value="${fm.cotisation || ''}" placeholder="ex. 250"></div>
  <div class="field"><label class="lbl" for="fs">② Paiement</label><select id="fs" name="status" class="inp" data-change="fam-st">${Object.entries(PAY).map(([k, [l]]) => `<option value="${k}" ${fm.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <div class="field ${fm.status === 'partial' ? '' : 'hide'}" id="fpw"><label class="lbl" for="fp">Montant déjà versé (€)</label><input id="fp" name="paid" class="inp" inputmode="decimal" value="${fm.paid || ''}"></div>
  <fieldset class="ck flat pad col" style="margin:0;gap:8px"><legend class="lbl" style="padding:0 6px">Enfants de la famille</legend>
  <label class="sr" for="fkq">Rechercher un élève</label><input id="fkq" class="inp" placeholder="Rechercher un élève…" data-filter=".fk">
  <div class="col" style="gap:4px;max-height:260px;overflow:auto">${all.map((s) => { const of = s.familyId && s.familyId !== fm.id && d.family(s.familyId); return `<label class="row fk" style="gap:10px;cursor:pointer;padding:4px 2px" data-q="${esc((s.prenoms + ' ' + s.nom + ' ' + s.parent).toLowerCase())}"><input type="checkbox" name="kid" value="${s.id}" ${fm.kids.has(s.id) ? 'checked' : ''} style="width:22px;height:22px"><span class="grow small b">${esc(fullName(s))} <span class="mut" style="font-weight:600">· ${esc(d.cls(s.classId).name)} · Parent : ${esc(s.parent)}${of ? ` · déjà dans ${esc(of.name)}` : ''}</span></span></label>`; }).join('')}</div></fieldset>
  <button class="btn full">${fm.id ? 'Enregistrer' : 'Créer la famille'}</button>
  ${fm.id ? `<button type="button" class="btnd full" data-act="fam-del">${ic('trash', 18)}Supprimer la famille</button><p class="tiny mut b">Les élèves ne sont pas supprimés, seulement retirés de la famille.</p>` : ''}
  </form>`);
}
CHANGE['fam-st'] = (el) => document.getElementById('fpw').classList.toggle('hide', el.value !== 'partial');
ACT['fam-new'] = () => { fm = { id: null, name: '', cotisation: '', status: 'unpaid', paid: '', kids: new Set() }; famModal(); };
ACT['fam-edit'] = (el) => { const f = d.family(el.dataset.id); fm = { ...f, kids: new Set(d.familyKids(f.id).map((s) => s.id)) }; famModal(); };
ACT['fam-assign'] = (el) => {
  const s = d.student(el.dataset.sid);
  const same = d.D().families.find((f) => d.familyKids(f.id).some((k) => k.nom.toLowerCase() === s.nom.toLowerCase()));
  if (same) fm = { ...same, kids: new Set([...d.familyKids(same.id).map((k) => k.id), s.id]) };
  else fm = { id: null, name: 'Famille ' + s.nom, cotisation: '', status: 'unpaid', paid: '', kids: new Set([s.id]) };
  famModal();
};
FORMS.fam = (f, fd) => {
  const v = { name: (fd.get('name') || '').trim(), cotisation: num(fd.get('cotisation')), status: fd.get('status'), paid: num(fd.get('paid')) };
  let fam = fm.id && d.family(fm.id);
  if (!fam) { fam = { id: d.uid() }; d.D().families.push(fam); }
  Object.assign(fam, v);
  const kids = new Set(fd.getAll('kid'));
  d.D().students.forEach((s) => { if (kids.has(s.id)) s.familyId = fam.id; else if (s.familyId === fam.id) delete s.familyId; });
  d.save(); closeModal(); rerender(); toast('Famille enregistrée');
};
ACT['fam-del'] = () => {
  if (!ask(`Supprimer ${fm.name} ?`)) return;
  d.D().students.forEach((s) => { if (s.familyId === fm.id) delete s.familyId; });
  d.D().families = d.D().families.filter((x) => x.id !== fm.id);
  d.save(); closeModal(); rerender(); toast('Famille supprimée');
};
// bouton ② : paiement rapide
ACT['fam-pay'] = (el) => {
  const f = d.family(el.dataset.id);
  openModal(() => `<div class="row between"><h2>${esc(f.name)}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="fam-pay" data-id="${f.id}">
  <div class="field"><label class="lbl" for="pc">① Cotisation (€)</label><input id="pc" name="cotisation" class="inp" inputmode="decimal" value="${f.cotisation || ''}"></div>
  <fieldset style="border:0;padding:0;margin:0"><legend class="lbl">② Paiement</legend><div class="col" style="gap:8px">${Object.entries(PAY).map(([k, [l, bg, fg]]) => `<label class="ck flat row" style="gap:10px;padding:10px 12px;cursor:pointer;background:${bg};color:${fg}"><input type="radio" name="status" value="${k}" ${f.status === k ? 'checked' : ''} data-change="pay-st" style="width:22px;height:22px"><span class="b">${l}${k === 'unpaid' ? ' (0 %)' : k === 'paid' ? ' (100 %)' : ' (en cours)'}</span></label>`).join('')}</div></fieldset>
  <div class="field ${f.status === 'partial' ? '' : 'hide'}" id="ppw"><label class="lbl" for="pp">Montant déjà versé (€)</label><input id="pp" name="paid" class="inp" inputmode="decimal" value="${f.paid || ''}"></div>
  <button class="btn full">Enregistrer</button></form>`);
};
CHANGE['pay-st'] = (el) => document.getElementById('ppw').classList.toggle('hide', el.value !== 'partial');
FORMS['fam-pay'] = (f, fd) => {
  const fam = d.family(f.dataset.id);
  Object.assign(fam, { cotisation: num(fd.get('cotisation')), status: fd.get('status') || 'unpaid', paid: num(fd.get('paid')) });
  d.save(); closeModal(); softRender(); toast('Cotisation enregistrée');
};
ACT['fam-auto'] = () => {
  const lone = d.D().students.filter((s) => !s.familyId || !d.family(s.familyId));
  const key = (s) => (s.nom + '|' + s.parent).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const known = {};
  for (const s of d.D().students) if (s.familyId && d.family(s.familyId)) known[key(s)] = s.familyId;
  let created = 0;
  for (const s of lone) {
    if (!known[key(s)]) { const f = { id: d.uid(), name: 'Famille ' + s.nom, cotisation: 0, status: 'unpaid', paid: 0 }; d.D().families.push(f); known[key(s)] = f.id; created++; }
    s.familyId = known[key(s)];
  }
  d.save(); rerender(); toast(`${lone.length} élève(s) regroupé(s) · ${created} famille(s) créée(s)`);
};

// =====================================================================
// FINANCES (Direction → Finances) : recettes et dépenses
// =====================================================================
export function financeTile() {
  const s = d.financeSummary();
  const up = s.solde >= 0;
  return `<a href="#/compta" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:${up ? 'var(--mint)' : 'var(--pink)'}"><span class="row between"><span class="b" style="font-size:18px">${ic('euro', 20)} Finances</span>${ic('chev', 18)}</span>
  <span class="row wrap" style="gap:4px 8px;align-items:baseline"><span style="font-size:clamp(22px,6vw,28px);font-weight:800">${up ? '▲' : '▼'} ${eur(s.solde)}</span><span class="small b">solde</span></span>
  <span class="small b" style="font-weight:600">Recettes ${eur(s.rec)} · Dépenses ${eur(s.dep)} · dons, zakat, loyer, énergie…</span></a>`;
}
export function locauxTile() {
  const s = locauxSummary();
  return `<a href="#/admin/locaux" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:var(--blue2)"><span class="row between"><span class="b" style="font-size:18px">${ic('door', 20)} Locaux</span>${ic('chev', 18)}</span>
  <span style="font-size:28px;font-weight:800">${s.n} local(aux)</span>
  <span class="small b" style="font-weight:600">${s.used} créneau(x) occupé(s) sur ${s.days} jour(s)${s.conflicts ? ` · ${ic('alert', 13)} ${s.conflicts} conflit(s)` : ''}</span></a>`;
}
// formulaire commun recette / dépense
export function entryForm(kind, m, cats) {
  const p = kind === 'inc' ? 'i' : 'e';
  return `<form class="col" data-form="${kind}-add"><div class="grid2 stack">
  <div class="field"><label class="lbl" for="${p}c">Catégorie</label><select id="${p}c" name="cat" class="inp">${cats.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
  <div class="field"><label class="lbl" for="${p}l">Intitulé (facultatif)</label><input id="${p}l" name="label" class="inp" placeholder="${kind === 'inc' ? 'ex. Quête du 14 novembre, don de M. X…' : 'ex. Facture Engie novembre…'}"></div></div>
  <div class="grid2"><div class="field"><label class="lbl" for="${p}a">Montant (€)</label><input id="${p}a" name="amount" class="inp" inputmode="decimal" required></div><div class="field"><label class="lbl" for="${p}d">Date</label><input id="${p}d" name="date" type="date" class="inp" value="${m === d.curMonth() ? todayISO() : m + '-01'}" required></div></div>
  <label class="row small b" style="gap:8px;cursor:pointer"><input type="checkbox" name="monthly" style="width:20px;height:20px">Tous les mois (${kind === 'inc' ? 'don récurrent, prélèvement automatique' : 'loyer, électricité, assurance…'})</label>
  <button class="btn sm" style="align-self:flex-start">${ic('plus', 18)}${kind === 'inc' ? 'Ajouter la recette' : 'Ajouter la dépense'}</button></form>`;
}
export function entryList(items, cats, del) {
  if (!items.length) return '<p class="small mut">Rien pour ce mois-ci.</p>';
  return byCat(items, cats).map(({ k, l, total }) => `<div class="col" style="gap:0"><div class="row between" style="padding:10px 0 4px"><span class="b">${l}</span><span class="b">${eur(total)}</span></div>
  ${items.filter((x) => (cats.some((c) => c[0] === x.cat) ? x.cat : 'autre') === k).sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<div class="li" style="padding-left:12px"><div class="grow"><div class="small b">${esc(x.label || l)}</div><div class="tiny mut b">${x.monthly ? `chaque mois depuis ${fdate(x.date, { month: 'long', year: 'numeric' })}` : fdate(x.date, { day: 'numeric', month: 'long' })}</div></div><span class="small b">${eur(x.amount)}</span><button class="ib sm" data-act="${del}" data-id="${x.id}" aria-label="Supprimer">${ic('trash', 16)}</button></div>`).join('')}</div>`).join('');
}
const byCat = (items, cats) => d.byCat(items, cats);
FORMS['inc-add'] = (f, fd) => {
  const amount = num(fd.get('amount'));
  if (!amount) { toast('Indiquez un montant'); return; }
  d.D().finance.incomes.push({ id: d.uid(), cat: fd.get('cat'), label: (fd.get('label') || '').trim(), amount, date: fd.get('date'), monthly: !!fd.get('monthly') });
  d.save(); toast('Recette ajoutée'); closeModal(); rerender();
};
ACT['inc-del'] = (el) => { if (!ask('Supprimer cette recette ?')) return; d.D().finance.incomes = d.D().finance.incomes.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
export function teacherRows(m) {
  const fin = d.D().finance;
  const ov = fin.overrides[m] || {};
  const rows = d.staff(m).map((p) => {
    const h = d.profHours(p.id, m);
    const auto = Math.round((h.min / 60) * d.profRate(p) * 100) / 100;
    return `<div class="ck flat pad col" style="gap:8px"><div class="row between wrap"><span class="b">${esc(p.name)}${p.role === 'admin' ? ' (admin)' : ''}</span><span class="b" style="font-size:20px">${eur(d.profCost(p, m))}</span></div>
    <div class="small b" style="font-weight:600">${ic('clock', 14)} ${d.fmtH(h.min)} (${h.n} cours)${h.missing ? ` · ${h.missing} cours sans heure de fin` : ''} × ${eur(d.profRate(p))}/h = ${eur(auto)}</div>
    <div class="grid2"><div class="field"><label class="lbl" for="pr-${p.id}">Taux horaire (€)</label><input id="pr-${p.id}" class="inp" inputmode="decimal" value="${p.rate ?? ''}" placeholder="${fin.rate} (par défaut)" data-change="fin-prate" data-id="${p.id}"></div>
    <div class="field"><label class="lbl" for="po-${p.id}">Montant retenu (€)</label><input id="po-${p.id}" class="inp" inputmode="decimal" value="${ov[p.id] ?? ''}" placeholder="${auto} (calcul auto)" data-change="fin-ov" data-id="${p.id}" data-m="${m}"></div></div></div>`;
  }).join('');
  return `<p class="small mut b" style="font-weight:600">Calcul automatique : heures du compteur (appels faits par chaque personne, remplacements compris) × taux horaire. Laissez « Montant retenu » vide pour garder le calcul, ou tapez un autre montant. Mettez le taux à 0 pour un bénévole.</p>
  <div class="field" style="max-width:260px"><label class="lbl" for="fr">Taux horaire par défaut (€)</label><input id="fr" class="inp" inputmode="decimal" value="${fin.rate}" data-change="fin-rate"></div>
  ${rows || '<p class="small mut">Aucun enseignant.</p>'}`;
}
CHANGE['fin-rate'] = (el) => { d.D().finance.rate = num(el.value); d.save(); softRender(); };
CHANGE['fin-prate'] = (el) => { const p = d.user(el.dataset.id); if (el.value.trim() === '') delete p.rate; else p.rate = num(el.value); d.save(); softRender(); };
CHANGE['fin-ov'] = (el) => {
  const o = (d.D().finance.overrides[el.dataset.m] = d.D().finance.overrides[el.dataset.m] || {});
  if (el.value.trim() === '') delete o[el.dataset.id]; else o[el.dataset.id] = num(el.value);
  d.save(); softRender();
};
FORMS['exp-add'] = (f, fd) => {
  const amount = num(fd.get('amount'));
  if (!amount) { toast('Indiquez un montant'); return; }
  d.D().finance.expenses.push({ id: d.uid(), cat: fd.get('cat'), label: (fd.get('label') || '').trim(), amount, date: fd.get('date'), monthly: !!fd.get('monthly') });
  d.save(); toast('Dépense ajoutée');
  closeModal(); rerender();
};
ACT['exp-del'] = (el) => { if (!ask('Supprimer cette dépense ?')) return; d.D().finance.expenses = d.D().finance.expenses.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
