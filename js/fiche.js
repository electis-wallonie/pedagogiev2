// Blocs de la fiche élève, partagés entre la vue parent (lecture seule) et la vue prof (édition)
import * as d from './data.js';
import { esc, ic, pill, fdate, fshort, STATUS, SST, msgHtml, composer, daysSince } from './ui.js';

export function parentBadge(st) {
  return `<div class="ck flat row" style="background:var(--yellow);padding:10px 14px;gap:10px">${ic('users', 22)}<span style="font-size:18px"><span class="b">Parent :</span> <bdi class="b" style="font-size:20px">${esc(st.parent)}</bdi></span><span class="grow"></span><span class="pill" style="background:var(--surface)">${d.ageOf(st) ?? '—'} ans</span></div>`;
}
export function legend() {
  return `<div class="legend"><span><i class="s-v"></i>Validée</span><span><i class="s-c" style="border:2px solid var(--ink)"></i>En cours</span><span><i class="s-n" style="border:1px solid var(--muted)"></i>Non connue</span></div>`;
}
export function mushaf(st, act) {
  let h = '';
  for (let n = 1; n <= 114; n++) {
    const s = d.sState(st, n);
    h += `<button type="button" class="s-${s}" data-act="${act}" data-n="${n}" aria-label="${n} ${esc(d.sName(n))} : ${SST[s]}">${n}</button>`;
  }
  return `<div class="mushaf">${h}</div>`;
}
export function coranHead(st) {
  const k = d.coranStats(st);
  return `<div class="row between"><h2>Coran</h2><span class="b">${k.v} / 114 validées</span></div>
  <div class="bar" role="img" aria-label="${k.v} sourates validées sur 114"><i style="width:${(k.v / 114) * 100}%"></i></div>`;
}
export function enCoursCards(st, act) {
  const cur = d.enCours(st);
  if (!cur.length) return `<div class="ck flat pad mut small">Aucune sourate en cours pour le moment.</div>`;
  return cur.map((n) => {
    const x = st.coran[n];
    const notes = d.sourateNotes(st.id, n);
    const last = notes[notes.length - 1];
    return `<div class="ck pad col" style="background:var(--hi)">
      <div class="row between wrap">${pill('En cours', 'var(--c)')}<span class="small b">Début d’apprentissage : ${fshort(x.start)}</span></div>
      <div class="row between"><h3 style="font-size:21px">${n} · ${esc(d.sName(n))}</h3><span class="tiny mut b">depuis ${daysSince(x.start)} j</span></div>
      ${last ? `<div class="col" style="gap:6px"><span class="tiny b">Dernière note de l’imam</span>${msgHtml(last)}</div>` : '<span class="small mut">Pas encore de note.</span>'}
      <button type="button" class="btn2 sm" data-act="${act}" data-n="${n}">${notes.length > 1 ? `Voir les ${notes.length} notes` : 'Ouvrir'} ${ic('chev', 18)}</button>
    </div>`;
  }).join('');
}

// Fenêtre d'une sourate : dates + notes (texte / vocal)
export function sourateSheet(st, n, edit) {
  const x = (st.coran && st.coran[n]) || { s: 'n' };
  const notes = d.sourateNotes(st.id, n);
  const seg = edit ? `<div class="seg" role="group" aria-label="État">${['n', 'c', 'v'].map((s) => `<button type="button" class="${x.s === s ? 'on' : ''}" data-act="sour-state" data-n="${n}" data-s="${s}" aria-pressed="${x.s === s}">${SST[s]}</button>`).join('')}</div>` : `<div>${pill(SST[x.s], `var(--${x.s})`, `var(--on${x.s})`)}</div>`;
  let dates = '';
  if (x.s !== 'n') {
    dates = edit
      ? `<div class="grid2"><div class="field"><label class="lbl" for="sd1">Début d’apprentissage</label><input id="sd1" type="date" class="inp" value="${x.start || ''}" data-change="sour-date" data-n="${n}" data-k="start"></div>
         ${x.s === 'v' ? `<div class="field"><label class="lbl" for="sd2">Validée le</label><input id="sd2" type="date" class="inp" value="${x.end || ''}" data-change="sour-date" data-n="${n}" data-k="end"></div>` : `<div class="field"><span class="lbl">Validée le</span><div class="inp" style="display:flex;align-items:center;background:var(--neutral)">pas encore</div></div>`}</div>`
      : `<div class="ck flat pad col" style="gap:8px"><div class="row between small b"><span>Début d’apprentissage</span><span>${fshort(x.start)}</span></div><div class="row between small b"><span>Validée le</span><span>${x.end ? fshort(x.end) : 'pas encore'}</span></div></div>`;
  }
  let thread = '';
  if (x.s === 'c') {
    thread = `<div class="col"><h3>Notes de l’imam</h3>
      ${notes.length ? `<div class="thread">${notes.map((m) => msgHtml(m, edit ? 'snote-del' : null)).join('')}</div>` : '<p class="small mut">Pas encore de note sur cette sourate.</p>'}
      ${edit ? composer('snote', 'zs' + n, `data-n="${n}"`, 'Ex : réviser versets 1 à 14 pour samedi…') + '<p class="tiny mut">Visible par l’élève et ses parents. Ces notes s’effacent quand la sourate est validée.</p>' : ''}
    </div>`;
  }
  return `<div class="row between"><div class="row"><span class="av s-${x.s}" style="width:52px;height:52px;font-size:17px">${n}</span><div><h2>${esc(d.sName(n))}</h2><span class="small mut b">Sourate n° ${n}</span></div></div>
  <button type="button" class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  ${seg}${dates}${thread}`;
}

