// Blocs de la fiche élève, partagés entre la vue parent (lecture seule) et la vue prof (édition)
import * as d from './data.js';
import { esc, ic, pill, fdate, fshort, STATUS, SST, msgHtml, composer, daysSince , devoirTag } from './ui.js';

export function parentBadge(st) {
  return `<span class="row small b par-l" style="gap:6px">${ic('users', 16)}<span>Parent :</span> <bdi>${esc(st.parent)}</bdi></span>`;
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
    return `<div class="hero2"><div class="row between" style="gap:10px;align-items:center"><div class="col" style="gap:0;min-width:0"><span class="tiny b hero-l">Sourate en cours · depuis ${daysSince(x.start)} j</span><span class="hero-big">${n} · ${esc(d.sName(n))}</span><span class="small b hero-s">Début d’apprentissage : ${fshort(x.start)}</span></div></div>
      ${last ? `<div class="col" style="gap:6px;background:#fff;color:var(--ink);border-radius:12px;padding:10px;border:2.5px solid #fff"><span class="tiny b">Dernière note de l’imam</span>${msgHtml(last)}</div>` : '<span class="small b hero-s">Pas encore de note.</span>'}
      <button type="button" class="btn y sm" data-act="${act}" data-n="${n}">${notes.length > 1 ? `Voir les ${notes.length} notes` : 'Ouvrir'} ${ic('chev', 18)}</button>
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
      ${edit ? composer('snote', 'zs' + n, `data-n="${n}"`, 'Ex : réviser versets 1 à 14 pour samedi…') + '<p class="tiny mut">Visible par l’élève et ses parents. Chaque note, vocal compris, est supprimée au bout de 30 jours, ou dès que la sourate est validée.</p>' : ''}
    </div>`;
  }
  return `<div class="row between"><div class="row"><span class="av s-${x.s}" style="width:52px;height:52px;font-size:17px">${n}</span><div><h2>${esc(d.sName(n))}</h2><span class="small mut b">Sourate n° ${n}</span></div></div>
  <button type="button" class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  ${seg}${dates}${thread}`;
}

// base : lien de l'onglet (ex. « #/f/CODE/langue ») ; view : niveau affiché (par défaut, le niveau actuel de l'élève).
// Tout le monde peut parcourir les niveaux (bandeau, flèches, ou glisser le doigt) pour voir ce qu'il y a à apprendre.
export function objectives(st, edit, view, base) {
  const pid = d.profOfStudent(st);
  const levels = d.levelsOf(pid);
  const cur = st.level || 1;
  const lv = levels.includes(+view) ? +view : cur;
  const objs = d.objectivesOf(pid, lv);
  const got = objs.filter((o) => st.acquired[o.id]).length;
  const groups = [...new Set(objs.map((o) => o.group))];
  const i = levels.indexOf(lv);
  const prev = i > 0 ? `${base}?n=${levels[i - 1]}` : '', next = i < levels.length - 1 ? `${base}?n=${levels[i + 1]}` : '';
  const seg = `<div class="seg" role="navigation" aria-label="Niveaux" style="overflow-x:auto">${levels.map((l) => `<a href="${base}?n=${l}" class="${l === lv ? 'on' : ''}" aria-current="${l === lv ? 'true' : 'false'}">Niveau ${l}${l === cur ? ' ★' : ''}</a>`).join('')}</div>`;
  const status = lv === cur
    ? `<div class="ck flat pad row wrap" style="background:var(--yellow);gap:8px;padding:10px 14px">${ic('star', 18)}<span class="b grow">Niveau actuel de ${esc(st.prenoms.split(' ')[0])}</span></div>`
    : `<div class="ck flat pad row wrap" style="background:var(--neutral);gap:8px;padding:10px 14px"><span class="b grow">${lv < cur ? 'Niveau précédent' : 'Niveau à venir'} · ${esc(st.prenoms.split(' ')[0])} est au niveau ${cur}</span>${edit ? `<button type="button" class="btn2 sm" data-act="set-level" data-l="${lv}">Passer au niveau ${lv}</button>` : ''}</div>`;
  const list = groups.map((g) => `<div class="ck pad col"><h3>${esc(g)}</h3>${objs.filter((o) => o.group === g).map((o) => {
    const ok = !!st.acquired[o.id];
    const box = edit
      ? `<button type="button" class="av" data-act="toggle-obj" data-id="${o.id}" aria-pressed="${ok}" aria-label="${ok ? 'Retirer' : 'Valider'} : ${esc(o.text)}" style="width:38px;height:38px;border-radius:10px;cursor:pointer;background:${ok ? 'var(--v)' : 'var(--surface)'};color:var(--onv)">${ok ? ic('check', 18, 3.4) : ''}</button>`
      : `<span class="av" style="width:30px;height:30px;border-radius:9px;background:${ok ? 'var(--v)' : 'var(--surface)'};color:var(--onv)">${ok ? ic('check', 16, 3.4) : ''}</span>`;
    return `<div class="row">${box}<span class="grow b small" style="font-weight:600">${esc(o.text)}</span>${ok ? `<span class="tiny mut b">${fshort(st.acquired[o.id])}</span>` : ''}</div>`;
  }).join('')}</div>`).join('');
  const arrows = levels.length > 1 ? `<div class="row between">${prev ? `<a class="btn2 sm" href="${prev}">${ic('back', 18)}Niveau ${levels[i - 1]}</a>` : '<span></span>'}${next ? `<a class="btn2 sm" href="${next}">Niveau ${levels[i + 1]}${ic('chev', 18)}</a>` : '<span></span>'}</div>` : '';
  return `<div class="row between"><h2>Langue &amp; Religion</h2><span class="b">${got} / ${objs.length} acquis</span></div>${seg}${status}
  <div class="bar"><i style="width:${objs.length ? (got / objs.length) * 100 : 0}%"></i></div>
  <div class="col" style="gap:14px" data-swipe-prev="${prev}" data-swipe-next="${next}">${list || '<p class="mut small">Aucun objectif défini pour ce niveau.</p>'}</div>${arrows}
  ${levels.length > 1 ? '<p class="tiny mut b center">Glissez le doigt à gauche ou à droite pour changer de niveau.</p>' : ''}`;
}

export function presence(st, limit = 50) {
  const p = d.presence(st);
  const rows = p.h.slice(0, limit).map((x) => {
    const S = STATUS[x.s];
    const lab = x.s === 'A' ? 'Absent à ce cours' : x.s === 'E' ? 'Absent · prévenu' : 'Présent';
    return `<div class="li"><span class="grow b small" style="font-weight:600">${fdate(x.date, { weekday: 'long', day: 'numeric', month: 'long' })}${x.n ? ` · <span class="mut">${x.n === 1 ? '1er cours' : x.n + 'e cours'}</span>` : ''}</span>${pill(lab, S.bg, S.fg)}</div>`;
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
    const tag = n.kind === 'devoir' ? devoirTag(n) : n.scope === 'class' ? pill('Toute la classe', 'var(--yellow)') : pill('Personnelle', 'var(--blue2)');
    return `<div class="col" style="gap:6px">${tag}${msgHtml(n, edit && n.scope === 'student' ? 'note-del' : null)}</div>`;
  }).join('');
  return `<div class="row between"><h2>Notes &amp; appréciations</h2></div>
  ${edit ? `<div class="ck pad col"><h3>Nouvelle note pour ${esc(st.prenoms.split(' ')[0])}</h3>${composer('note-student', 'zn', '', 'Appréciation, remarque, encouragement…')}</div>` : ''}
  <div class="col">${items || '<p class="mut small">Aucune note pour le moment.</p>'}</div>`;
}
