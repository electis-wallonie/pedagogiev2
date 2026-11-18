// Espace professeur : classes, élèves, appel, Coran, objectifs, notes, réglages
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, av, pill, fdate, flong, fshort, toast, openModal, closeModal, refreshModal, copyText, todayISO, daysSince,
  STATUS, COLORS, COLOR_NAMES, ACC, DAYS, schedLabel, nextLabel, initials, fullName, takePending, msgHtml, composer, hydrateAudio , ask, askText, takeFiles, pending, pendingFiles } from './ui.js';
import * as F from './fiche.js';
import { annoncesHtml } from './annonces.js';
import { seed } from './seed.js';
import { localLine, hoursCard, elevesSeg, famPill } from './gestion.js';
import { myContactCard } from './contact.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
const rerender = () => window.dispatchEvent(new Event('hashchange'));
let ctx = {};
const colorOf = (c) => COLORS[c.color] || COLORS.blue;
const hhmm = (t) => (t || '').replace(':', 'h');
const clsLabel = (c) => esc(c.name);
function lastAppel(c) { const a = d.attendanceOfClass(c.id)[0]; return a ? `Dernier appel : ${fdate(a.date)}` : 'Aucun appel pour l’instant'; }

// active : 0 Accueil · 1 Classes · 2 Élèves · 3 Réglages · 4 Direction (admin)
export function shell(u, active, body) {
  const admin = d.isAdmin(u);
  const nav = [['prof', 'home', 'Accueil', 0], ['prof/classes', 'grid', 'Classes', 1], ['prof/eleves', 'users', 'Élèves', 2]];
  if (admin) nav.push(['admin', 'shield', 'Direction', 4]);
  nav.push(['prof/reglages', 'gear', 'Réglages', 3]);
  const cl = d.myClasses(u).map((c) => `<a class="sub" href="#/prof/classe/${c.id}"><span style="width:14px;height:14px;border-radius:5px;border:2px solid var(--ink);background:${colorOf(c)}"></span><span class="grow">${esc(c.name)}</span><span class="mut">${d.studentsOf(c.id).length}</span></a>`).join('');
  return `<div class="shell"><nav class="side" aria-label="Navigation">
  <div class="row" style="padding:0 6px 16px"><span class="logo">${ic('book', 22, 2.6)}</span><span class="b" style="font-size:20px">Suivi</span>${admin ? pill('Admin', 'var(--yellow)') : ''}</div>
  ${nav.map(([h, i, l, k]) => `<a class="nav ${k === active ? 'on' : ''}" href="#/${h}">${ic(i, 20)}${l}</a>`).join('')}
  <div class="tiny mut b" style="padding:18px 14px 4px">${admin ? 'TOUTES LES CLASSES' : 'MES CLASSES'}</div>${cl}
  <a class="sub" href="#/prof/classes?new=1" style="color:var(--primary)">${ic('plus', 16)}Nouvelle classe</a>
  <span class="grow"></span><div class="row" style="padding:8px 6px">${av(u.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 40, 'var(--yellow)', 13)}<div class="grow"><div class="b small">${esc(u.name)}</div><div class="tiny mut b">${admin ? 'Administrateur' : 'Enseignant'}</div></div><button class="ib sm" data-act="lang" aria-label="Langue">${ic('globe', 16)}</button><button class="ib sm" data-act="logout" aria-label="Se déconnecter">${ic('out', 16)}</button></div>
  </nav><main class="main">${body}</main>
  <nav class="tabbar" aria-label="Navigation">${nav.map(([h, i, l, k]) => `<a class="${k === active ? 'on' : ''}" href="#/${h}"><span>${ic(i, 22)}</span>${l}</a>`).join('')}</nav></div>`;
}
const top = (title, sub, back, right = '') => `<div class="top">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div>${right}</div>`;


// ---------- téléphone du parent (visible seulement par les profs et l'admin) ----------
const telHref = (t) => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const waNum = (t) => { const x = String(t || '').replace(/[^\d+]/g, ''); return x.startsWith('+') ? x.slice(1) : x.startsWith('00') ? x.slice(2) : null; };
function callBtn(s, small = true) {
  if (!s.tel) return '';
  return `<a class="ib ${small ? 'sm' : ''}" href="${telHref(s.tel)}" aria-label="Appeler le parent de ${esc(s.prenoms.split(' ')[0])}" style="background:var(--mint);position:relative">${ic('phone', small ? 16 : 20)}</a>`;
}
function contactCard(s) {
  if (!s.tel && !s.email) return `<div class="ck flat pad row wrap" style="gap:10px">${ic('phone', 20)}<span class="grow b small">Ni téléphone ni e-mail pour ce parent.</span><a class="btn2 sm" href="#/prof/eleve/${s.id}/edit">${ic('plus', 16)}Compléter</a></div>`;
  const wa = waNum(s.tel);
  return `<div class="ck pad col" style="gap:10px"><div class="row between wrap"><span class="b">${ic('phone', 18)} Contact du parent</span><span class="small mut b" style="font-weight:600">Visible seulement par les profs et l’admin</span></div>
  <div class="row wrap" style="gap:8px 16px">${s.tel ? `<span class="code" style="font-size:20px">${esc(s.tel)}</span>` : ''}${s.email ? `<span class="b" style="word-break:break-all">${esc(s.email)}</span>` : ''}</div>
  <div class="row wrap" style="gap:8px">${s.tel ? `<a class="btn" href="${telHref(s.tel)}" style="background:var(--mint);color:var(--ink)">${ic('phone', 20)}Appeler ${esc(s.parent)}</a>
  <a class="btn2" href="sms:${String(s.tel).replace(/[^\d+]/g, '')}">${ic('chat', 20)}SMS</a>
  ${wa ? `<a class="btn2" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic('chat', 20)}WhatsApp</a>` : ''}` : ''}
  ${s.email ? `<a class="btn2" href="mailto:${esc(s.email)}">${ic('mail', 20)}E-mail</a>` : ''}</div>
  ${!s.tel || !s.email ? `<a class="small b" href="#/prof/eleve/${s.id}/edit">${ic('plus', 14)} Ajouter ${!s.tel ? 'le téléphone' : 'l’e-mail'}</a>` : ''}
</div>`;
}

