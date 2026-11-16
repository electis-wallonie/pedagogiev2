// Espace professeur : classes, élèves, appel, Coran, objectifs, notes, réglages
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, av, pill, fdate, flong, fshort, toast, openModal, closeModal, refreshModal, copyText, todayISO, daysSince,
  STATUS, COLORS, COLOR_NAMES, ACC, DAYS, initials, fullName, takePending, msgHtml, composer, hydrateAudio , ask, askText } from './ui.js';
import * as F from './fiche.js';
import { annoncesHtml } from './annonces.js';
import { seed } from './seed.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
const rerender = () => window.dispatchEvent(new Event('hashchange'));
let ctx = {};
const colorOf = (c) => COLORS[c.color] || COLORS.blue;
const hhmm = (t) => (t || '').replace(':', 'h');
const clsLabel = (c) => `${esc(c.name)} · ${DAYS[c.day]} ${hhmm(c.time)}`;

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

function nextOf(c) { const t = new Date().getDay(); return (c.day - t + 7) % 7; }

// ---------- tableau de bord ----------
export function dashboard(u) {
  const cl = d.myClasses(u);
  const sts = d.myStudents(u);
  const next = cl.slice().sort((a, b) => nextOf(a) - nextOf(b) || a.time.localeCompare(b.time))[0];
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
  const when = next ? (nextOf(next) === 0 ? 'AUJOURD’HUI' : nextOf(next) === 1 ? 'DEMAIN' : DAYS[next.day].toUpperCase()) : '';
  const body = `<div class="page">
  ${top(d.isAdmin(u) ? 'Vue d’ensemble' : `Bonjour ${esc(u.name)}`, fdate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' }), null)}
  ${annoncesHtml()}
  ${d.isAdmin(u) ? `<div class="grid3"><div class="ck stat" style="background:var(--pink)"><div class="v">${d.profs().length}</div><div class="l">professeurs</div></div><div class="ck stat" style="background:var(--blue2)"><div class="v">${cl.length}</div><div class="l">classes</div></div><div class="ck stat" style="background:var(--mint)"><div class="v">${sts.length}</div><div class="l">élèves</div></div></div>` : ''}
  ${next ? `<div class="ck pad row between wrap" style="background:var(--ink);color:#fff"><div><div class="tiny b" style="color:var(--yellow)">PROCHAIN COURS · ${when} ${hhmm(next.time)}</div><div class="b" style="font-size:24px;margin-top:4px">${esc(next.name)} · ${d.studentsOf(next.id).length} élèves</div></div>
  <a class="btn y" href="#/prof/classe/${next.id}/appel">${ic('check', 20)}Faire l’appel</a></div>` : `<div class="ck pad col" style="background:var(--hi)"><h2>Bienvenue !</h2><p class="b" style="font-weight:600">Commencez par créer votre première classe, puis ajoutez vos élèves.</p><a class="btn" href="#/prof/classes?new=1">${ic('plus', 20)}Créer une classe</a></div>`}
  <div class="grid3"><div class="ck stat" style="background:var(--yellow)"><div class="v">${sv}</div><div class="l">sourates validées (7 j)</div></div>
  <div class="ck stat" style="background:var(--blue2)"><div class="v">${oa}</div><div class="l">objectifs acquis (7 j)</div></div>
  <div class="ck stat" style="background:var(--mint)"><div class="v">${ap}</div><div class="l">appels faits (7 j)</div></div></div>
  <div class="grid2 stack" style="align-items:start">
  <div class="ck pad col"><h2>À surveiller</h2><div class="list">${watch.slice(0, 6).map(([s, t, c]) => `<a class="li" href="#/prof/eleve/${s.id}">${av(initials(s), 40, c, 13)}<span class="grow"><span class="b" style="display:block">${esc(fullName(s))}</span><span class="small mut b" style="font-weight:600">${esc(t)}</span></span>${ic('chev', 18)}</a>`).join('') || '<p class="small mut">Rien à signaler.</p>'}</div></div>
  <div class="col"><div class="row between"><h2>${d.isAdmin(u) ? 'Toutes les classes' : 'Mes classes'}</h2><a href="#/prof/classes" class="small">Tout voir</a></div>
  <div class="grid2">${cl.map((c) => classTile(c)).join('')}</div>
  <div class="grid2"><a class="btn2" href="#/prof/eleve/new">${ic('plus', 20)}Élève</a><a class="btn2" href="#/prof/classes?new=1">${ic('plus', 20)}Classe</a></div></div>
  </div></div>`;
  return shell(u, 0, body);
}
function classTile(c) {
  const today = d.attendanceOfClass(c.id).find((a) => a.date === todayISO());
  return `<a href="#/prof/classe/${c.id}" class="ck tile" style="background:${colorOf(c)}"><span class="big">${esc(c.name.replace(/^classe\s*/i, '') || c.name[0])}</span>
  <span><span class="b" style="display:block;font-size:17px">${esc(c.name)}</span><span class="small b" style="font-weight:600">${DAYS[c.day]} ${hhmm(c.time)} · ${d.studentsOf(c.id).length} élèves</span>${d.isAdmin(d.me()) ? `<span class="tiny b" style="display:block">${esc((d.user(c.profId) || {}).name || '')}</span>` : ''}${today ? '<span class="tiny b" style="display:block">Appel fait aujourd’hui</span>' : ''}</span></a>`;
}