export function objectives(st, edit) {
  const pid = d.profOfStudent(st);
  const levels = d.levelsOf(pid);
  const lv = st.level || 1;
  const objs = d.objectivesOf(pid, lv);
  const got = objs.filter((o) => st.acquired[o.id]).length;
  const groups = [...new Set(objs.map((o) => o.group))];
  const seg = `<div class="seg" role="group" aria-label="Niveau">${levels.map((l) => edit ? `<button type="button" class="${l === lv ? 'on' : ''}" data-act="set-level" data-l="${l}">Niveau ${l}</button>` : `<span class="${l === lv ? 'on' : ''}" style="flex:1 1 0;min-height:42px;border-radius:var(--ri);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px">Niveau ${l}</span>`).join('')}</div>`;
  const list = groups.map((g) => `<div class="ck pad col"><h3>${esc(g)}</h3>${objs.filter((o) => o.group === g).map((o) => {
    const ok = !!st.acquired[o.id];
    const box = edit
      ? `<button type="button" class="av" data-act="toggle-obj" data-id="${o.id}" aria-pressed="${ok}" aria-label="${ok ? 'Retirer' : 'Valider'} : ${esc(o.text)}" style="width:38px;height:38px;border-radius:10px;cursor:pointer;background:${ok ? 'var(--v)' : 'var(--surface)'};color:var(--onv)">${ok ? ic('check', 18, 3.4) : ''}</button>`
      : `<span class="av" style="width:30px;height:30px;border-radius:9px;background:${ok ? 'var(--v)' : 'var(--surface)'};color:var(--onv)">${ok ? ic('check', 16, 3.4) : ''}</span>`;
    return `<div class="row">${box}<span class="grow b small" style="font-weight:600">${esc(o.text)}</span>${ok ? `<span class="tiny mut b">${fshort(st.acquired[o.id])}</span>` : ''}</div>`;
  }).join('')}</div>`).join('');
  return `<div class="row between"><h2>Langue &amp; Religion</h2><span class="b">${got} / ${objs.length} acquis</span></div>${seg}
  <div class="bar"><i style="width:${objs.length ? (got / objs.length) * 100 : 0}%"></i></div>${list || '<p class="mut small">Aucun objectif défini pour ce niveau.</p>'}`;
}

export function presence(st, limit = 50) {
  const p = d.presence(st);
  const rows = p.h.slice(0, limit).map((x) => {
    const S = STATUS[x.s];
    const lab = x.s === 'A' ? 'Absent à ce cours' : x.s === 'E' ? 'Absent · prévenu' : 'Présent';
    return `<div class="li"><span class="grow b small" style="font-weight:600;text-transform:capitalize">${fdate(x.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>${pill(lab, S.bg, S.fg)}</div>`;
  }).join('');
  return `<div class="row between"><h2>Présence</h2><span class="b">${p.rate === null ? '—' : p.rate + ' %'}</span></div>
  <div class="grid3"><div class="ck stat" style="background:var(--present);color:var(--onpresent)"><div class="v">${p.P}</div><div class="l">présent</div></div>
  <div class="ck stat" style="background:var(--prev)"><div class="v">${p.E}</div><div class="l">absent prévenu</div></div>
  <div class="ck stat" style="background:var(--absent);color:var(--onabsent)"><div class="v">${p.A}</div><div class="l">absent</div></div></div>
  <div class="ck pad" style="padding-top:4px;padding-bottom:4px"><div class="list">${rows || '<p class="mut small" style="padding:12px 0">Pas encore d’appel enregistré.</p>'}</div></div>`;
}

export function notes(st, edit) {
  const list = d.notesForStudent(st);
  const items = list.map((n) => {
    const tag = n.scope === 'class' ? pill('Toute la classe', 'var(--yellow)') : pill('Personnelle', 'var(--blue2)');
    return `<div class="col" style="gap:6px">${tag}${msgHtml(n, edit && n.scope === 'student' ? 'note-del' : null)}</div>`;
  }).join('');
  return `<div class="row between"><h2>Notes &amp; appréciations</h2></div>
  ${edit ? `<div class="ck pad col"><h3>Nouvelle note pour ${esc(st.prenoms.split(' ')[0])}</h3>${composer('note-student', 'zn', '', 'Appréciation, remarque, encouragement…')}</div>` : ''}
  <div class="col">${items || '<p class="mut small">Aucune note pour le moment.</p>'}</div>`;
}