// ---------- tableau de bord ----------
export function dashboard(u) {
  const cl = d.myClasses(u);
  const sts = d.myStudents(u);
  const watch = [];
  for (const s of sts) {
    const h = d.attendanceOfStudent(s).slice(0, 4);
    const a = h.filter((x) => x.s === 'A').length;
    if (a >= 2) watch.push([s, `${a} absences sur les 4 derniers cours`, 'var(--absent)']);
    for (const n of d.enCours(s)) { const k = daysSince(s.coran[n].start); if (k > 35) watch.push([s, `${d.sName(n)} en cours depuis ${k} jours`, 'var(--prev)']); }
  }
  const week = todayISO();
  const ago7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  let sv = 0, oa = 0;
  for (const s of sts) {
    for (const k in s.coran) if (s.coran[k].s === 'v' && s.coran[k].end >= ago7) sv++;
    for (const k in s.acquired) if (s.acquired[k] >= ago7) oa++;
  }
  const ap = d.D().attendance.filter((a) => cl.some((c) => c.id === a.classId) && a.date >= ago7 && a.date <= week).length;
  const body = `<div class="page">
  ${top(d.isAdmin(u) ? 'Vue d’ensemble' : `Bonjour ${esc(u.name)}`, fdate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' }), null)}
  ${annoncesHtml()}
  ${!u.tel || !u.email ? `<a class="ck pad row wrap" href="#/prof/reglages" style="background:var(--hi);text-decoration:none;color:var(--ink);gap:10px">${ic('phone', 20)}<span class="grow b">Complétez votre téléphone et votre e-mail pour que l’équipe et les parents puissent vous contacter.</span>${ic('chev', 18)}</a>` : ''}
  ${(() => { const nx = cl.map((c) => ({ c, n: d.nextCourse(c) })).filter((x) => x.n).sort((a, b) => a.n.when - b.n.when)[0]; return nx ? `<div class="ck pad row between wrap" style="background:var(--ink);color:#fff"><div><div class="tiny b" style="color:var(--yellow)">PROCHAIN COURS</div><div class="b" style="font-size:22px;margin-top:4px">${esc(nx.c.name)} · ${nextLabel(nx.n)}</div></div><a class="btn y" href="#/prof/classe/${nx.c.id}/appel">${ic('check', 20)}Faire l’appel</a></div>` : ''; })()}
  ${d.isAdmin(u) ? `<div class="grid3"><div class="ck stat" style="background:var(--pink)"><div class="v">${d.profs().length}</div><div class="l">professeurs</div></div><div class="ck stat" style="background:var(--blue2)"><div class="v">${cl.length}</div><div class="l">classes</div></div><div class="ck stat" style="background:var(--mint)"><div class="v">${sts.length}</div><div class="l">élèves</div></div></div>` : ''}
  ${cl.length ? '' : `<div class="ck pad col" style="background:var(--hi)"><h2>Bienvenue !</h2><p class="b" style="font-weight:600">Commencez par créer votre première classe, puis ajoutez vos élèves.</p><a class="btn" href="#/prof/classes?new=1">${ic('plus', 20)}Créer une classe</a></div>`}
  ${cl.length ? `<div class="row between"><h2>${d.isAdmin(u) ? 'Toutes les classes' : 'Mes classes'}</h2><a href="#/prof/classes" class="small">Tout voir</a></div>
  <div class="gridauto">${cl.map((c) => classTile(c)).join('')}</div>` : ''}
  ${d.isAdmin(u) ? hoursCard() : ''}
  <div class="grid3"><div class="ck stat" style="background:var(--yellow)"><div class="v">${sv}</div><div class="l">sourates validées (7 j)</div></div>
  <div class="ck stat" style="background:var(--blue2)"><div class="v">${oa}</div><div class="l">objectifs acquis (7 j)</div></div>
  <div class="ck stat" style="background:var(--mint)"><div class="v">${ap}</div><div class="l">appels faits (7 j)</div></div></div>
  <div class="grid2 stack" style="align-items:start">
  <div class="ck pad col"><h2>À surveiller</h2><div class="list">${watch.slice(0, 6).map(([s, t, c]) => `<a class="li" href="#/prof/eleve/${s.id}">${av(initials(s), 40, c, 13)}<span class="grow"><span class="b" style="display:block">${esc(fullName(s))}</span><span class="small mut b" style="font-weight:600">${esc(t)}</span></span>${ic('chev', 18)}</a>`).join('') || '<p class="small mut">Rien à signaler.</p>'}</div></div>
  <div class="col"><a class="btn2" href="#/prof/eleve/new">${ic('plus', 20)}Nouvel élève</a><a class="btn2" href="#/prof/classes?new=1">${ic('plus', 20)}Nouvelle classe</a><a class="btn2" href="#/prof/import">${ic('sheet', 20)}Importer des élèves (Excel)</a></div>
  </div></div>`;
  return shell(u, 0, body);
}
function schedLine(c, withNext = true) {
  const sl = d.slotsOf(c);
  if (!sl.length) return `<span class="tiny b" style="display:block">Horaires à compléter</span>`;
  const n = d.nextCourse(c);
  return `<span class="tiny b" style="display:block">${schedLabel(sl)}</span>${withNext && n ? `<span class="tiny b" style="display:block">Prochain cours : ${nextLabel(n)}</span>` : ''}`;
}
function courseCard(c) {
  const sl = d.slotsOf(c);
  if (!sl.length) return `<div class="ck flat pad row wrap" style="background:var(--hi);gap:10px">${ic('cal', 20)}<span class="grow b small">Horaires des cours à compléter</span><button class="btn2 sm" data-act="class-edit" data-id="${c.id}">${ic('edit', 16)}Ajouter les horaires</button></div>`;
  const n = d.nextCourse(c);
  return `<div class="ck flat pad col" style="gap:4px;background:var(--hi)"><span class="b">${ic('cal', 18)} Prochain cours : ${nextLabel(n)}</span><span class="small b" style="font-weight:600">Cours : ${schedLabel(sl)}</span></div>`;
}
function classTile(c) {
  return `<div class="ck tile" style="background:${colorOf(c)};position:relative"><a href="#/prof/classe/${c.id}" style="position:absolute;inset:0;border-radius:inherit" aria-label="${esc(c.name)}"></a><span class="big">${esc(c.name.replace(/^classe\s*/i, '') || c.name[0])}</span>
  <span><span class="b" style="display:block;font-size:17px">${esc(c.name)}</span><span class="small b" style="font-weight:600;display:block">${d.studentsOf(c.id).length} élèves</span>${schedLine(c)}${d.isAdmin(d.me()) ? `<span class="tiny b" style="display:block">${esc((d.user(c.profId) || {}).name || '')}</span>` : ''}${d.isAdmin(d.me()) ? `<span class="tiny b" style="display:block">${localLine(c)}</span>` : ''}<span class="tiny b" style="display:block">${lastAppel(c)}</span></span>
  <span class="row wrap" style="gap:6px;position:relative"><a href="#/prof/classe/${c.id}/appel" class="btn2 sm">${ic('check', 18)}Faire l’appel</a>${d.isAdmin(d.me()) ? `<button type="button" class="btn2 sm" data-act="loc-edit" data-id="${c.id}">${ic('door', 18)}Local utilisé</button>` : ''}</span></div>`;
}

