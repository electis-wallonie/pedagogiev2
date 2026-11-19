// Demandes d'inscription : formulaire public (onglet Cours) → rubrique « Demandes » de la direction
// (méga administrateur + administrateurs) → visibles « en attente » dans la comptabilité.
import * as d from './data.js';
import { ACT, FORMS, esc, ic, pill, fdate, toast, todayISO, hero } from './ui.js';
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
  // Elle est enregistrée avec le reste des données de la mosquée.
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
const TABS = [['new', 'En attente'], ['later', 'Plus tard'], ['ok', 'Acceptées'], ['no', 'Refusées']];
export function demandesView(u, q) {
  const f = TABS.some(([k]) => k === q.get('v')) ? q.get('v') : 'new';
  const all = list().slice().sort((a, b) => b.at.localeCompare(a.at));
  const shown = all.filter((x) => x.status === f);
  const n = (k) => all.filter((x) => x.status === k).length;
  const sel = shown.find((x) => x.id === q.get('s')) || shown[0];
  const PALQ = ['q-p3', 'q-p1', 'q-p2', 'q-p0'];
  const ini = (x) => ((x.prenoms || '?')[0] + (x.nom || '')[0]).toUpperCase();
  const rows = shown.map((x, k) => `<tr class="${sel && x.id === sel.id ? 'sel' : ''}" data-act="dem-pick" data-id="${x.id}" data-v="${f}"><td><span class="q-who"><span class="q-av ${PALQ[k % 4]}">${esc(ini(x))}</span><span data-notr dir="auto">${esc(x.prenoms)} ${esc(x.nom)}</span></span></td><td>${x.age} ans</td><td class="hm">${esc(x.annee)}</td><td class="hm mut" data-notr dir="auto">${esc(x.parent)}</td><td class="r mut" style="white-space:nowrap">${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}</td></tr>`).join('');
  return shell(u, 4, `<div class="page">
  <div class="qd-h"><a class="ib" href="#/admin" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><h1>Demandes d’inscription</h1><div class="qd-sub">${n('new')} en attente · envoyées depuis l’onglet Cours du site</div></div></div>
  <nav class="q-tabs">${TABS.map(([k, l]) => `<a href="#/admin/demandes?v=${k}" class="${f === k ? 'on' : ''}">${l} <span class="mut">${n(k)}</span></a>`).join('')}</nav>
  ${shown.length ? `<div class="q-split"><div class="q-main q-card q-pad"><div style="overflow-x:auto"><table class="q-tbl"><thead><tr><th>Enfant</th><th>Âge</th><th class="hm">Année</th><th class="hm">Parent</th><th class="r">Reçue</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  ${sel ? detail(sel, u, PALQ[shown.indexOf(sel) % 4], ini(sel)) : ''}</div>` : `<div class="q-card small mut" style="padding:20px 24px">${f === 'new' ? 'Aucune demande en attente.' : 'Rien à afficher.'}</div>`}
  <p class="small mut">Une demande acceptée crée l’élève, son code de suivi et sa famille (cotisation « pas payé »).</p></div>`);
}
function detail(x, u, pc, ini) {
  const cur = x.annee === schoolYear(0);
  const classes = d.myClasses(u);
  const st = x.studentId && d.student(x.studentId);
  const actions = x.status !== 'new' ? `<div class="row wrap" style="gap:8px">${st ? `<a class="btn sm" href="#/prof/eleve/${st.id}">${ic('users', 16)}Voir l’élève</a>` : ''}<button class="btn2 sm" data-act="dem-del" data-id="${x.id}">${ic('trash', 16)}Supprimer la demande</button></div>`
    : cur ? `<form class="col" style="gap:10px" data-form="dem-ok" data-id="${x.id}"><div class="field" style="margin:0"><label class="lbl" for="dc-${x.id}">Classe</label><select id="dc-${x.id}" name="classId" class="inp" required>${classes.length ? classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : '<option value="">Créez d’abord une classe</option>'}</select></div><button class="btn full" ${classes.length ? '' : 'disabled'}>${ic('check', 18)}Accepter et créer l’élève</button></form>
      <div class="grid2" style="gap:8px"><button class="btn2 sm" data-act="dem-later" data-id="${x.id}">Plus tard</button><button class="btn2 sm" data-act="dem-no" data-id="${x.id}">Refuser</button></div>`
      : `<button class="btn full" data-act="dem-later" data-id="${x.id}">${ic('check', 18)}Retenir pour ${esc(x.annee)}</button><button class="btn2 sm full" data-act="dem-no" data-id="${x.id}">Refuser</button>`;
  return `<aside class="q-card q-drawer" id="dem-d" aria-label="Demande sélectionnée"><div class="row" style="gap:12px"><span class="q-av lg ${pc}">${esc(ini)}</span><div class="col" style="gap:2px"><span class="b" style="font-size:18px" data-notr dir="auto">${esc(x.prenoms)} ${esc(x.nom)}</span><span class="small mut">${x.age} ans · demande du ${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}</span></div></div>
  <div class="q-kvs"><div><span>Année souhaitée</span><span>${esc(x.annee)}${cur ? ' · cette année' : ' · année prochaine'}</span></div>${x.cours ? `<div><span>Cours</span><span>${esc(x.cours)}</span></div>` : ''}<div><span>Parent</span><span data-notr dir="auto">${esc(x.parent)}</span></div><div><span>Téléphone</span><span><a href="tel:${esc(x.tel.replace(/\s/g, ''))}" class="q-amt" style="color:inherit">${esc(x.tel)}</a></span></div><div><span>E-mail</span><span style="word-break:break-all"><a href="mailto:${esc(x.email)}" style="color:inherit">${esc(x.email)}</a></span></div>${x.message ? `<div><span>Remarque</span><span data-notr dir="auto" style="white-space:pre-wrap">${esc(x.message)}</span></div>` : ''}</div>
  ${actions}</aside>`;
}
ACT['dem-pick'] = (el) => { location.replace(`#/admin/demandes?v=${el.dataset.v}&s=${el.dataset.id}`); if (matchMedia('(max-width: 959px)').matches) setTimeout(() => { const e = document.getElementById('dem-d'); if (e) e.scrollIntoView({ behavior: 'smooth' }); }, 120); };
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
  const adm = d.isAdmin(d.me());
  if (!p.length) return full ? `<div class="q-card col" style="padding:18px 24px;gap:4px"><span class="b" style="font-size:16px">Inscriptions en attente</span><span class="small mut">Aucune demande en attente.</span></div>` : '';
  const row = (x) => { const inner = `<span class="t"><b data-notr dir="auto">${esc(x.prenoms)} ${esc(x.nom)}</b><span>${esc(x.cours || '')}${x.cours ? ' · ' : ''}${esc(x.annee)} · reçue le ${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}</span></span><span class="q-st ${x.status === 'new' ? 'warn' : 'neu'}">${x.status === 'new' ? 'En attente' : 'Plus tard'}</span>`;
    return adm ? `<a class="q-lrow q-link" href="#/admin/demandes?v=${x.status}&s=${x.id}">${inner}${ic('chev', 16)}</a>` : `<div class="q-lrow">${inner}</div>`; };
  return `<div class="q-card q-pad"><div class="row between" style="padding:18px 0 4px;gap:10px"><span class="b" style="font-size:16px">Inscriptions en attente <span class="mut" style="font-weight:400">${p.length}</span></span>${adm ? `<a class="btn2 sm" href="#/admin/demandes">Traiter les demandes ${ic('chev', 14)}</a>` : ''}</div>
  <span class="small mut">${adm ? 'Touchez une demande pour l’accepter ou la refuser. ' : 'La direction accepte ou refuse les demandes. '}La cotisation sera à prévoir une fois l’inscription acceptée.</span>
  ${(full ? p : p.slice(0, 4)).map(row).join('')}
  ${!full && p.length > 4 ? `<div style="padding:12px 0"><a class="small b" href="${adm ? '#/admin/demandes' : '#/compta/cotisations'}">Tout voir (${p.length})</a></div>` : '<div style="height:6px"></div>'}</div>`;
}
