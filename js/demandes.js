// Demandes d'inscription : formulaire public (onglet Cours) → rubrique « Demandes » de la direction
// (méga administrateur + administrateurs) → visibles « en attente » dans la comptabilité.
import * as d from './data.js';
import { ACT, FORMS, esc, ic, pill, fdate, toast, todayISO } from './ui.js';
import { pubShell, config } from './mosquee.js';
import { shell } from './prof.js';

// Année scolaire : de septembre à août. offset 0 = l'année en cours, 1 = la suivante.
export function schoolYear(offset = 0, now = new Date()) {
  const y = (now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1) + offset;
  return `${y}–${y + 1}`;
}
const list = () => (d.D().demandes = d.D().demandes || []);
export const pending = () => list().filter((x) => x.status === 'new');

// ---------- Public : le formulaire ----------
export function inscription(q) {
  if (q && q.get('ok')) {
    return pubShell(2, `<div class="ck pad col dm-ok">
      <span class="dm-okic">${ic('check', 30)}</span>
      <h1 style="margin:0">Demande envoyée</h1>
      <p class="b" style="font-weight:600;line-height:1.5">Merci ! La mosquée a bien reçu votre demande d’inscription. Elle vous recontactera par téléphone ou par e-mail.</p>
      <a class="btn full" href="#/cours">${ic('back', 18)}Retour aux cours</a></div>`);
  }
  const cours = (config().cours || []).filter((c) => c && c.public);
  const opt = (name, value, label, sub, checked) => `<label class="dm-opt"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} required><span class="col" style="gap:0"><span class="b" dir="auto">${esc(label)}</span>${sub ? `<span class="tiny mut b" dir="auto">${esc(sub)}</span>` : ''}</span></label>`;
  return pubShell(2, `<form class="col dm-form" data-form="demande" style="gap:14px" novalidate>
  <a href="#/cours" class="small b row" style="gap:6px">${ic('back', 16)}Cours</a>
  <div class="col" style="gap:2px"><h1 style="margin:0">Demande d’inscription</h1><span class="small mut b" style="font-weight:600">Remplissez ce formulaire : la mosquée étudie votre demande et vous recontacte.</span></div>
  ${cours.length ? `<fieldset class="ck pad col dm-set"><legend class="b">Cours souhaité</legend><div class="dm-opts">${cours.map((c, k) => opt('cours', c.public, c.public, c.detail, k === 0)).join('')}</div></fieldset>` : ''}
  <fieldset class="ck pad col dm-set"><legend class="b">Pour quelle année ?</legend><div class="dm-opts two">${opt('annee', schoolYear(0), 'Cette année', schoolYear(0), true)}${opt('annee', schoolYear(1), 'L’année prochaine', schoolYear(1), false)}</div></fieldset>
  <fieldset class="ck pad col dm-set"><legend class="b">L’élève</legend>
    <div class="grid2"><div class="field"><label class="lbl" for="dp">Prénom</label><input id="dp" name="prenoms" class="inp" required autocomplete="given-name"></div>
    <div class="field"><label class="lbl" for="dn">Nom</label><input id="dn" name="nom" class="inp" required autocomplete="family-name"></div></div>
    <div class="field" style="max-width:160px"><label class="lbl" for="da">Âge</label><input id="da" name="age" class="inp" type="number" inputmode="numeric" min="3" max="99" required></div>
  </fieldset>
  <fieldset class="ck pad col dm-set"><legend class="b">Parent ou responsable</legend>
    <span class="hint" style="margin-top:-4px">Pour un adulte qui s’inscrit lui-même, indiquez votre propre nom.</span>
    <div class="field"><label class="lbl" for="dpar">Nom et prénom</label><input id="dpar" name="parent" class="inp" required autocomplete="name"></div>
    <div class="grid2"><div class="field"><label class="lbl" for="dt">Téléphone</label><input id="dt" name="tel" class="inp" type="tel" inputmode="tel" required autocomplete="tel"></div>
    <div class="field"><label class="lbl" for="de">E-mail</label><input id="de" name="email" class="inp" type="email" inputmode="email" required autocomplete="email" autocapitalize="none"></div></div>
  </fieldset>
  <div class="field"><label class="lbl" for="dm">Message <span class="mut">(facultatif)</span></label><textarea id="dm" name="message" class="inp" rows="3" placeholder="Niveau, disponibilités, question…"></textarea></div>
  <p class="tiny mut b" style="font-weight:600">Vos coordonnées servent uniquement à la mosquée pour traiter cette demande.</p>
  <button class="btn full">${ic('send', 18)}Envoyer la demande</button>
  </form>`);
}