// ---------- classes ----------
export function classes(u, q) {
  const cl = d.myClasses(u);
  const body = `<div class="page">${top(d.isAdmin(u) ? 'Toutes les classes' : 'Mes classes', `${cl.length} classe(s) · ${d.myStudents(u).length} élèves`, null, `<button class="btn sm" data-act="class-new">${ic('plus', 18)}Classe</button>`)}
  <div class="gridauto">${cl.map(classTile).join('')}<button class="ck tile flat" data-act="class-new" style="border-style:dashed;align-items:center;justify-content:center;cursor:pointer;background:var(--surface)">${ic('plus', 30)}<span class="b">Nouvelle classe</span></button></div></div>`;
  if (q.get('new')) setTimeout(() => classForm(u), 0);
  return shell(u, 1, body);
}
function slotRows(n, slots = []) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const s = slots[i] || { day: 6, time: '10:00' };
    h += `<div class="grid3" style="gap:8px"><div class="field"><label class="lbl" for="sd${i}">Cours ${i + 1} : jour</label><select id="sd${i}" name="day${i}" class="inp">${[1, 2, 3, 4, 5, 6, 0].map((k) => `<option value="${k}" ${+s.day === k ? 'selected' : ''}>${DAYS[k]}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="st${i}">Début</label><input id="st${i}" name="time${i}" type="time" class="inp" value="${s.time}" required></div>
    <div class="field"><label class="lbl" for="se${i}">Fin</label><input id="se${i}" name="end${i}" type="time" class="inp" value="${s.end || ''}"></div></div>`;
  }
  return h;
}
CHANGE['slots-count'] = (el) => {
  const n = +el.value, cur = [];
  for (let i = 0; i < 5; i++) { const dd = document.getElementById('sd' + i), tt = document.getElementById('st' + i), ee = document.getElementById('se' + i); if (dd) cur.push({ day: +dd.value, time: tt.value, end: ee.value }); }
  document.getElementById('slots').innerHTML = slotRows(n, cur);
};
function classForm(u, c = null) {
  const pid = c ? c.profId : (d.isAdmin(u) ? (d.profs()[0] || {}).id : u.id);
  const levels = d.levelsOf(pid);
  const profSel = d.isAdmin(u) ? `<div class="field"><label class="lbl" for="cp">Professeur</label><select id="cp" name="profId" class="inp">${d.profs().map((p) => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : '';
  openModal(() => `<div class="row between"><h2>${c ? 'Modifier la classe' : 'Nouvelle classe'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="class" data-id="${c ? c.id : ''}">
  <div class="field"><label class="lbl" for="cn">Nom de la classe</label><input id="cn" name="name" class="inp" required value="${esc(c ? c.name : `Classe ${d.myClasses(u).length + 1}`)}"></div>
  ${profSel}
  <fieldset class="ck flat pad col" style="margin:0;gap:10px"><legend class="lbl" style="padding:0 6px">Cours de la semaine</legend>
  <div class="field"><label class="lbl" for="cnb">Combien de cours par semaine ?</label><select id="cnb" class="inp" data-change="slots-count">${[1, 2, 3, 4, 5].map((k) => `<option value="${k}" ${k === Math.max(1, d.slotsOf(c).length) ? 'selected' : ''}>${k} cours</option>`).join('')}</select></div>
  <div id="slots" class="col" style="gap:10px">${slotRows(Math.max(1, d.slotsOf(c).length), d.slotsOf(c))}</div>
  <span class="hint" style="margin:0">Sert à afficher « Prochain cours » sur les fiches des élèves. L’heure de fin sert au compteur d’heures du professeur et au planning des locaux.</span></fieldset>
  <fieldset style="border:0;padding:0;margin:0"><legend class="lbl">Couleur</legend><div class="row">${Object.keys(COLORS).map((k) => `<label style="cursor:pointer"><input type="radio" name="color" value="${k}" class="sr" ${(c ? c.color : 'blue') === k ? 'checked' : ''}><span class="av swatch" style="width:48px;height:48px;background:${COLORS[k]}" title="${COLOR_NAMES[k]}"></span><span class="sr">${COLOR_NAMES[k]}</span></label>`).join('')}</div></fieldset>
  <div class="field"><label class="lbl" for="cl">Niveau Langue &amp; Religion par défaut</label><select id="cl" name="level" class="inp">${levels.map((l) => `<option value="${l}" ${(c ? c.level : 1) === l ? 'selected' : ''}>Niveau ${l}</option>`).join('')}</select></div>
  <button class="btn full">${c ? 'Enregistrer' : 'Créer la classe'}</button>
  ${c ? `<button type="button" class="btnd full" data-act="class-del" data-id="${c.id}">${ic('trash', 18)}Supprimer la classe</button>` : ''}
  </form>`);
}
ACT['class-new'] = () => classForm(d.me());
ACT['class-edit'] = (el) => classForm(d.me(), d.cls(el.dataset.id));
FORMS.class = (f, fd) => {
  const u = d.me();
  const id = f.dataset.id;
  const slots = [];
  const old = id ? d.slotsOf(d.cls(id)) : [];
  for (let i = 0; i < 5; i++) {
    if (!fd.get('time' + i)) continue;
    const s = { ...(old[i] || {}), day: +fd.get('day' + i), time: fd.get('time' + i), end: fd.get('end' + i) || '' };
    if (!s.end) delete s.end;
    else if (s.end <= s.time) { toast('L’heure de fin doit être après l’heure de début'); return; }
    slots.push(s);
  }
  const v = { name: (fd.get('name') || '').trim() || 'Classe', color: fd.get('color') || 'blue', level: +fd.get('level') || 1, slots };
  if (d.isAdmin(u)) { if (!fd.get('profId')) { toast('Créez d’abord un professeur'); return; } v.profId = fd.get('profId'); }
  if (id) { const cc = d.cls(id); delete cc.day; delete cc.time; Object.assign(cc, v); }
  else { const c = { id: d.uid(), profId: u.id, ...v }; d.D().classes.push(c); d.save(); closeModal(); go(`#/prof/classe/${c.id}`); toast('Classe créée'); return; }
  d.save(); closeModal(); rerender(); toast('Classe enregistrée');
};
ACT['class-del'] = async (el) => {
  const c = d.cls(el.dataset.id);
  const n = d.studentsOf(c.id).length;
  if (!ask(`Supprimer ${c.name} ?${n ? `\n\nSes ${n} élève(s) et tout leur suivi seront effacés.` : ''}`)) return;
  await d.deleteClass(c.id); closeModal(); toast('Classe supprimée'); go('#/prof/classes');
};

export function classe(u, id) {
  const c = d.cls(id);
  if (!d.canSeeClass(u, c)) return shell(u, 1, `<div class="page">${top('Classe introuvable', '', '#/prof/classes')}</div>`);
  ctx = { cls: c };
  const sts = d.studentsOf(id);
  const notes = d.D().notes.filter((n) => n.scope === 'class' && n.classId === id).sort((a, b) => b.at.localeCompare(a.at));
  const acts = [[`#/prof/classe/${id}/appel`, 'check', 'Faire l’appel', 'var(--primary)', '#fff'], [`#/prof/eleve/new?c=${id}`, 'plus', 'Élève', 'var(--surface)', 'var(--ink)'], [`#/prof/classe/${id}/historique`, 'clock', 'Historique', 'var(--surface)', 'var(--ink)'], ['#notes-classe', 'note', 'Note classe', 'var(--surface)', 'var(--ink)'], [`#/prof/classe/${id}/objectifs`, 'star', 'Objectifs classe', 'var(--yellow)', 'var(--ink)']];
  const body = `<div class="page">${top(esc(c.name), `${sts.length} élève(s) · ${lastAppel(c)}`, '#/prof/classes', `<button class="ib" data-act="class-edit" data-id="${id}" aria-label="Modifier la classe">${ic('edit', 18)}</button>`)}
  ${courseCard(c)}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:10px">${acts.map(([h, i, l, bg, fg]) => `<a href="${h}" class="ck col" style="gap:6px;align-items:center;padding:12px 4px;text-decoration:none;background:${bg};color:${fg};font-weight:800;font-size:13px;text-align:center">${ic(i, 24)}${l}</a>`).join('')}</div>
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${sts.map((s, k) => {
    const p = d.presence(s); const kk = d.coranStats(s);
    return `<div class="li" style="position:relative">${av(initials(s), 42, ACC[k % 4], 14)}<a href="#/prof/eleve/${s.id}" class="grow" style="text-decoration:none;color:var(--ink)"><span class="b" style="display:block">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b" style="font-weight:600">${kk.v} sourates · ${p.rate === null ? '—' : p.rate + ' %'} présence</span></a>${callBtn(s)}${ic('chev', 18)}</div>`;
  }).join('') || `<div class="col" style="padding:14px 0"><p class="mut small">Pas encore d’élève dans cette classe.</p><a class="btn" href="#/prof/eleve/new?c=${id}">${ic('plus', 20)}Ajouter un élève</a></div>`}</div></div>
  <div class="ck pad col" id="notes-classe"><h2>Notes pour toute la classe</h2><p class="small mut b" style="font-weight:600">Visibles sur la fiche de chaque élève de ${esc(c.name)}.</p>
  ${composer('note-class', 'zc', '', 'Ex : pas de cours samedi prochain… ou les devoirs en photo', true)}
  <p class="tiny mut b">Photos et fichiers : visibles par les parents pendant 7 jours, puis supprimés automatiquement.</p>
  <div class="col">${notes.map((n) => msgHtml(n, 'note-del')).join('')}</div></div></div>`;
  return shell(u, 1, body);
}
FORMS['note-class'] = async (f, fd) => {
  const text = (fd.get('text') || '').trim();
  if (!text && !pending['zc'] && !(pendingFiles['zc'] || []).length) { toast('Écrivez une note, ajoutez une photo ou un vocal'); return; }
  const audioId = await takePending('zc');
  if (audioId === false) return;
  const files = await takeFiles('zc');
  d.D().notes.push({ id: d.uid(), profId: ctx.cls.profId, authorId: d.me().id, scope: 'class', classId: ctx.cls.id, studentId: null, at: new Date().toISOString(), text, audioId, files });
  d.save(); toast('Note publiée'); rerender();
};
// ---------- appel ----------
// Chaque appel est enregistré avec sa date ET son heure : une classe peut avoir
// un, deux cours par semaine, ou deux cours le même jour. Pas d'appel = pas de cours.
const nowHM = () => { const t = new Date(); return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };
const recById = (id) => d.D().attendance.find((a) => a.id === id);
export const whenLabel = (a) => { const n = d.courseNo(a); return `${fdate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}${n ? ' · ' + (n === 1 ? '1er cours' : n + 'e cours') : ''}`; };
export function appel(u, id, recId, q) {
  const c = d.cls(id);
  if (!d.canSeeClass(u, c)) return shell(u, 1, '');
  if (!recId) return appelStart(u, c, q);
  const rec = recById(recId);
  if (!rec || rec.classId !== id) return shell(u, 1, `<div class="page">${top('Appel introuvable', esc(c.name), `#/prof/classe/${id}`)}</div>`);
  ctx = { cls: c, rec };
  const r = rec.records;
  const sts = d.studentsOf(id);
  const cnt = (k) => sts.filter((s) => r[s.id] === k).length;
  const rest = sts.filter((s) => !r[s.id]).length;
  const rows = sts.map((s) => `<div class="ck flat appel-row"><span class="grow b">${esc(s.prenoms.split(' ')[0])} ${esc(s.nom)}</span>
  ${['P', 'A', 'E'].map((k) => `<button type="button" class="st-btn ${r[s.id] === k ? 'on-' + k : ''}" data-act="ap" data-sid="${s.id}" data-s="${k}" aria-pressed="${r[s.id] === k}" aria-label="${STATUS[k].l} : ${esc(s.prenoms.split(' ')[0])}">${ic(STATUS[k].icon, 20, 2.8)}<span class="lab">${k === 'E' ? 'Prévenu' : STATUS[k].l}</span></button>`).join('')}</div>`).join('');
  const body = `<div class="page">${top('L’appel', esc(c.name), `#/prof/classe/${id}`)}
  <div class="ck pad col" style="gap:8px;background:var(--yellow)"><span class="b" style="font-size:20px">Cours du ${whenLabel(rec)}</span>
  <details><summary class="small b" style="cursor:pointer">Corriger la date</summary><div class="row wrap" style="margin-top:8px"><label class="sr" for="ad">Date du cours</label><input id="ad" type="date" class="inp" value="${rec.date}" max="${todayISO()}" data-change="ap-when" data-k="date" style="max-width:200px"></div></details></div>
  <div class="row wrap" style="gap:8px">${pill(cnt('P') + ' présent(s)', 'var(--present)', 'var(--onpresent)')}${pill(cnt('A') + ' absent(s)', 'var(--absent)', 'var(--onabsent)')}${pill(cnt('E') + ' prévenu(s)', 'var(--prev)')}${rest ? pill(rest + ' à marquer', 'var(--neutral)') : ''}</div>
  ${rest ? `<button class="btn2 sm" data-act="ap-all" style="align-self:flex-start">${ic('check', 18)}Marquer les ${rest} restant(s) présents</button>` : ''}
  <div class="col" style="gap:8px">${rows || '<p class="mut">Aucun élève dans cette classe.</p>'}</div>
  <div class="row tiny mut b" style="justify-content:flex-end;gap:20px;padding-right:6px"><span>${ic('check', 14)} Présent</span><span>${ic('x', 14)} Absent</span><span>${ic('mail', 14)} Absent prévenu</span></div>
  <a href="#/prof/classe/${id}/appel/${rec.id}/ok" class="btn full">Terminer l’appel</a>
  <button class="btnd full" data-act="ap-del">${ic('trash', 18)}Supprimer cet appel</button></div>`;
  return shell(u, 1, body);
}
// « Faire l'appel » : l'appel est créé tout de suite avec la date du jour (pas d'heure).
// Si un appel existe déjà aujourd'hui, on demande : le modifier, ou faire un 2e appel (2e cours).
function newRec(c) {
  const rec = { id: d.uid(), classId: c.id, date: todayISO(), at: new Date().toISOString(), records: {}, done: false };
  d.D().attendance.push(rec); d.save();
  return rec;
}
function appelStart(u, c, q) {
  const today = d.attendanceOfClass(c.id).filter((a) => a.date === todayISO());
  if (!today.length || (q && q.get('nouveau'))) { location.replace(`#/prof/classe/${c.id}/appel/${newRec(c).id}`); return null; }
  return shell(u, 1, `<div class="page narrow">${top('L’appel', esc(c.name), `#/prof/classe/${c.id}`)}
  <div class="ck pad col" style="background:var(--hi)"><h2>L’appel a déjà été fait aujourd’hui</h2>
  ${today.map((a) => `<a class="btn full" href="#/prof/classe/${c.id}/appel/${a.id}">${ic('edit', 20)}Modifier l’appel d’aujourd’hui${today.length > 1 ? ` (${whenLabel(a).split(' · ')[1]})` : ''}</a>`).join('')}
  <a class="btn2 full" href="#/prof/classe/${c.id}/appel?nouveau=1">${ic('plus', 20)}Faire un 2e appel aujourd’hui</a></div></div>`);
}
const softRender = () => window.dispatchEvent(new CustomEvent('soft-render'));
ACT.ap = (el) => { ctx.rec.records[el.dataset.sid] = el.dataset.s; d.save(); softRender(); };
ACT['ap-all'] = () => {
  d.studentsOf(ctx.cls.id).forEach((s) => { if (!ctx.rec.records[s.id]) ctx.rec.records[s.id] = 'P'; });
  d.save(); softRender();
};
CHANGE['ap-when'] = (el) => { if (!el.value) return; ctx.rec[el.dataset.k] = el.value; d.save(); toast('Date enregistrée'); softRender(); };
ACT['ap-del'] = () => {
  if (!ask('Supprimer cet appel ? Il disparaîtra de l’historique des élèves.')) return;
  d.D().attendance = d.D().attendance.filter((a) => a.id !== ctx.rec.id);
  d.save(); toast('Appel supprimé'); go(`#/prof/classe/${ctx.cls.id}/historique`);
};