// ---------- classes ----------
export function classes(u, q) {
  const cl = d.myClasses(u);
  const body = `<div class="page">${top(d.isAdmin(u) ? 'Toutes les classes' : 'Mes classes', `${cl.length} classe(s) · ${d.myStudents(u).length} élèves`, null, `<button class="btn sm" data-act="class-new">${ic('plus', 18)}Classe</button>`)}
  <div class="gridauto">${cl.map(classTile).join('')}<button class="ck tile flat" data-act="class-new" style="border-style:dashed;align-items:center;justify-content:center;cursor:pointer;background:var(--surface)">${ic('plus', 30)}<span class="b">Nouvelle classe</span></button></div></div>`;
  if (q.get('new')) setTimeout(() => classForm(u), 0);
  return shell(u, 1, body);
}
function classForm(u, c = null) {
  const pid = c ? c.profId : (d.isAdmin(u) ? (d.profs()[0] || {}).id : u.id);
  const levels = d.levelsOf(pid);
  const profSel = d.isAdmin(u) ? `<div class="field"><label class="lbl" for="cp">Professeur</label><select id="cp" name="profId" class="inp">${d.profs().map((p) => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : '';
  openModal(() => `<div class="row between"><h2>${c ? 'Modifier la classe' : 'Nouvelle classe'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="class" data-id="${c ? c.id : ''}">
  <div class="field"><label class="lbl" for="cn">Nom de la classe</label><input id="cn" name="name" class="inp" required value="${esc(c ? c.name : `Classe ${d.myClasses(u).length + 1}`)}"></div>
  ${profSel}
  <div class="grid2"><div class="field"><label class="lbl" for="cd">Jour</label><select id="cd" name="day" class="inp">${[6, 0, 1, 2, 3, 4, 5].map((k) => `<option value="${k}" ${(c ? c.day : 6) === k ? 'selected' : ''}>${DAYS[k]}</option>`).join('')}</select></div>
  <div class="field"><label class="lbl" for="ct">Heure</label><input id="ct" name="time" type="time" class="inp" value="${c ? c.time : '10:00'}" required></div></div>
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
  const v = { name: (fd.get('name') || '').trim() || 'Classe', day: +fd.get('day'), time: fd.get('time') || '10:00', color: fd.get('color') || 'blue', level: +fd.get('level') || 1 };
  if (d.isAdmin(u)) { if (!fd.get('profId')) { toast('Créez d’abord un professeur'); return; } v.profId = fd.get('profId'); }
  if (id) Object.assign(d.cls(id), v);
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
  const acts = [[`#/prof/classe/${id}/appel`, 'check', 'Faire l’appel', 'var(--primary)', '#fff'], [`#/prof/eleve/new?c=${id}`, 'plus', 'Élève', 'var(--surface)', 'var(--ink)'], [`#/prof/classe/${id}/historique`, 'clock', 'Historique', 'var(--surface)', 'var(--ink)'], ['#notes-classe', 'note', 'Note classe', 'var(--surface)', 'var(--ink)']];
  const body = `<div class="page">${top(esc(c.name), `${DAYS[c.day]} ${hhmm(c.time)} · ${sts.length} élève(s)`, '#/prof/classes', `<button class="ib" data-act="class-edit" data-id="${id}" aria-label="Modifier la classe">${ic('edit', 18)}</button>`)}
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">${acts.map(([h, i, l, bg, fg]) => `<a href="${h}" class="ck col" style="gap:6px;align-items:center;padding:12px 4px;text-decoration:none;background:${bg};color:${fg};font-weight:800;font-size:13px;text-align:center">${ic(i, 24)}${l}</a>`).join('')}</div>
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${sts.map((s, k) => {
    const p = d.presence(s); const kk = d.coranStats(s);
    return `<a class="li" href="#/prof/eleve/${s.id}">${av(initials(s), 42, ACC[k % 4], 14)}<span class="grow"><span class="b" style="display:block">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b" style="font-weight:600">${kk.v} sourates · ${p.rate === null ? '—' : p.rate + ' %'} présence</span></span>${ic('chev', 18)}</a>`;
  }).join('') || `<div class="col" style="padding:14px 0"><p class="mut small">Pas encore d’élève dans cette classe.</p><a class="btn" href="#/prof/eleve/new?c=${id}">${ic('plus', 20)}Ajouter un élève</a></div>`}</div></div>
  <div class="ck pad col" id="notes-classe"><h2>Notes pour toute la classe</h2><p class="small mut b" style="font-weight:600">Visibles sur la fiche de chaque élève de ${esc(c.name)}.</p>
  ${composer('note-class', 'zc', '', 'Ex : pas de cours samedi prochain…')}
  <div class="col">${notes.map((n) => msgHtml(n, 'note-del')).join('')}</div></div></div>`;
  return shell(u, 1, body);
}
FORMS['note-class'] = async (f, fd) => {
  const text = (fd.get('text') || '').trim();
  const audioId = await takePending('zc');
  if (audioId === false) return;
  if (!text && !audioId) { toast('Écrivez une note ou enregistrez un vocal'); return; }
  d.D().notes.push({ id: d.uid(), profId: ctx.cls.profId, authorId: d.me().id, scope: 'class', classId: ctx.cls.id, studentId: null, at: new Date().toISOString(), text, audioId });
  d.save(); toast('Note publiée'); rerender();
};

// ---------- appel ----------
function getRec(classId, date) { return d.D().attendance.find((a) => a.classId === classId && a.date === date); }
export function appel(u, id, date) {
  const c = d.cls(id);
  if (!d.canSeeClass(u, c)) return shell(u, 1, '');
  date = date || todayISO();
  ctx = { cls: c, date };
  const rec = getRec(id, date);
  const r = rec ? rec.records : {};
  const sts = d.studentsOf(id);
  const cnt = (k) => sts.filter((s) => r[s.id] === k).length;
  const rest = sts.filter((s) => !r[s.id]).length;
  const rows = sts.map((s) => `<div class="ck flat appel-row"><span class="grow b">${esc(s.prenoms.split(' ')[0])} ${esc(s.nom)}</span>
  ${['P', 'A', 'E'].map((k) => `<button type="button" class="st-btn ${r[s.id] === k ? 'on-' + k : ''}" data-act="ap" data-sid="${s.id}" data-s="${k}" aria-pressed="${r[s.id] === k}" aria-label="${STATUS[k].l} : ${esc(s.prenoms.split(' ')[0])}">${ic(STATUS[k].icon, 20, 2.8)}<span class="lab">${k === 'E' ? 'Prévenu' : STATUS[k].l}</span></button>`).join('')}</div>`).join('');
  const body = `<div class="page">${top('L’appel', esc(c.name), `#/prof/classe/${id}`)}
  <div class="ck pad row between wrap"><div class="field"><label class="lbl" for="ad">Date du cours (enregistrée automatiquement)</label><input id="ad" type="date" class="inp" value="${date}" data-change="ap-date" style="max-width:220px"></div>
  <span class="b" style="text-transform:capitalize">${flong(date)}</span></div>
  <div class="row wrap" style="gap:8px">${pill(cnt('P') + ' présent(s)', 'var(--present)', 'var(--onpresent)')}${pill(cnt('A') + ' absent(s)', 'var(--absent)', 'var(--onabsent)')}${pill(cnt('E') + ' prévenu(s)', 'var(--prev)')}${rest ? pill(rest + ' à marquer', 'var(--neutral)') : ''}</div>
  ${rest ? `<button class="btn2 sm" data-act="ap-all" style="align-self:flex-start">${ic('check', 18)}Marquer les ${rest} restant(s) présents</button>` : ''}
  <div class="col" style="gap:8px">${rows || '<p class="mut">Aucun élève dans cette classe.</p>'}</div>
  <div class="row tiny mut b" style="justify-content:flex-end;gap:20px;padding-right:6px"><span>${ic('check', 14)} Présent</span><span>${ic('x', 14)} Absent</span><span>${ic('mail', 14)} Absent prévenu</span></div>
  <a href="#/prof/classe/${id}/appel/${date}/ok" class="btn full">Terminer l’appel</a></div>`;
  return shell(u, 1, body);
}
ACT.ap = (el) => {
  let rec = getRec(ctx.cls.id, ctx.date);
  if (!rec) { rec = { id: d.uid(), classId: ctx.cls.id, date: ctx.date, records: {} }; d.D().attendance.push(rec); }
  rec.records[el.dataset.sid] = el.dataset.s;
  d.save(); rerender();
};
ACT['ap-all'] = () => {
  let rec = getRec(ctx.cls.id, ctx.date);
  if (!rec) { rec = { id: d.uid(), classId: ctx.cls.id, date: ctx.date, records: {} }; d.D().attendance.push(rec); }
  d.studentsOf(ctx.cls.id).forEach((s) => { if (!rec.records[s.id]) rec.records[s.id] = 'P'; });
  d.save(); rerender();
};
CHANGE['ap-date'] = (el) => { if (el.value) go(`#/prof/classe/${ctx.cls.id}/appel/${el.value}`); };