FORMS.demande = async (f, fd) => {
  const v = {
    cours: fd.get('cours') || '', annee: fd.get('annee') || schoolYear(0),
    prenoms: (fd.get('prenoms') || '').trim().replace(/\s+/g, ' '), nom: (fd.get('nom') || '').trim(),
    age: parseInt(fd.get('age'), 10) || null, parent: (fd.get('parent') || '').trim(),
    tel: (fd.get('tel') || '').trim(), email: (fd.get('email') || '').trim().toLowerCase(), message: (fd.get('message') || '').trim(),
  };
  if (!v.prenoms || !v.nom || !v.age || !v.parent) { toast('Merci de remplir tous les champs'); return; }
  if (v.tel.replace(/[^\d]/g, '').length < 8) { toast('Indiquez un numéro de téléphone'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { toast('Indiquez une adresse e-mail valide'); return; }
  const item = { id: d.uid(), at: new Date().toISOString(), status: 'new', ...v };
  // En ligne (Cloudflare) : la demande part vers le serveur de la mosquée (mosquee.json → "api").
  // En démo : elle est enregistrée sur cet appareil, comme le reste des données.
  const api = (config().api || '').replace(/\/$/, '');
  if (api) {
    try { const r = await fetch(api + '/demandes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }); if (!r.ok) throw new Error(r.status); }
    catch { toast('Envoi impossible pour le moment. Réessayez dans un instant.'); return; }
  } else { list().push(item); d.save(); }
  location.hash = '#/inscription?ok=1';
};

// ---------- Direction : la rubrique « Demandes » ----------
export function demandesTile() {
  const n = pending().length;
  return `<a href="#/admin/demandes" class="ck pad col" style="gap:6px;text-decoration:none;color:var(--ink);background:var(--mint)"><span class="row between"><span class="b" style="font-size:18px">${ic('users', 20)} Demandes d’inscription</span>${ic('chev', 18)}</span>
  <span style="font-size:22px;font-weight:800">${n ? `${n} en attente` : 'Aucune en attente'}</span>
  <span class="small b" style="font-weight:600">Envoyées depuis l’onglet Cours du site public</span></a>`;
}
const ST = { new: ['En attente', 'var(--yellow)'], ok: ['Acceptée', 'var(--mint)'], later: ['Retenue', 'var(--blue2)'], no: ['Refusée', 'var(--neutral)'] };
function card(x, u) {
  const cur = x.annee === schoolYear(0);
  const classes = d.myClasses(u);
  const [l, bg] = ST[x.status] || ST.new;
  const st = x.studentId && d.student(x.studentId);
  const actions = x.status !== 'new' ? (st ? `<a class="btn2 sm" href="#/prof/eleve/${st.id}">${ic('users', 16)}Voir l’élève</a>` : '')
    : cur ? `<form class="row wrap" style="gap:8px;align-items:flex-end" data-form="dem-ok" data-id="${x.id}"><div class="field grow" style="min-width:180px;margin:0"><label class="lbl" for="dc-${x.id}">Classe</label><select id="dc-${x.id}" name="classId" class="inp" required>${classes.length ? classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : '<option value="">Créez d’abord une classe</option>'}</select></div><button class="btn sm" ${classes.length ? '' : 'disabled'}>${ic('check', 16)}Accepter et créer l’élève</button></form><button class="btn2 sm" data-act="dem-no" data-id="${x.id}">Refuser</button>`
      : `<button class="btn sm" data-act="dem-later" data-id="${x.id}">${ic('check', 16)}Retenir pour ${esc(x.annee)}</button><button class="btn2 sm" data-act="dem-no" data-id="${x.id}">Refuser</button>`;
  return `<div class="ck pad col" style="gap:8px"><div class="row between wrap" style="gap:8px"><span class="row wrap" style="gap:6px">${pill(l, bg)}${x.cours ? pill(x.cours, 'var(--surface)') : ''}${pill(cur ? `${x.annee} · cette année` : `${x.annee} · année prochaine`, cur ? 'var(--hi)' : 'var(--blue2)')}</span><span class="tiny mut b">Reçue le ${fdate(x.at.slice(0, 10))}</span></div>
  <div class="b" style="font-size:18px" data-notr dir="auto">${esc(x.prenoms)} ${esc(x.nom)} <span class="small mut">· ${x.age} ans</span></div>
  <div class="small b" style="font-weight:600" data-notr dir="auto">${esc(x.parent)} · <a href="tel:${esc(x.tel.replace(/\s/g, ''))}">${esc(x.tel)}</a> · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a></div>
  ${x.message ? `<div class="small" style="white-space:pre-wrap;background:var(--bg);border-radius:10px;padding:8px 10px" data-notr dir="auto">${esc(x.message)}</div>` : ''}
  <div class="row wrap" style="gap:8px">${actions}${x.status !== 'new' ? `<button class="ib sm" data-act="dem-del" data-id="${x.id}" aria-label="Supprimer la demande">${ic('trash', 16)}</button>` : ''}</div></div>`;
}
export function demandesView(u, q) {
  const f = q.get('v') || 'new';
  const all = list().slice().sort((a, b) => b.at.localeCompare(a.at));
  const shown = all.filter((x) => (f === 'new' ? x.status === 'new' : f === 'done' ? x.status !== 'new' : true));
  const n = (k) => all.filter((x) => (k === 'new' ? x.status === 'new' : x.status !== 'new')).length;
  return shell(u, 4, `<div class="page">
  <div class="top"><a class="ib" href="#/admin" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><div class="small mut b">Direction</div><h1>Demandes d’inscription</h1></div></div>
  <p class="small mut b" style="font-weight:600;margin-top:-6px">Les demandes envoyées depuis l’onglet Cours du site. Une demande acceptée crée l’élève, son code de suivi et sa famille (pour la cotisation).</p>
  <div class="seg">${[['new', `En attente (${n('new')})`], ['done', `Traitées (${n('done')})`], ['all', 'Toutes']].map(([k, l]) => `<a href="#/admin/demandes?v=${k}" class="${f === k ? 'on' : ''}">${l}</a>`).join('')}</div>
  ${shown.length ? shown.map((x) => card(x, u)).join('') : `<div class="ck pad small mut b">${f === 'new' ? 'Aucune demande en attente.' : 'Rien à afficher.'}</div>`}
  </div>`);
}
const find = (id) => list().find((x) => x.id === id);
FORMS['dem-ok'] = (f, fd) => {
  const x = find(f.dataset.id); const c = d.cls(fd.get('classId'));
  if (!x || !c) { toast('Choisissez une classe'); return; }
  const s = { id: d.uid(), classId: c.id, nom: x.nom, prenoms: x.prenoms, naissance: null, age: x.age, ageAt: todayISO(), parent: x.parent, tel: x.tel, email: x.email, level: c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
  // même famille si un élève a déjà ce numéro de téléphone
  const digits = (t) => (t || '').replace(/[^\d]/g, '');
  const sib = d.D().students.find((o) => o.familyId && digits(o.tel) && digits(o.tel) === digits(x.tel));
  if (sib) s.familyId = sib.familyId;
  else { const fam = { id: d.uid(), name: 'Famille ' + x.nom, cotisation: +(d.D().finance && d.D().finance.defaultFee) || 0, status: 'unpaid', paid: 0 }; d.D().families.push(fam); s.familyId = fam.id; }
  s.code = d.genCode(s, c);
  d.D().students.push(s);
  Object.assign(x, { status: 'ok', studentId: s.id, doneAt: new Date().toISOString() });
  d.save(); toast(`${x.prenoms} est inscrit·e en ${c.name}`); location.hash = `#/prof/eleve/${s.id}/cree`;
};
const setSt = (id, status) => { const x = find(id); if (x) { Object.assign(x, { status, doneAt: new Date().toISOString() }); d.save(); window.dispatchEvent(new CustomEvent('soft-render')); } };
ACT['dem-later'] = (el) => { setSt(el.dataset.id, 'later'); toast('Demande retenue pour l’année prochaine'); };
ACT['dem-no'] = (el) => { setSt(el.dataset.id, 'no'); toast('Demande refusée'); };
ACT['dem-del'] = (el) => { d.D().demandes = list().filter((x) => x.id !== el.dataset.id); d.save(); window.dispatchEvent(new CustomEvent('soft-render')); };

// ---------- Comptabilité : les inscriptions en attente ----------
export function comptaPending(full = false) {
  const p = list().filter((x) => x.status === 'new' || x.status === 'later').sort((a, b) => a.at.localeCompare(b.at));
  if (!p.length) return full ? `<div class="ck pad col" style="gap:6px"><h2>${ic('users', 20)} Inscriptions en attente</h2><span class="small mut b">Aucune demande en attente.</span></div>` : '';
  const rows = (full ? p : p.slice(0, 4)).map((x) => `<div class="li"><span class="grow col" style="gap:0"><span class="b" data-notr dir="auto">${esc(x.prenoms)} ${esc(x.nom)}</span><span class="tiny mut b">${esc(x.cours || '')}${x.cours ? ' · ' : ''}${esc(x.annee)}</span></span>${pill(x.status === 'new' ? 'En attente' : 'Retenue', x.status === 'new' ? 'var(--yellow)' : 'var(--blue2)')}</div>`).join('');
  return `<div class="ck pad col" style="gap:6px"><div class="row between"><h2>${ic('users', 20)} Inscriptions en attente</h2>${pill(String(p.length), 'var(--yellow)')}</div>
  <span class="small mut b" style="font-weight:600">Familles à venir : la cotisation sera à prévoir une fois l’inscription acceptée par la direction.</span>${rows}
  ${!full && p.length > 4 ? '<a class="small b" href="#/compta/cotisations">Tout voir</a>' : ''}</div>`;
}