export function appelOk(u, id, recId) {
  const c = d.cls(id);
  const rec = recById(recId);
  if (!d.canSeeClass(u, c) || !rec) return shell(u, 1, '');
  if (rec.done === false) { rec.done = true; d.save(); } // appel validé → compte dans les heures du professeur
  const r = rec.records;
  const sts = d.studentsOf(id);
  const cnt = (k) => sts.filter((s) => r[s.id] === k).length;
  const abs = sts.filter((s) => r[s.id] === 'A' || r[s.id] === 'E');
  const rest = sts.filter((s) => !r[s.id]);
  const body = `<div class="page narrow"><div class="col center" style="align-items:center;padding-top:20px">
  <span class="av" style="width:76px;height:76px;background:var(--mint)">${ic('check', 38, 3.4)}</span><h1>Appel enregistré</h1>
  <p class="mut b">${esc(c.name)} · ${whenLabel(rec)}</p></div>
  <div class="grid3"><div class="ck stat" style="background:var(--present);color:var(--onpresent)"><div class="v">${cnt('P')}</div><div class="l">présents</div></div><div class="ck stat" style="background:var(--absent);color:var(--onabsent)"><div class="v">${cnt('A')}</div><div class="l">absents</div></div><div class="ck stat" style="background:var(--prev)"><div class="v">${cnt('E')}</div><div class="l">prévenus</div></div></div>
  ${rest.length ? `<div class="err">${rest.length} élève(s) pas encore marqué(s) : ${rest.map((s) => esc(s.prenoms.split(' ')[0])).join(', ')}</div>` : ''}
  ${abs.length ? `<div class="ck pad col"><h2>Absents ce jour</h2>${abs.map((s) => `<div class="row between"><span class="b grow">${esc(fullName(s))}</span>${pill(r[s.id] === 'A' ? 'Absent' : 'Prévenu', STATUS[r[s.id]].bg, STATUS[r[s.id]].fg)}${callBtn(s)}</div>`).join('')}<p class="small mut b" style="font-weight:600">C’est déjà visible sur leur fiche.</p></div>` : ''}
  <a class="btn full" href="#/prof/classe/${id}">Retour à la classe</a><a class="btn2 full" href="#/prof/classe/${id}/appel/${rec.id}">Modifier l’appel</a></div>`;
  return shell(u, 1, body);
}
export function historique(u, id) {
  const c = d.cls(id);
  const list = d.attendanceOfClass(id);
  const body = `<div class="page">${top('Historique des appels', esc(c.name), `#/prof/classe/${id}`)}
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${list.map((a) => {
    const v = Object.values(a.records);
    const k = (s) => v.filter((x) => x === s).length;
    return `<a class="li" href="#/prof/classe/${id}/appel/${a.id}"><span class="grow b">${whenLabel(a)}</span>${pill(k('P'), 'var(--present)', 'var(--onpresent)')}${pill(k('A'), 'var(--absent)', 'var(--onabsent)')}${pill(k('E'), 'var(--prev)')}${ic('chev', 18)}</a>`;
  }).join('') || '<p class="mut small" style="padding:12px 0">Aucun appel pour le moment.</p>'}</div></div>
  <p class="tiny mut b">Vert : présents · Rouge : absents · Jaune : absents prévenus. Touchez une date pour corriger l’appel.</p></div>`;
  return shell(u, 1, body);
}

// ---------- objectifs pour toute la classe ----------
// Valider un objectif (ou tout un niveau) en une fois pour tous les élèves de la classe.
export function classeObjectifs(u, id, q) {
  const c = d.cls(id);
  if (!d.canSeeClass(u, c)) return shell(u, 1, '');
  const levels = d.levelsOf(c.profId);
  const lv = +(q.get('n') || c.level || levels[0]);
  const objs = d.objectivesOf(c.profId, lv);
  const sts = d.studentsOf(id);
  const openObj = ctx.cls && ctx.cls.id === id && ctx.openObj ? ctx.openObj : new Set();
  ctx = { cls: c, level: lv, openObj };
  const groups = [...new Set(objs.map((o) => o.group))];
  const allOk = (o) => sts.length && sts.every((s) => s.acquired[o.id]);
  const n = (o) => sts.filter((s) => s.acquired[o.id]).length;
  const list = groups.map((g) => `<div class="ck pad col"><h2>${esc(g)}</h2>${objs.filter((o) => o.group === g).map((o) => {
    const k = n(o), full = allOk(o);
    return `<div class="col" style="gap:8px;padding:10px 0;border-bottom:2px solid var(--neutral)">
    <div class="row wrap"><span class="grow b">${esc(o.text)}</span>${pill(`${k} / ${sts.length} élèves`, full ? 'var(--mint)' : k ? 'var(--hi)' : 'var(--neutral)')}</div>
    <div class="row wrap" style="gap:8px">${full ? `<button class="btn2 sm" data-act="cobj-none" data-id="${o.id}">${ic('x', 16)}Retirer pour toute la classe</button>` : `<button class="btn sm" data-act="cobj-all" data-id="${o.id}">${ic('check', 18)}Valider pour toute la classe</button>`}</div>
    <details ${openObj.has(o.id) ? 'open' : ''}><summary class="small b" style="cursor:pointer">Détail par élève</summary><div class="row wrap" style="gap:8px;margin-top:8px">${sts.map((s) => {
      const ok = !!s.acquired[o.id];
      return `<button class="pill" data-act="cobj-one" data-id="${o.id}" data-sid="${s.id}" aria-pressed="${ok}" style="cursor:pointer;font-size:13px;padding:8px 12px;background:${ok ? 'var(--v)' : 'var(--surface)'};color:${ok ? 'var(--onv)' : 'var(--ink)'}">${ok ? ic('check', 14, 3) : ''}${esc(s.prenoms.split(' ')[0])} ${esc(s.nom[0] || '')}.</button>`;
    }).join('')}</div></details></div>`;
  }).join('')}</div>`).join('');
  return shell(u, 1, `<div class="page narrow">${top('Objectifs de la classe', `${esc(c.name)} · ${sts.length} élève(s)`, `#/prof/classe/${id}`)}
  <p class="small mut b" style="font-weight:600">Validez un objectif pour toute la classe en une fois (par exemple après une interrogation commune). Vous pouvez ensuite retirer un élève dans « Détail par élève ».</p>
  <div class="seg" role="navigation" aria-label="Niveaux">${levels.map((l) => `<a href="#/prof/classe/${id}/objectifs?n=${l}" class="${l === lv ? 'on' : ''}">Niveau ${l}</a>`).join('')}</div>
  ${objs.length && sts.length ? `<button class="btn y full" data-act="cobj-level">${ic('star', 20)}Valider tout le niveau ${lv} pour toute la classe</button>` : ''}
  ${sts.length ? list || '<p class="mut">Aucun objectif pour ce niveau.</p>' : '<p class="mut">Pas encore d’élève dans cette classe.</p>'}</div>`);
}
const softR = () => window.dispatchEvent(new CustomEvent('soft-render'));
ACT['cobj-all'] = (el) => {
  const t = todayISO();
  d.studentsOf(ctx.cls.id).forEach((s) => { if (!s.acquired[el.dataset.id]) s.acquired[el.dataset.id] = t; });
  d.save(); toast('Objectif validé pour toute la classe'); softR();
};
ACT['cobj-none'] = (el) => {
  if (!ask('Retirer cet objectif pour tous les élèves de la classe ?')) return;
  d.studentsOf(ctx.cls.id).forEach((s) => { delete s.acquired[el.dataset.id]; });
  d.save(); softR();
};
ACT['cobj-one'] = (el) => {
  ctx.openObj.add(el.dataset.id);
  const s = d.student(el.dataset.sid);
  if (s.acquired[el.dataset.id]) delete s.acquired[el.dataset.id]; else s.acquired[el.dataset.id] = todayISO();
  d.save(); softR();
};
ACT['cobj-level'] = () => {
  const objs = d.objectivesOf(ctx.cls.profId, ctx.level);
  if (!ask(`Valider les ${objs.length} objectifs du niveau ${ctx.level} pour tous les élèves de la classe ?`)) return;
  const t = todayISO();
  d.studentsOf(ctx.cls.id).forEach((s) => objs.forEach((o) => { if (!s.acquired[o.id]) s.acquired[o.id] = t; }));
  d.save(); toast('Niveau validé pour toute la classe'); softR();
};

// ---------- élèves ----------
export function eleves(u) {
  const sts = d.myStudents(u).sort((a, b) => a.nom.localeCompare(b.nom));
  const body = `<div class="page">${top('Élèves', `${sts.length} élève(s)`, null, `<a class="btn sm" href="#/prof/eleve/new">${ic('plus', 18)}Élève</a>`)}
  ${d.isAdmin(u) ? elevesSeg(0) : ''}
  <div class="field"><label class="sr" for="q">Rechercher</label><input id="q" class="inp" placeholder="Rechercher un élève…" data-filter=".li"></div>
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${sts.map((s, k) => `<div class="li" data-q="${esc((s.prenoms + ' ' + s.nom + ' ' + s.parent + ' ' + (s.email || '') + ' ' + d.cls(s.classId).name).toLowerCase())}">${av(initials(s), 42, ACC[k % 4], 14)}<a href="#/prof/eleve/${s.id}" class="grow" style="text-decoration:none;color:var(--ink)"><span class="b" style="display:block">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b" style="font-weight:600">${esc(d.cls(s.classId).name)} · Parent : ${esc(s.parent)}${d.isAdmin(u) ? famPill(s) : ''}</span></a>${callBtn(s)}${ic('chev', 18)}</div>`).join('') || '<p class="mut small" style="padding:12px 0">Aucun élève.</p>'}</div></div></div>`;
  return shell(u, 2, body);
}
function studentForm(u, s, classId) {
  const cl = d.myClasses(u);
  if (!cl.length) return `<div class="ck pad col" style="background:var(--hi)"><p class="b">Créez d’abord une classe.</p><a class="btn" href="#/prof/classes?new=1">Créer une classe</a></div>`;
  const sel = s ? s.classId : classId || cl[0].id;
  return `<form class="ck pad col" data-form="student" data-id="${s ? s.id : ''}">
  <div class="field"><label class="lbl" for="sc">Classe</label><select id="sc" name="classId" class="inp" style="background:var(--blue2)">${cl.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${clsLabel(c)}</option>`).join('')}</select>${s ? '<span class="hint">Changer de classe conserve tout le suivi.</span>' : ''}</div>
  <div class="grid2 stack"><div class="field"><label class="lbl" for="sn">Nom</label><input id="sn" name="nom" class="inp" required value="${esc(s ? s.nom : '')}" autocomplete="off"></div>
  <div class="field"><label class="lbl" for="sp">Prénom(s)</label><input id="sp" name="prenoms" class="inp" required value="${esc(s ? s.prenoms : '')}" autocomplete="off"><span class="hint">Tous les prénoms, séparés par un espace</span></div></div>
  <div class="grid2 stack"><div class="field"><label class="lbl" for="sg">Âge</label><input id="sg" name="age" type="number" min="2" max="99" inputmode="numeric" class="inp" required value="${s ? d.ageOf(s) ?? '' : ''}"><span class="hint">L’âge se met à jour tout seul chaque année.</span></div>
  <div class="field"><label class="lbl" for="sa">Prénom d’un parent</label><input id="sa" name="parent" class="inp" required value="${esc(s ? s.parent : '')}" autocomplete="off"></div></div>
  <div class="grid2 stack"><div class="field"><label class="lbl" for="stl">Téléphone du parent</label><input id="stl" name="tel" type="tel" inputmode="tel" class="inp code" required value="${esc(s ? s.tel || '' : '')}" autocomplete="off" placeholder="ex. +32 470 12 34 56"><span class="hint">Avec l’indicatif (+32, +33…), le bouton WhatsApp apparaît aussi.</span></div>
  <div class="field"><label class="lbl" for="sml">E-mail du parent</label><input id="sml" name="email" type="email" inputmode="email" class="inp" required value="${esc(s ? s.email || '' : '')}" autocomplete="off" autocapitalize="none" placeholder="ex. karim.benali@gmail.com"></div></div>
  <span class="hint" style="margin-top:-6px">Téléphone et e-mail : visibles seulement par les profs et l’admin, jamais sur la fiche des parents.</span>
  <details ${s && s.naissance ? 'open' : ''}><summary class="small b" style="cursor:pointer">Date de naissance précise (facultatif)</summary><div class="field" style="margin-top:8px"><label class="lbl" for="sb">Date de naissance</label><input id="sb" name="naissance" type="date" class="inp" value="${s && s.naissance ? s.naissance : ''}"><span class="hint">Si elle est remplie, l’âge est calculé à partir d’elle.</span></div></details>
  ${s ? '' : '<div class="ck flat pad small b" style="background:var(--yellow);font-weight:600">Le code de suivi est créé automatiquement : classe, initiales, prénom du parent, âge, + 4 caractères de sécurité.</div>'}
  <button class="btn full">${s ? 'Enregistrer' : 'Ajouter l’élève'}</button></form>`;
}
export function eleveNew(u, q) {
  return shell(u, 2, `<div class="page narrow">${top('Nouvel élève', 'Le code de suivi se crée tout seul', q.get('c') ? `#/prof/classe/${q.get('c')}` : '#/prof/eleves')}${studentForm(u, null, q.get('c'))}</div>`);
}
FORMS.student = (f, fd) => {
  const u = d.me();
  const id = f.dataset.id;
  const v = { classId: fd.get('classId'), nom: (fd.get('nom') || '').trim(), prenoms: (fd.get('prenoms') || '').trim().replace(/\s+/g, ' '), naissance: fd.get('naissance') || null, parent: (fd.get('parent') || '').trim(), tel: (fd.get('tel') || '').trim(), email: (fd.get('email') || '').trim().toLowerCase() };
  const age = parseInt(fd.get('age'), 10);
  if (!v.nom || !v.prenoms || !v.parent || (!v.naissance && !(age > 0))) { toast('Merci de remplir tous les champs'); return; }
  if (v.tel.replace(/[^\d]/g, '').length < 8) { toast('Indiquez le numéro de téléphone du parent'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { toast('Indiquez une adresse e-mail valide'); return; }
  if (v.naissance) { v.age = null; v.ageAt = null; } else { v.age = age; v.ageAt = todayISO(); }
  const c = d.cls(v.classId);
  if (!d.canSeeClass(u, c)) return;
  if (id) { Object.assign(d.student(id), v); d.save(); toast('Élève enregistré'); go(`#/prof/eleve/${id}`); return; }
  const s = { id: d.uid(), ...v, level: c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
  s.code = d.genCode(s, c);
  d.D().students.push(s); d.save();
  go(`#/prof/eleve/${s.id}/cree`);
};
const ficheLink = (s) => `${location.origin}${location.pathname}#/f/${encodeURIComponent(s.code)}`;
export function eleveCree(u, id) {
  const s = d.student(id); const c = d.cls(s.classId);
  return shell(u, 2, `<div class="page narrow"><div class="col center" style="align-items:center;padding-top:20px">
  <span class="av" style="width:76px;height:76px;background:var(--mint)">${ic('check', 38, 3.4)}</span><h1>${esc(s.prenoms.split(' ')[0])} est inscrit(e) !</h1><p class="mut b">${clsLabel(c)}</p></div>
  ${codeCard(s)}
  <a class="btn2 full" href="#/prof/eleve/new?c=${c.id}">${ic('plus', 20)}Inscrire un autre élève</a><a class="btn full" href="#/prof/eleve/${id}">Ouvrir la fiche</a></div>`);
}
function codeCard(s) {
  return `<div class="ck pad col" style="background:var(--yellow)"><span class="tiny b">CODE DE SUIVI À DONNER AU PARENT</span><span class="code" style="font-size:21px">${esc(s.code)}</span>
  <div class="grid2"><button class="btn2 sm" data-act="copy" data-t="${esc(s.code)}">${ic('copy', 18)}Copier</button><button class="btn sm" data-act="share" data-id="${s.id}">${ic('share', 18)}Partager le lien</button></div>
  <span class="tiny b" style="font-weight:600">Le lien ouvre directement la fiche, sans rien taper.</span></div>`;
}
ACT.copy = (el) => copyText(el.dataset.t);
ACT.share = async (el) => {
  const s = d.student(el.dataset.id);
  const text = `Suivi de ${s.prenoms.split(' ')[0]} : ${ficheLink(s)}\nCode : ${s.code}`;
  if (navigator.share) { try { await navigator.share({ title: 'Fiche de suivi', text, url: ficheLink(s) }); } catch {} }
  else copyText(text);
};

const ETABS = [['coran', 'Coran'], ['langue', 'Langue & Religion'], ['presence', 'Présence'], ['notes', 'Notes']];
export function eleve(u, id, tab = 'coran', q = null) {
  const s = d.student(id);
  if (!d.canSeeStudent(u, s)) return shell(u, 2, `<div class="page">${top('Élève introuvable', '', '#/prof/eleves')}</div>`);
  ctx = { st: s };
  const c = d.cls(s.classId);
  let body = '';
  if (tab === 'coran') body = `${F.coranHead(s)}<h3>En cours</h3>${F.enCoursCards(s, 'sour')}<div class="ck pad col"><p class="small b">Touchez une sourate pour changer son état, ses dates ou laisser une note.</p>${F.mushaf(s, 'sour')}${F.legend()}</div>`;
  else if (tab === 'langue') body = F.objectives(s, true, q && q.get('n'), `#/prof/eleve/${id}/langue`);
  else if (tab === 'presence') body = F.presence(s);
  else body = F.notes(s, true);
  return shell(u, 2, `<div class="page">
  <div class="top"><a href="#/prof/classe/${c.id}" class="ib" aria-label="Retour">${ic('back', 20)}</a>${av(initials(s), 56, 'var(--yellow)', 19)}<div class="grow"><h1 style="font-size:24px">${esc(s.prenoms)} ${esc(s.nom)}</h1><div class="row wrap" style="gap:8px;margin-top:4px">${pill(esc(c.name), colorOf(c))}${d.nextCourse(c) ? `<span class="small b">Prochain cours : ${nextLabel(d.nextCourse(c))}</span>` : ''}</div></div>
  <a class="ib" href="#/prof/eleve/${id}/edit" aria-label="Modifier l’élève">${ic('edit', 18)}</a></div>
  ${F.parentBadge(s)}
  ${contactCard(s)}
  <div class="ck flat row" style="padding:8px 8px 8px 14px"><span class="grow code small">${esc(s.code)}</span><button class="ib sm" data-act="copy" data-t="${esc(s.code)}" aria-label="Copier le code">${ic('copy', 16)}</button><button class="ib sm" data-act="share" data-id="${s.id}" aria-label="Partager le lien de la fiche">${ic('share', 16)}</button><a class="ib sm" href="#/f/${encodeURIComponent(s.code)}" aria-label="Voir comme un parent">${ic('users', 16)}</a></div>
  <div class="seg" role="navigation" aria-label="Sections" style="overflow-x:auto">${ETABS.map(([k, l]) => `<a href="#/prof/eleve/${id}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div>
  <div class="col" style="gap:14px">${body}</div></div>`);
}
ACT.sour = (el) => openModal(() => F.sourateSheet(ctx.st, +el.dataset.n, true));
async function wipeNotes(sid, n) {
  for (const m of d.sourateNotes(sid, n)) if (m.audioId) await d.delAudio(m.audioId).catch(() => {});
  d.D().snotes = d.D().snotes.filter((m) => !(m.studentId === sid && m.n === n));
}
ACT['sour-state'] = async (el) => {
  const s = ctx.st, n = +el.dataset.n, to = el.dataset.s;
  const x = s.coran[n] || { s: 'n' };
  if (x.s === to) return;
  const k = d.sourateNotes(s.id, n).length;
  if (to === 'v') {
    if (k && !ask(`Valider ${d.sName(n)} ?\n\nLes ${k} note(s) de cette sourate seront effacées.`)) return;
    await wipeNotes(s.id, n);
    s.coran[n] = { s: 'v', start: x.start || todayISO(), end: todayISO() };
    toast(`${d.sName(n)} validée`);
  } else if (to === 'c') {
    s.coran[n] = { s: 'c', start: x.s === 'c' ? x.start : todayISO() };
    toast(`Début d’apprentissage : aujourd’hui`);
  } else {
    if (k && !ask(`Remettre ${d.sName(n)} en « non connue » ?\n\nSes ${k} note(s) seront effacées.`)) return;
    await wipeNotes(s.id, n);
    delete s.coran[n];
  }
  d.save(); refreshModal(); rerenderKeepModal();
};
function rerenderKeepModal() {
  const app = document.getElementById('app');
  const tmp = location.hash;
  window.dispatchEvent(new CustomEvent('soft-render'));
  return tmp && app;
}
CHANGE['sour-date'] = (el) => {
  const x = ctx.st.coran[+el.dataset.n];
  if (x && el.value) { x[el.dataset.k] = el.value; d.save(); toast('Date enregistrée'); rerenderKeepModal(); }
};
FORMS.snote = async (f, fd) => {
  const n = +f.dataset.n;
  const text = (fd.get('text') || '').trim();
  const audioId = await takePending('zs' + n);
  if (audioId === false) return;
  if (!text && !audioId) { toast('Écrivez une note ou enregistrez un vocal'); return; }
  d.D().snotes.push({ id: d.uid(), studentId: ctx.st.id, n, at: new Date().toISOString(), text, audioId });
  d.save(); toast('Note envoyée'); refreshModal(); rerenderKeepModal();
};
ACT['snote-del'] = async (el) => {
  if (!ask('Supprimer cette note ?')) return;
  const m = d.D().snotes.find((x) => x.id === el.dataset.id);
  if (m && m.audioId) await d.delAudio(m.audioId).catch(() => {});
  d.D().snotes = d.D().snotes.filter((x) => x.id !== el.dataset.id);
  d.save(); refreshModal(); rerenderKeepModal();
};
ACT['set-level'] = (el) => { ctx.st.level = +el.dataset.l; d.save(); toast(`Niveau ${el.dataset.l} : niveau actuel`); rerender(); };
ACT['toggle-obj'] = (el) => {
  const a = ctx.st.acquired;
  if (a[el.dataset.id]) delete a[el.dataset.id]; else a[el.dataset.id] = todayISO();
  d.save(); rerender();
};
FORMS['note-student'] = async (f, fd) => {
  const text = (fd.get('text') || '').trim();
  const audioId = await takePending('zn');
  if (audioId === false) return;
  if (!text && !audioId) { toast('Écrivez une note ou enregistrez un vocal'); return; }
  const s = ctx.st;
  d.D().notes.push({ id: d.uid(), profId: d.profOfStudent(s), authorId: d.me().id, scope: 'student', classId: s.classId, studentId: s.id, at: new Date().toISOString(), text, audioId });
  d.save(); toast('Note publiée'); rerender();
};
ACT['note-del'] = async (el) => {
  if (!ask('Supprimer cette note ?')) return;
  const m = d.D().notes.find((x) => x.id === el.dataset.id);
  if (m) for (const b of [m.audioId, ...(m.files || []).map((x) => x.id)]) if (b) await d.delAudio(b).catch(() => {});
  d.D().notes = d.D().notes.filter((x) => x.id !== el.dataset.id);
  d.save(); rerender();
};

export function eleveEdit(u, id) {
  const s = d.student(id);
  if (!d.canSeeStudent(u, s)) return shell(u, 2, '');
  ctx = { st: s };
  return shell(u, 2, `<div class="page narrow">${top('Modifier l’élève', esc(fullName(s)), `#/prof/eleve/${id}`)}
  ${studentForm(u, s)}
  <div class="ck pad col"><h2>Code de suivi</h2><span class="code">${esc(s.code)}</span>
  <button class="btn2 sm" data-act="regen" style="align-self:flex-start">${ic('refresh', 18)}Régénérer le code</button><span class="hint">L’ancien code ne fonctionnera plus (utile si le code a circulé).</span></div>
  <button class="btnd full" data-act="student-del">${ic('trash', 18)}Supprimer l’élève et toutes ses données</button></div>`);
}
ACT.regen = () => {
  if (!ask('Créer un nouveau code ? L’ancien ne marchera plus.')) return;
  const s = ctx.st; s.code = d.genCode(s, d.cls(s.classId)); d.save(); toast('Nouveau code créé'); rerender();
};
ACT['student-del'] = async () => {
  const s = ctx.st;
  if (!ask(`Supprimer ${fullName(s)} ?\n\nSon suivi (Coran, objectifs, présences, notes) sera effacé définitivement.`)) return;
  const cid = s.classId; await d.deleteStudent(s.id); toast('Élève supprimé'); go(`#/prof/classe/${cid}`);
};

// ---------- réglages ----------
export function reglages(u) {
  const items = (arr) => arr.map(([h, i, l, act]) => act ? `<button class="li" data-act="${act}" style="background:none;border:0;border-bottom:2px solid var(--neutral);width:100%;text-align:left;cursor:pointer;font:inherit;font-weight:600">${ic(i, 20)}<span class="grow">${l}</span>${ic('chev', 18)}</button>` : `<a class="li" href="${h}" style="font-weight:600">${ic(i, 20)}<span class="grow">${l}</span>${ic('chev', 18)}</a>`).join('');
  return shell(u, 3, `<div class="page narrow">${top('Réglages', '', null)}
  <div class="ck pad row">${av(u.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 52, 'var(--yellow)', 17)}<div><div class="b" style="font-size:18px">${esc(u.name)}</div><div class="small mut b">Identifiant : ${esc(u.login)}</div></div></div>
  ${myContactCard(u)}
  <div class="ck pad" style="padding-top:2px;padding-bottom:2px"><div class="list">${items([['#/prof/annuaire', 'users', 'Annuaire de l’équipe (téléphones, e-mails)'], ['#/prof/import', 'sheet', 'Importer des élèves (Excel)'], ['#/prof/objectifs', 'star', 'Objectifs Langue &amp; Religion par niveau'], ['', 'globe', 'Langue : français / العربية', 'lang'], ['#/prof/classes', 'grid', 'Mes classes'], ['#/mdp', 'key', 'Changer mon mot de passe']])}</div></div>
  <div class="ck pad" style="padding-top:2px;padding-bottom:2px"><div class="tiny mut b" style="padding-top:10px">DONNÉES &amp; CONFIDENTIALITÉ</div><div class="list">${items([['', 'dl', 'Exporter mes données (fichier)', 'export'], ...(d.D().demo ? [['', 'refresh', 'Réinitialiser la démo', 'reset-demo']] : [])])}</div></div>
  <button class="btn2 full" data-act="logout">${ic('out', 20)}Se déconnecter</button></div>`);
}
ACT.export = () => {
  const u = d.me();
  const cl = d.myClasses(u); const ids = cl.map((c) => c.id); const sts = d.D().students.filter((s) => ids.includes(s.classId)); const sids = sts.map((s) => s.id);
  const data = { exportedAt: new Date().toISOString(), prof: { name: u.name, login: u.login }, classes: cl, students: sts, attendance: d.D().attendance.filter((a) => ids.includes(a.classId)), objectives: d.D().objectives.filter((o) => d.isAdmin(u) || o.profId === u.id), notes: d.D().notes.filter((n) => d.isAdmin(u) || n.profId === u.id), ...(d.isAdmin(u) ? { announcements: d.D().announcements } : {}), sourateNotes: d.D().snotes.filter((n) => sids.includes(n.studentId)) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `suivi-export-${todayISO()}.json`; a.click();
};
ACT['reset-demo'] = async () => {
  if (!ask('Effacer toutes les données de cet appareil et recharger la démo ?')) return;
  await seed(); d.logout(); location.hash = '#/'; location.reload();
};

export function objectifs(u, q) {
  const pid = d.isAdmin(u) ? (q.get('p') || (d.profs()[0] || {}).id) : u.id;
  if (!pid) return shell(u, 3, `<div class="page">${top('Objectifs par niveau', '', '#/prof/reglages')}<p class="mut">Créez d’abord un professeur.</p></div>`);
  const levels = d.levelsOf(pid);
  const lv = +(q.get('n') || levels[0]);
  const objs = d.objectivesOf(pid, lv);
  const pq = d.isAdmin(u) ? `&p=${pid}` : '';
  const profPick = d.isAdmin(u) ? `<div class="seg" role="navigation" aria-label="Professeurs" style="overflow-x:auto">${d.profs().map((p) => `<a href="#/prof/objectifs?p=${p.id}" class="${p.id === pid ? 'on' : ''}">${esc(p.name)}</a>`).join('')}</div>` : '';
  const groups = [...new Set([...objs.map((o) => o.group), 'Langue arabe', 'Religion'])];
  ctx = { level: lv, pid };
  return shell(u, 3, `<div class="page narrow">${top('Objectifs par niveau', 'Langue &amp; Religion · communs à toutes vos classes', '#/prof/reglages')}
  ${profPick}
  <div class="seg" role="navigation" aria-label="Niveaux">${levels.map((l) => `<a href="#/prof/objectifs?n=${l}${pq}" class="${l === lv ? 'on' : ''}">Niveau ${l}</a>`).join('')}<button type="button" data-act="level-add" aria-label="Ajouter un niveau">${ic('plus', 18)}</button></div>
  ${groups.filter((g) => objs.some((o) => o.group === g)).map((g) => `<div class="ck pad col"><h2>${esc(g)}</h2><div class="list">${objs.filter((o) => o.group === g).map((o) => `<div class="li"><span class="grow" style="font-weight:600">${esc(o.text)}</span><button class="ib sm" data-act="obj-edit" data-id="${o.id}" aria-label="Modifier">${ic('edit', 16)}</button><button class="ib sm" data-act="obj-del" data-id="${o.id}" aria-label="Supprimer">${ic('trash', 16)}</button></div>`).join('')}</div></div>`).join('') || '<p class="mut">Aucun objectif pour ce niveau.</p>'}
  <form class="ck pad col" data-form="obj-add"><h2>Ajouter un objectif (niveau ${lv})</h2>
  <div class="field"><label class="lbl" for="ot">Objectif</label><input id="ot" name="text" class="inp" placeholder="ex. Lire un mot avec soukoun" required></div>
  <div class="field"><label class="lbl" for="og">Catégorie</label><select id="og" name="group" class="inp">${groups.map((g) => `<option>${esc(g)}</option>`).join('')}</select></div>
  <button class="btn full">${ic('plus', 20)}Ajouter</button></form></div>`);
}
FORMS['obj-add'] = (f, fd) => {
  const text = (fd.get('text') || '').trim(); if (!text) return;
  d.D().objectives.push({ id: d.uid(), profId: ctx.pid, level: ctx.level, group: fd.get('group') || 'Langue arabe', text });
  d.save(); toast('Objectif ajouté'); rerender();
};
ACT['obj-edit'] = (el) => {
  const o = d.D().objectives.find((x) => x.id === el.dataset.id);
  const t = askText('Modifier l’objectif :', o.text);
  if (t && t.trim()) { o.text = t.trim(); d.save(); rerender(); }
};
ACT['obj-del'] = (el) => {
  if (!ask('Supprimer cet objectif ? Il disparaîtra des fiches des élèves.')) return;
  d.D().objectives = d.D().objectives.filter((x) => x.id !== el.dataset.id);
  d.D().students.forEach((s) => delete s.acquired[el.dataset.id]);
  d.save(); rerender();
};
ACT['level-add'] = () => {
  const pid = ctx.pid;
  const n = Math.max(...d.levelsOf(pid)) + 1;
  d.D().objectives.push({ id: d.uid(), profId: pid, level: n, group: 'Langue arabe', text: 'Premier objectif du niveau ' + n });
  d.save(); go(`#/prof/objectifs?n=${n}${d.isAdmin(d.me()) ? '&p=' + pid : ''}`);
};
export { hydrateAudio };
