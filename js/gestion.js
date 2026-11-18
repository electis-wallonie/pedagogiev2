// Gestion de l'association (admin) : locaux, heures des professeurs, familles & cotisations, finances
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, av, pill, fdate, toast, openModal, closeModal, refreshModal, todayISO, ask, askText, DAYS, ACC, initials, fullName } from './ui.js';
import { shell } from './prof.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
const rerender = () => window.dispatchEvent(new Event('hashchange'));
const softRender = () => window.dispatchEvent(new CustomEvent('soft-render'));
const top = (title, sub, back, right = '') => `<div class="top">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div>${right}</div>`;
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const hh = (t) => (t || '').replace(/^0(\d)/, '$1').replace(':', 'h').replace(/h00$/, 'h');
export const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(+n || 0);
const monthLabel = (m) => { const s = new Date(m + '-15T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
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
function dayTable(day) {
  const L = d.D().locaux;
  const all = usage().filter((x) => +x.s.day === day);
  const lo = Math.floor(Math.min(...all.map((x) => d.toMin(x.s.time))) / 60) * 60;
  const hi = Math.ceil(Math.max(...all.map((x) => endMin(x.s))) / 60) * 60;
  const rows = (hi - lo) / 30;
  // découpe en lignes de 30 minutes
  const plan = L.map((l) => {
    const bl = [];
    for (const b of blocks(day, l.id)) {
      let rs = Math.floor((b.a - lo) / 30), re = Math.max(rs + 1, Math.ceil((b.b - lo) / 30));
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
    L.forEach((l, li) => {
      const b = plan[li].find((x) => x.rs <= r && r < x.re);
      if (!b) { body += `<td class="lt-free" title="${esc(l.name)} libre à ${hh(d.fromMin(t))}"></td>`; return; }
      if (b.rs !== r) return;
      const one = [...new Set(b.ids)].length === 1;
      body += `<td class="lt-busy${b.conflict ? ' lt-conf' : ''}" rowspan="${b.re - b.rs}"><button type="button" class="lt-btn" ${one ? `data-act="loc-edit" data-id="${b.ids[0]}"` : ''} aria-label="${esc(l.name)} : ${esc(b.names.join(', '))}"><span class="b">${esc([...new Set(b.names)].join(' + '))}</span><span class="tiny">${hh(d.fromMin(b.a))} – ${hh(d.fromMin(b.b))}${b.noEnd ? ' (fin ?)' : ''}</span>${b.conflict ? `<span class="tiny b">${ic('alert', 12)} Conflit</span>` : ''}</button></td>`;
    });
    body += '</tr>';
  }
  return `<div class="ck pad col" style="gap:10px"><h2>${DAYS[day]}</h2><div class="lt-wrap"><table class="lt"><thead><tr><th></th>${L.map((l) => `<th scope="col">${esc(l.name)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></div>`;
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
export function locauxView(u) {
  const L = d.D().locaux;
  const days = ORDER.filter((day) => usage().some((x) => +x.s.day === day));
  const missing = d.D().classes.filter((c) => !d.slotsOf(c).length || d.slotsOf(c).some((s) => !s.localId || !d.local(s.localId)));
  const nconf = conflicts();
  const locRows = L.map((l) => {
    const n = usage().filter((x) => x.s.localId === l.id).length;
    return `<div class="li"><span class="av" style="width:40px;height:40px;background:var(--blue2)">${ic('door', 18)}</span><div class="grow"><div class="b">${esc(l.name)}</div><div class="small mut b" style="font-weight:600">${n ? `${n} créneau(x) par semaine` : 'Jamais utilisé'}</div></div>
    <button class="ib sm" data-act="loc-ren" data-id="${l.id}" aria-label="Renommer ${esc(l.name)}">${ic('edit', 16)}</button><button class="ib sm" data-act="loc-del" data-id="${l.id}" aria-label="Supprimer ${esc(l.name)}">${ic('trash', 16)}</button></div>`;
  }).join('');
  return shell(u, 4, `<div class="page">${top('Locaux', 'Direction · disponibilité de la semaine', '#/admin')}
  <div class="row wrap" style="gap:8px">${pill('&nbsp;', 'var(--present)')}<span class="small b">Libre</span>${pill('&nbsp;', 'var(--absent)')}<span class="small b">Utilisé</span>${nconf ? pill(`${ic('alert', 14)} ${nconf} conflit(s) : deux classes dans le même local en même temps`, 'var(--yellow)') : ''}</div>
  <p class="small mut b" style="font-weight:600">Seuls les jours où au moins un local est utilisé sont affichés. Touchez un créneau rouge pour changer le local ou l’horaire de la classe.</p>
  ${days.length ? days.map(dayTable).join('') : `<div class="ck pad col" style="background:var(--hi)"><h2>Aucun local renseigné</h2><p class="b" style="font-weight:600">Indiquez pour chaque classe le local utilisé et ses horaires : le planning se remplit tout seul.</p></div>`}
  ${missing.length ? `<div class="ck pad col"><h2>Classes sans local</h2><div class="list">${missing.map((c) => `<div class="li"><span class="grow b">${esc(c.name)}</span><button class="btn2 sm" data-act="loc-edit" data-id="${c.id}">${ic('door', 16)}Local utilisé</button></div>`).join('')}</div></div>` : ''}
  <div class="grid2 stack" style="align-items:start">
  <div class="ck pad col"><h2>${ic('clock', 20)} Trouver un local libre</h2><p class="small mut b" style="font-weight:600">Ex. : un prof veut ouvrir une classe le samedi matin.</p>
    <div class="grid3" style="gap:8px"><div class="field"><label class="lbl" for="lf-d">Jour</label><select id="lf-d" class="inp" data-change="loc-find">${ORDER.map((k) => `<option value="${k}" ${k === 6 ? 'selected' : ''}>${DAYS[k]}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="lf-a">De</label><input id="lf-a" type="time" class="inp" value="09:00" data-change="loc-find"></div>
    <div class="field"><label class="lbl" for="lf-b">À</label><input id="lf-b" type="time" class="inp" value="12:00" data-change="loc-find"></div></div>
    <div id="lf-res">${freeList(6, 540, 720)}</div></div>
  <div class="ck pad col"><div class="row between"><h2>Liste des locaux</h2>${pill(L.length + ' local(aux)', 'var(--neutral)')}</div>
    <div class="list">${locRows || '<p class="small mut">Aucun local.</p>'}</div>
    <form class="row" data-form="loc-add"><label class="sr" for="la">Nom du local</label><input id="la" name="name" class="inp" placeholder="ex. Salle polyvalente" required><button class="btn sm">${ic('plus', 18)}Ajouter</button></form></div>
  </div></div>`);
}
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
  <div class="list">${h.list.map(({ a, min }) => { const c = d.cls(a.classId) || {}; const own = c.profId === p.id; const t = a.at ? new Date(a.at) : null; return `<a class="li" href="#/prof/classe/${a.classId}/appel/${a.id}" style="text-decoration:none;color:var(--ink)"><div class="grow"><div class="b">${fdate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="small mut b" style="font-weight:600">${esc(c.name || '')}${t && !isNaN(t) ? ` · appel à ${hh(String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'))}` : ''}${own ? '' : ` · remplacement (titulaire : ${esc((d.user(c.profId) || {}).name || '—')})`}</div></div><span class="b">${min ? d.fmtH(min) : 'durée ?'}</span></a>`; }).join('') || '<p class="small mut">Aucun appel ce mois-ci.</p>'}</div>`);
};

// =====================================================================
// FAMILLES & COTISATIONS
// =====================================================================
const PAY = { unpaid: ['Pas payé', 'var(--absent)', 'var(--onabsent)'], partial: ['Partiel', '#FF9F43', 'var(--ink)'], paid: ['Payé', 'var(--present)', 'var(--onpresent)'] };
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
    <div class="row between wrap" style="gap:8px"><span class="b" style="font-size:18px">${esc(f.name)}</span><span class="row" style="gap:6px"><button type="button" class="btn2 sm" data-act="fam-pay" data-id="${f.id}" aria-label="Cotisation : ${eur(f.cotisation)}">${ic('euro', 16)}${eur(f.cotisation)}</button>${payBtn(f)}<button class="ib sm" data-act="fam-edit" data-id="${f.id}" aria-label="Modifier ${esc(f.name)}">${ic('edit', 16)}</button></span></div>
    <div class="row wrap" style="gap:6px">${kids.map((k, i) => `<a class="pill" href="#/prof/eleve/${k.id}" style="background:${ACC[i % 4]};text-decoration:none">${esc(k.prenoms.split(' ')[0])} · ${esc(d.cls(k.classId).name)}</a>`).join('') || '<span class="small mut">Aucun enfant</span>'}</div></div>`;
  }).join('');
  return shell(u, 2, `<div class="page">${top('Élèves', `${F.length} famille(s) · ${d.D().students.length} élève(s)`, null, `<button class="btn sm" data-act="fam-new">${ic('plus', 18)}Famille</button>`)}
  ${elevesSeg(1)}
  <div class="grid3"><div class="ck stat" style="background:var(--blue2)"><div class="v" style="font-size:24px">${eur(c.theo)}</div><div class="l">cotisations prévues</div></div><div class="ck stat" style="background:var(--mint)"><div class="v" style="font-size:24px">${eur(c.real)}</div><div class="l">déjà payées</div></div><div class="ck stat" style="background:var(--pink)"><div class="v" style="font-size:24px">${eur(c.rest)}</div><div class="l">reste à payer</div></div></div>
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
  return `<a href="#/admin/finances" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:${up ? 'var(--mint)' : 'var(--pink)'}"><span class="row between"><span class="b" style="font-size:18px">${ic('euro', 20)} Finances</span>${ic('chev', 18)}</span>
  <span class="row" style="gap:8px;align-items:baseline"><span style="font-size:28px;font-weight:800">${up ? '▲' : '▼'} ${eur(s.solde)}</span><span class="small b">solde</span></span>
  <span class="small b" style="font-weight:600">Recettes encaissées ${eur(s.rec)} · Dépenses ${eur(s.dep)}</span></a>`;
}
export function locauxTile() {
  const s = locauxSummary();
  return `<a href="#/admin/locaux" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:var(--blue2)"><span class="row between"><span class="b" style="font-size:18px">${ic('door', 20)} Locaux</span>${ic('chev', 18)}</span>
  <span style="font-size:28px;font-weight:800">${s.n} local(aux)</span>
  <span class="small b" style="font-weight:600">${s.used} créneau(x) occupé(s) sur ${s.days} jour(s)${s.conflicts ? ` · ${ic('alert', 13)} ${s.conflicts} conflit(s)` : ''}</span></a>`;
}
export function financesView(u, q) {
  const t = q.get('t') === 'dep' ? 'dep' : 'rec';
  const s = d.financeSummary();
  const up = s.solde >= 0;
  const recap = `<div class="ck pad col" style="gap:8px;background:var(--ink);color:#fff"><div class="tiny b" style="color:var(--yellow)">RÉCAPITULATIF</div>
  <div class="row wrap" style="gap:10px;align-items:baseline"><span style="font-size:34px;font-weight:800;color:${up ? 'var(--mint)' : 'var(--absent)'}">${up ? '▲' : '▼'} ${eur(s.solde)}</span><span class="b">solde</span></div>
  <div class="row wrap small b" style="gap:16px"><span>${ic('plus', 14)} Recettes encaissées : ${eur(s.rec)}</span><span>− Dépenses : ${eur(s.dep)}</span></div></div>`;
  const seg = `<div class="seg" role="navigation" aria-label="Finances"><a href="#/admin/finances?t=rec" class="${t === 'rec' ? 'on' : ''}">Recettes</a><a href="#/admin/finances?t=dep" class="${t === 'dep' ? 'on' : ''}">Dépenses</a></div>`;
  return shell(u, 4, `<div class="page">${top('Finances', 'Direction · trésorerie', '#/admin')}${recap}${seg}${t === 'rec' ? recettes() : depenses(q)}</div>`);
}
function recettes() {
  const c = d.cotisations();
  const F = d.D().families;
  const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0;
  const cnt = (k) => F.filter((f) => f.status === k).length;
  const inc = d.D().finance.incomes.slice().sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="ck pad col"><div class="row between wrap"><h2>${ic('users', 20)} Cotisations des familles</h2><a class="btn2 sm" href="#/prof/familles">Gérer les familles</a></div>
  <div class="grid2"><div class="ck flat pad col" style="gap:2px"><span class="small b mut">Théorique (à payer)</span><span class="b" style="font-size:24px">${eur(c.theo)}</span></div><div class="ck flat pad col" style="gap:2px;background:var(--mint)"><span class="small b">Réelle (déjà payée)</span><span class="b" style="font-size:24px">${eur(c.real)}</span></div></div>
  <div class="prog" role="img" aria-label="${pct} % payé"><span style="width:${pct}%"></span></div>
  <div class="row wrap" style="gap:8px">${pill(`${pct} % encaissé`, 'var(--neutral)')}${pill(`${cnt('paid')} payé`, PAY.paid[1], PAY.paid[2])}${pill(`${cnt('partial')} partiel`, PAY.partial[1])}${pill(`${cnt('unpaid')} pas payé`, PAY.unpaid[1], PAY.unpaid[2])}${pill(`Reste ${eur(c.rest)}`, 'var(--hi)')}</div>
  ${F.length ? '' : '<p class="small mut b">Aucune famille : créez les familles dans Élèves → Familles &amp; cotisations.</p>'}</div>
  <div class="ck pad col"><h2>${ic('plus', 20)} Autres recettes (dons…)</h2>
  <form class="col" data-form="inc-add"><div class="grid2 stack"><div class="field"><label class="lbl" for="il">Intitulé</label><input id="il" name="label" class="inp" required placeholder="ex. Don de M. X"></div>
  <div class="grid2"><div class="field"><label class="lbl" for="ia">Montant (€)</label><input id="ia" name="amount" class="inp" inputmode="decimal" required></div><div class="field"><label class="lbl" for="idt">Date</label><input id="idt" name="date" type="date" class="inp" value="${todayISO()}" required></div></div></div>
  <label class="row small b" style="gap:8px;cursor:pointer"><input type="checkbox" name="monthly" style="width:20px;height:20px">Tous les mois (prélèvement automatique / don récurrent)</label>
  <button class="btn sm" style="align-self:flex-start">${ic('plus', 18)}Ajouter la recette</button></form>
  <div class="list">${inc.map((i) => `<div class="li"><div class="grow"><div class="b">${esc(i.label)}</div><div class="small mut b" style="font-weight:600">${fdate(i.date, { day: 'numeric', month: 'long', year: 'numeric' })}${i.monthly ? ' · chaque mois' : ''}</div></div><span class="b">${eur(i.amount)}${i.monthly ? '/mois' : ''}</span><button class="ib sm" data-act="inc-del" data-id="${i.id}" aria-label="Supprimer">${ic('trash', 16)}</button></div>`).join('') || '<p class="small mut">Aucune autre recette.</p>'}</div>
  ${inc.length ? `<div class="row between b"><span>Total encaissé (autres recettes)</span><span>${eur(d.incomeTotal())}</span></div>` : ''}</div>`;
}
FORMS['inc-add'] = (f, fd) => {
  const amount = num(fd.get('amount'));
  if (!amount) { toast('Indiquez un montant'); return; }
  d.D().finance.incomes.push({ id: d.uid(), label: (fd.get('label') || '').trim(), amount, date: fd.get('date'), monthly: !!fd.get('monthly') });
  d.save(); toast('Recette ajoutée'); rerender();
};
ACT['inc-del'] = (el) => { if (!ask('Supprimer cette recette ?')) return; d.D().finance.incomes = d.D().finance.incomes.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
function depenses(q) {
  const months = d.financeMonths();
  const m = months.includes(q.get('m')) ? q.get('m') : d.curMonth();
  const i = months.indexOf(m);
  const fin = d.D().finance;
  const ov = fin.overrides[m] || {};
  const tot = d.monthExpenses(m);
  const ex = fin.expenses.filter((e) => d.monthOf(e.date) === m).sort((a, b) => b.date.localeCompare(a.date));
  const nav = `<div class="row between"><a class="ib ${i < months.length - 1 ? '' : 'hide'}" href="#/admin/finances?t=dep&m=${months[i + 1]}" aria-label="Mois précédent">${ic('back', 20)}</a><span class="b" style="font-size:20px">${monthLabel(m)}${m === d.curMonth() ? ' · en cours' : ''}</span><a class="ib ${i > 0 ? '' : 'hide'}" href="#/admin/finances?t=dep&m=${months[i - 1]}" aria-label="Mois suivant">${ic('chev', 20)}</a></div>`;
  const rows = d.staff(m).map((p) => {
    const h = d.profHours(p.id, m);
    const auto = Math.round((h.min / 60) * d.profRate(p) * 100) / 100;
    return `<div class="ck flat pad col" style="gap:8px"><div class="row between wrap"><span class="b">Fourniture · ${esc(p.name)}${p.role === 'admin' ? ' (admin)' : ''}</span><span class="b" style="font-size:20px">${eur(d.profCost(p, m))}</span></div>
    <div class="small b" style="font-weight:600">${ic('clock', 14)} ${d.fmtH(h.min)} (${h.n} cours)${h.missing ? ` · ${h.missing} cours sans heure de fin` : ''} × ${eur(d.profRate(p))}/h = ${eur(auto)}</div>
    <div class="grid2"><div class="field"><label class="lbl" for="pr-${p.id}">Taux horaire de ${esc(p.name)} (€)</label><input id="pr-${p.id}" class="inp" inputmode="decimal" value="${p.rate ?? ''}" placeholder="${fin.rate} (par défaut)" data-change="fin-prate" data-id="${p.id}"></div>
    <div class="field"><label class="lbl" for="po-${p.id}">Montant retenu (€)</label><input id="po-${p.id}" class="inp" inputmode="decimal" value="${ov[p.id] ?? ''}" placeholder="${auto} (calcul auto)" data-change="fin-ov" data-id="${p.id}" data-m="${m}"></div></div></div>`;
  }).join('');
  return `${nav}
  <div class="ck pad col"><div class="row between wrap"><h2>${ic('users', 20)} Professeurs</h2><span class="b">${eur(tot.profs)}</span></div>
  <p class="small mut b" style="font-weight:600">Calcul automatique : heures du compteur (appels terminés par chaque personne, remplacements compris) × taux horaire. Laissez « Montant retenu » vide pour garder le calcul, ou tapez un autre montant.</p>
  <div class="field" style="max-width:260px"><label class="lbl" for="fr">Taux horaire par défaut (€)</label><input id="fr" class="inp" inputmode="decimal" value="${fin.rate}" data-change="fin-rate"></div>
  <div class="col" style="gap:10px">${rows || '<p class="small mut">Aucun professeur.</p>'}</div></div>
  <div class="ck pad col"><div class="row between wrap"><h2>${ic('note', 20)} Autres dépenses</h2><span class="b">${eur(tot.other)}</span></div>
  <form class="col" data-form="exp-add" data-m="${m}"><div class="grid2 stack"><div class="field"><label class="lbl" for="el">Intitulé</label><input id="el" name="label" class="inp" required placeholder="ex. Fournitures, chauffage…"></div>
  <div class="grid2"><div class="field"><label class="lbl" for="ea">Montant (€)</label><input id="ea" name="amount" class="inp" inputmode="decimal" required></div><div class="field"><label class="lbl" for="ed">Date</label><input id="ed" name="date" type="date" class="inp" value="${m === d.curMonth() ? todayISO() : m + '-01'}" required></div></div></div>
  <button class="btn sm" style="align-self:flex-start">${ic('plus', 18)}Ajouter une dépense</button></form>
  <div class="list">${ex.map((e) => `<div class="li"><div class="grow"><div class="b">${esc(e.label)}</div><div class="small mut b" style="font-weight:600">${fdate(e.date, { day: 'numeric', month: 'long' })}</div></div><span class="b">${eur(e.amount)}</span><button class="ib sm" data-act="exp-del" data-id="${e.id}" aria-label="Supprimer">${ic('trash', 16)}</button></div>`).join('') || '<p class="small mut">Aucune autre dépense ce mois-ci.</p>'}</div></div>
  <div class="ck pad row between" style="background:var(--yellow)"><span class="b" style="font-size:18px">Total des dépenses · ${monthLabel(m)}</span><span class="b" style="font-size:24px">${eur(tot.total)}</span></div>
  <div class="ck pad col"><h2>${ic('clock', 20)} Historique</h2><div class="list">${months.map((x) => `<a class="li" href="#/admin/finances?t=dep&m=${x}" style="text-decoration:none;color:var(--ink)"><span class="grow b">${monthLabel(x)}${x === m ? ' ★' : ''}</span><span class="b">${eur(d.monthExpenses(x).total)}</span>${ic('chev', 18)}</a>`).join('')}</div></div>`;
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
  d.D().finance.expenses.push({ id: d.uid(), label: (fd.get('label') || '').trim(), amount, date: fd.get('date') });
  d.save(); toast('Dépense ajoutée');
  go(`#/admin/finances?t=dep&m=${d.monthOf(fd.get('date'))}`);
};
ACT['exp-del'] = (el) => { if (!ask('Supprimer cette dépense ?')) return; d.D().finance.expenses = d.D().finance.expenses.filter((x) => x.id !== el.dataset.id); d.save(); rerender(); };