export function appelOk(u, id, date) {
  const c = d.cls(id);
  const rec = getRec(id, date);
  const r = rec ? rec.records : {};
  const sts = d.studentsOf(id);
  const cnt = (k) => sts.filter((s) => r[s.id] === k).length;
  const abs = sts.filter((s) => r[s.id] === 'A' || r[s.id] === 'E');
  const rest = sts.filter((s) => !r[s.id]);
  const body = `<div class="page narrow"><div class="col center" style="align-items:center;padding-top:20px">
  <span class="av" style="width:76px;height:76px;background:var(--mint)">${ic('check', 38, 3.4)}</span><h1>Appel enregistré</h1>
  <p class="mut b" style="text-transform:capitalize">${esc(c.name)} · ${flong(date)}</p></div>
  <div class="grid3"><div class="ck stat" style="background:var(--present);color:var(--onpresent)"><div class="v">${cnt('P')}</div><div class="l">présents</div></div><div class="ck stat" style="background:var(--absent);color:var(--onabsent)"><div class="v">${cnt('A')}</div><div class="l">absents</div></div><div class="ck stat" style="background:var(--prev)"><div class="v">${cnt('E')}</div><div class="l">prévenus</div></div></div>
  ${rest.length ? `<div class="err">${rest.length} élève(s) pas encore marqué(s) : ${rest.map((s) => esc(s.prenoms.split(' ')[0])).join(', ')}</div>` : ''}
  ${abs.length ? `<div class="ck pad col"><h2>Absents ce jour</h2>${abs.map((s) => `<div class="row between"><span class="b">${esc(fullName(s))}</span>${pill(r[s.id] === 'A' ? 'Absent' : 'Prévenu', STATUS[r[s.id]].bg, STATUS[r[s.id]].fg)}</div>`).join('')}<p class="small mut b" style="font-weight:600">C’est déjà visible sur leur fiche.</p></div>` : ''}
  <a class="btn full" href="#/prof/classe/${id}">Retour à la classe</a><a class="btn2 full" href="#/prof/classe/${id}/appel/${date}">Modifier l’appel</a></div>`;
  return shell(u, 1, body);
}
export function historique(u, id) {
  const c = d.cls(id);
  const list = d.attendanceOfClass(id);
  const body = `<div class="page">${top('Historique des appels', esc(c.name), `#/prof/classe/${id}`)}
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${list.map((a) => {
    const v = Object.values(a.records);
    const k = (s) => v.filter((x) => x === s).length;
    return `<a class="li" href="#/prof/classe/${id}/appel/${a.date}"><span class="grow b" style="text-transform:capitalize">${fdate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>${pill(k('P'), 'var(--present)', 'var(--onpresent)')}${pill(k('A'), 'var(--absent)', 'var(--onabsent)')}${pill(k('E'), 'var(--prev)')}${ic('chev', 18)}</a>`;
  }).join('') || '<p class="mut small" style="padding:12px 0">Aucun appel pour le moment.</p>'}</div></div>
  <p class="tiny mut b">Vert : présents · Rouge : absents · Jaune : absents prévenus. Touchez une date pour corriger l’appel.</p></div>`;
  return shell(u, 1, body);
}

// ---------- élèves ----------
export function eleves(u) {
  const sts = d.myStudents(u).sort((a, b) => a.nom.localeCompare(b.nom));
  const body = `<div class="page">${top('Élèves', `${sts.length} élève(s)`, null, `<a class="btn sm" href="#/prof/eleve/new">${ic('plus', 18)}Élève</a>`)}
  <div class="field"><label class="sr" for="q">Rechercher</label><input id="q" class="inp" placeholder="Rechercher un élève…" data-filter=".li"></div>
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${sts.map((s, k) => `<a class="li" href="#/prof/eleve/${s.id}" data-q="${esc((s.prenoms + ' ' + s.nom + ' ' + d.cls(s.classId).name).toLowerCase())}">${av(initials(s), 42, ACC[k % 4], 14)}<span class="grow"><span class="b" style="display:block">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b" style="font-weight:600">${esc(d.cls(s.classId).name)} · ${d.coranStats(s).v} sourates</span></span>${ic('chev', 18)}</a>`).join('') || '<p class="mut small" style="padding:12px 0">Aucun élève.</p>'}</div></div></div>`;
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
  <details ${s && s.naissance ? 'open' : ''}><summary class="small b" style="cursor:pointer">Date de naissance précise (facultatif)</summary><div class="field" style="margin-top:8px"><label class="lbl" for="sb">Date de naissance</label><input id="sb" name="naissance" type="date" class="inp" value="${s && s.naissance ? s.naissance : ''}"><span class="hint">Si elle est remplie, l’âge est calculé à partir d’elle.</span></div></details>
  ${s ? '' : '<div class="ck flat pad small b" style="background:var(--yellow);font-weight:600">Le code de suivi est créé automatiquement : classe, initiales, prénom du parent, âge, + 4 caractères de sécurité.</div>'}
  <button class="btn full">${s ? 'Enregistrer' : 'Ajouter l’élève'}</button></form>`;
}
export function eleveNew(u, q) {
  return shell(u, 2, `<div class="page narrow">${top('Nouvel élève', '4 infos, le code se crée tout seul', q.get('c') ? `#/prof/classe/${q.get('c')}` : '#/prof/eleves')}${studentForm(u, null, q.get('c'))}</div>`);
}
FORMS.student = (f, fd) => {
  const u = d.me();
  const id = f.dataset.id;
  const v = { classId: fd.get('classId'), nom: (fd.get('nom') || '').trim(), prenoms: (fd.get('prenoms') || '').trim().replace(/\s+/g, ' '), naissance: fd.get('naissance') || null, parent: (fd.get('parent') || '').trim() };
  const age = parseInt(fd.get('age'), 10);
  if (!v.nom || !v.prenoms || !v.parent || (!v.naissance && !(age > 0))) { toast('Merci de remplir tous les champs'); return; }
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
export function eleve(u, id, tab = 'coran') {
  const s = d.student(id);
  if (!d.canSeeStudent(u, s)) return shell(u, 2, `<div class="page">${top('Élève introuvable', '', '#/prof/eleves')}</div>`);
  ctx = { st: s };
  const c = d.cls(s.classId);
  let body = '';
  if (tab === 'coran') body = `${F.coranHead(s)}<h3>En cours</h3>${F.enCoursCards(s, 'sour')}<div class="ck pad col"><p class="small b">Touchez une sourate pour changer son état, ses dates ou laisser une note.</p>${F.mushaf(s, 'sour')}${F.legend()}</div>`;
  else if (tab === 'langue') body = F.objectives(s, true);
  else if (tab === 'presence') body = F.presence(s);
  else body = F.notes(s, true);
  return shell(u, 2, `<div class="page">
  <div class="top"><a href="#/prof/classe/${c.id}" class="ib" aria-label="Retour">${ic('back', 20)}</a>${av(initials(s), 56, 'var(--yellow)', 19)}<div class="grow"><h1 style="font-size:24px">${esc(s.prenoms)} ${esc(s.nom)}</h1><div class="row wrap" style="gap:8px;margin-top:4px">${pill(esc(c.name), colorOf(c))}<span class="small mut b">${d.ageOf(s) ?? '—'} ans</span></div></div>
  <a class="ib" href="#/prof/eleve/${id}/edit" aria-label="Modifier l’élève">${ic('edit', 18)}</a></div>
  ${F.parentBadge(s)}
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
ACT['set-level'] = (el) => { ctx.st.level = +el.dataset.l; d.save(); rerender(); };
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
  if (m && m.audioId) await d.delAudio(m.audioId).catch(() => {});
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
  <div class="ck pad" style="padding-top:2px;padding-bottom:2px"><div class="list">${items([['#/prof/import', 'sheet', 'Importer des élèves (Excel)'], ['#/prof/objectifs', 'star', 'Objectifs Langue &amp; Religion par niveau'], ['', 'globe', 'Langue : français / العربية', 'lang'], ['#/prof/classes', 'grid', 'Mes classes'], ['#/mdp', 'key', 'Changer mon mot de passe']])}</div></div>
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
