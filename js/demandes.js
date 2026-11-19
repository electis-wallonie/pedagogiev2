// Demandes d'inscription : formulaire public (onglet Cours) → rubrique « Demandes » de la direction
// (méga administrateur + administrateurs) → visibles « en attente » dans la comptabilité.
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, pill, fdate, toast, todayISO, hero, schedLabel } from './ui.js';
import { pubShell, config } from './mosquee.js';
import { tr } from './i18n.js';
import { shell } from './prof.js';

// Année scolaire : de septembre à août. offset 0 = l'année en cours, 1 = la suivante.
export function schoolYear(offset = 0, now = new Date()) {
  const y = (now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1) + offset;
  return `${y}–${y + 1}`;
}
const list = () => (d.D().demandes = d.D().demandes || []);
export const pending = () => list().filter((x) => x.status === 'new');
// une demande = un parent + un ou plusieurs enfants (anciennes demandes : un seul enfant « à plat »)
export const kidsOf = (x) => (x.kids && x.kids.length ? x.kids : [{ prenoms: x.prenoms, nom: x.nom, naissance: x.naissance || null, age: x.age, classId: x.classId || '', code: x.code || '' }]);
export const kidAge = (k) => (k.naissance ? d.ageOf({ naissance: k.naissance }) : k.age);
export const kidsLabel = (x) => kidsOf(x).map((k) => `${k.prenoms} ${k.nom}`).join(', ');
// ---------- années ouvertes / fermées (verrou enregistré par année, ex. « 2027–2028 ») ----------
const locks = () => (d.D().regLocks = d.D().regLocks || {});
export const yearOpen = (y) => locks()[y] !== 'closed';
export const openYears = () => [schoolYear(0), schoolYear(1)].filter(yearOpen);
ACT['reg-lock'] = (el) => { const y = el.dataset.y; if (yearOpen(y)) locks()[y] = 'closed'; else delete locks()[y]; d.save(); toast(`Inscriptions ${y} : ${yearOpen(y) ? 'ouvertes' : 'fermées'}`); window.dispatchEvent(new CustomEvent('soft-render')); };
// ---------- places par classe (comptées dès l'envoi de la demande) ----------
export const capOf = (c) => (+c.capacity > 0 ? +c.capacity : 20);
export function seats(c, y = schoolYear(0)) {
  const dem = list().filter((x) => (x.status === 'new' || x.status === 'later') && x.annee === y).reduce((t, x) => t + kidsOf(x).filter((k) => k.classId === c.id).length, 0);
  const st = y === schoolYear(0) ? d.D().students.filter((s) => s.classId === c.id).length : 0;
  return { st, dem, used: st + dem, cap: capOf(c), free: Math.max(0, capOf(c) - st - dem) };
}
export function gauge(c, y) {
  const g = seats(c, y), pct = Math.min(100, Math.round((g.used / g.cap) * 100));
  return `<div class="q-gauge"><div class="row between small" style="gap:10px"><span class="b">${esc(c.name)}</span><span class="q-amt">${g.used} / ${g.cap}${g.free ? '' : ' · <span style="color:var(--q-neg)">complet</span>'}</span></div><span class="q-bar"><i style="width:${pct}%;${pct >= 100 ? 'background:var(--q-neg)' : pct >= 80 ? 'background:var(--q-warn)' : ''}"></i></span><span class="tiny mut">${g.st ? `${g.st} inscrit(s)` : ''}${g.st && g.dem ? ' · ' : ''}${g.dem ? `${g.dem} demande(s)` : ''}${!g.st && !g.dem ? 'aucune place prise' : ''}</span></div>`;
}

// ---------- Public : le formulaire en 4 étapes ----------
const STEPS = ['Élève(s)', 'Classe', 'Coordonnées', 'Récapitulatif'];
// publics des classes (Enfants, Sœurs, Adultes…) : le parent choisit d'abord pour qui sont les cours
const publics = () => { const P = [...new Set(d.D().classes.map((c) => (c.public || '').trim()).filter(Boolean))]; return P; };
const pubLabel = (p) => (/^adultes?$/i.test(p) ? 'Adultes (hommes)' : p);
// créneaux d'une classe, triés : « Samedi · 09:00 – 12:00 »
const ORDER_D = [1, 2, 3, 4, 5, 6, 0];
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const slotLines = (c) => d.slotsOf(c).slice().sort((x, y) => ORDER_D.indexOf(+x.day) - ORDER_D.indexOf(+y.day) || String(x.time).localeCompare(y.time)).map((sl) => `${DAYS_FR[+sl.day]} · ${sl.time}${sl.end ? ' – ' + sl.end : ''}`);
function kidBlock(k) {
  return `<div class="ck pad col dm-kid" data-k="${k}" style="gap:10px"><div class="row between"><span class="b dm-kt">${k ? `Élève ${k + 1}` : "L’élève"}</span>${k ? `<button type="button" class="btn2 sm" data-act="dm-delkid" data-k="${k}">${ic('trash', 16)}Retirer</button>` : ''}</div>
    <div class="grid2"><div class="field"><label class="lbl" for="kp${k}">Prénom(s)</label><input id="kp${k}" name="k${k}-prenoms" class="inp" required autocomplete="off"></div>
    <div class="field"><label class="lbl" for="kn${k}">Nom</label><input id="kn${k}" name="k${k}-nom" class="inp" required autocomplete="off"></div></div>
    <div class="field" style="max-width:240px"><label class="lbl" for="kb${k}">Date de naissance</label><input id="kb${k}" name="k${k}-naissance" class="inp" type="date" required max="${todayISO()}"></div>
    <div class="field"><label class="lbl" for="kc${k}">Déjà inscrit(e) l’an dernier ? Entrez le code de suivi <span class="mut">(facultatif)</span></label><input id="kc${k}" name="k${k}-code" class="inp code" autocomplete="off" autocapitalize="characters" placeholder="ex. CL2-YB-KARIM-03052016-7K2Q"><span class="hint">Sa progression (sourates, niveau) sera reprise.</span></div>
    ${publics().length > 1 ? `<fieldset class="dm-set" style="border:0;padding:0;margin:0"><legend class="lbl">Les cours pour…</legend><div class="dm-opts pubs">${publics().map((p) => `<label class="dm-opt"><input type="radio" name="k${k}-public" value="${esc(p)}" required><span class="b" dir="auto">${esc(pubLabel(p))}</span></label>`).join('')}</div></fieldset>` : ''}</div>`;
}
export function inscription(q) {
  if (q && q.get('ok')) {
    return pubShell(0, `<div class="ck pad col dm-ok">
      <span class="dm-okic">${ic('check', 30)}</span>
      <h1 style="margin:0">Demande envoyée</h1>
      <p class="b" style="font-weight:600;line-height:1.5">Merci ! La mosquée a bien reçu votre demande d’inscription. Elle vous recontactera par téléphone ou par e-mail.</p>
      <a class="btn full" href="#/">${ic('back', 18)}Retour aux cours</a></div>`);
  }
  const years = openYears();
  if (!years.length) return pubShell(0, `<div class="ck pad col"><h1 style="margin:0">Inscriptions closes</h1><p class="b" style="font-weight:600">Les inscriptions sont closes pour le moment. Revenez plus tard ou contactez la mosquée.</p><a class="btn2 full" href="#/">${ic('back', 18)}Retour aux cours</a></div>`);
  const opt = (name, value, label, sub, checked) => `<label class="dm-opt"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''} required><span class="col" style="gap:0"><span class="b" dir="auto">${esc(label)}</span>${sub ? `<span class="tiny mut b" dir="auto">${esc(sub)}</span>` : ''}</span></label>`;
  return pubShell(0, `<form class="col dm-form" data-form="demande" data-step="0" style="gap:14px" novalidate>
  <a href="#/" class="small b row" style="gap:6px">${ic('back', 16)}Cours</a>
  <div class="col" style="gap:2px"><h1 style="margin:0">Demande d’inscription</h1><span class="small mut b" style="font-weight:600">4 étapes : la mosquée étudie votre demande et vous recontacte.</span></div>
  <ol class="dm-steps">${STEPS.map((l, i) => `<li class="${i === 0 ? 'on' : ''}" data-i="${i}"><span>${i + 1}</span>${l}</li>`).join('')}</ol>
  <fieldset class="dm-step col" data-i="0" style="gap:12px;border:0;padding:0;margin:0"><legend class="sr">Élève(s)</legend>
    <div id="dm-kids" class="col" style="gap:12px">${kidBlock(0)}</div>
    <button type="button" class="btn2 full" data-act="dm-addkid">${ic('plus', 18)}Inscrire une autre personne</button>
    <span class="hint">L’élève peut être un enfant, un adolescent ou un adulte (cours pour adultes, cours pour les sœurs…). Vous inscrivez plusieurs personnes de la même famille ? Ajoutez-les ici : une seule demande, une seule cotisation.</span>
  </fieldset>
  <fieldset class="dm-step col" data-i="1" style="gap:12px;border:0;padding:0;margin:0" hidden><legend class="sr">Classe</legend>
    ${years.length > 1 ? `<fieldset class="ck pad col dm-set"><legend class="b">Pour quelle année ?</legend><div class="dm-opts two" data-change="dm-year">${years.map((y, i) => opt('annee', y, y === schoolYear(0) ? 'Cette année' : 'L’année prochaine', y, i === 0)).join('')}</div></fieldset>` : `<input type="hidden" name="annee" value="${years[0]}"><p class="small b" style="margin:0">Inscription pour l’année ${years[0]}</p>`}
    <div id="dm-classes" class="col" style="gap:12px"></div>
  </fieldset>
  <fieldset class="dm-step col" data-i="2" style="gap:12px;border:0;padding:0;margin:0" hidden><legend class="sr">Parent et adresse</legend>
    <div class="ck pad col dm-set" style="gap:10px"><span class="b">Parent ou responsable</span><span class="hint" style="margin-top:-6px">Pour un adulte qui s’inscrit lui-même, indiquez vos propres nom et coordonnées.</span>
    <div class="field"><label class="lbl" for="dpar">Nom et prénom</label><input id="dpar" name="parent" class="inp" required autocomplete="name"></div>
    <div class="grid2"><div class="field"><label class="lbl" for="dt">Téléphone</label><input id="dt" name="tel" class="inp" type="tel" inputmode="tel" required autocomplete="tel"></div>
    <div class="field"><label class="lbl" for="de">E-mail</label><input id="de" name="email" class="inp" type="email" inputmode="email" required autocomplete="email" autocapitalize="none"></div></div></div>
    <div class="ck pad col dm-set" style="gap:10px"><span class="b">Adresse</span>
    <div class="field"><label class="lbl" for="dr">Rue et numéro</label><input id="dr" name="rue" class="inp" required autocomplete="street-address"></div>
    <div class="grid2"><div class="field"><label class="lbl" for="dcp">Code postal</label><input id="dcp" name="cp" class="inp" required inputmode="numeric" autocomplete="postal-code"></div>
    <div class="field"><label class="lbl" for="dv">Ville</label><input id="dv" name="ville" class="inp" required autocomplete="address-level2"></div></div></div>
    <div class="field"><label class="lbl" for="dm">Message <span class="mut">(facultatif)</span></label><textarea id="dm" name="message" class="inp" rows="3" placeholder="Niveau, disponibilités, question…"></textarea></div>
  </fieldset>
  <fieldset class="dm-step col" data-i="3" style="gap:12px;border:0;padding:0;margin:0" hidden><legend class="sr">Récapitulatif</legend>
    <div id="dm-recap" class="col" style="gap:12px"></div>
    <p class="tiny mut b" style="font-weight:600">Vos coordonnées servent uniquement à la mosquée pour traiter cette demande.</p>
  </fieldset>
  <div class="row" style="gap:10px"><button type="button" class="btn2" data-act="dm-prev" hidden>${ic('back', 18)}Retour</button><button type="button" class="btn grow" data-act="dm-next">Continuer</button><button class="btn grow" data-send hidden>${ic('send', 18)}Envoyer la demande</button></div>
  </form>`);
}
const fdOf = () => { const f = document.querySelector('form[data-form=demande]'); return [f, new FormData(f)]; };
const kidIdx = () => [...document.querySelectorAll('.dm-kid')].map((e) => +e.dataset.k);
function classChoices(fd) {
  const y = fd.get('annee') || openYears()[0];
  const all = d.D().classes;
  if (!all.length) return '<p class="small b">La mosquée n’a pas encore publié ses classes. Envoyez la demande : elle vous proposera une classe.</p>';
  return kidIdx().map((k) => {
    const prev = fd.get(`k${k}-class`);
    const pub = fd.get(`k${k}-public`);
    const nm = (fd.get(`k${k}-prenoms`) || '').split(' ')[0] || `l’élève ${k + 1}`;
    const cls = pub ? all.filter((c) => (c.public || '').trim() === pub || !(c.public || '').trim()) : all;
    return `<fieldset class="ck pad col dm-set"><legend class="b">Quand ${kidIdx().length > 1 ? `pour ${esc(nm)}` : ''} ?</legend>${pub ? `<span class="small mut b" style="margin-top:-6px">Cours : ${esc(pubLabel(pub))}</span>` : ''}<div class="dm-opts">${cls.length ? cls.map((c) => { const g = seats(c, y); const full = g.free <= 0 && prev !== c.id; const L = slotLines(c);
      return `<label class="dm-opt dm-cls ${full ? 'off' : ''}"><input type="radio" name="k${k}-class" value="${c.id}" ${prev === c.id ? 'checked' : ''} ${full ? 'disabled' : ''} required><span class="col grow" style="gap:3px">${L.length ? L.map((l) => `<span class="dm-when">${l}</span>`).join('') : '<span class="dm-when">Horaire à confirmer</span>'}<span class="dm-lvl">Niveau ${c.level || 1}</span><span class="dm-meta"><span style="color:${full ? 'var(--absent)' : 'inherit'}">${full ? 'Complet' : `${g.free} place(s) restante(s)`}</span> · <span dir="auto">${esc(c.name)}</span></span></span></label>`; }).join('') : '<p class="small b">Aucune classe pour ces cours pour le moment : envoyez la demande, la mosquée vous recontactera.</p>'}</div></fieldset>`;
  }).join('');
}
CHANGE['dm-year'] = () => { const [, fd] = fdOf(); const box = document.getElementById('dm-classes'); if (box) box.innerHTML = classChoices(fd); };
function recap(fd) {
  const cl = (id) => d.cls(id);
  return `<div class="ck pad col" style="gap:8px"><span class="b">Élève(s) · ${esc(fd.get('annee') || '')}</span>${kidIdx().map((k) => { const c = cl(fd.get(`k${k}-class`)); return `<div class="small"><b dir="auto">${esc(fd.get(`k${k}-prenoms`))} ${esc(fd.get(`k${k}-nom`))}</b> · né(e) le ${fdate(fd.get(`k${k}-naissance`))}${fd.get(`k${k}-public`) ? ` · ${esc(pubLabel(fd.get(`k${k}-public`)))}` : ''}${c ? ` · ${slotLines(c).join(', ') || esc(c.name)} (${esc(c.name)})` : ''}${fd.get(`k${k}-code`) ? ' · réinscription' : ''}</div>`; }).join('')}</div>
  <div class="ck pad col" style="gap:4px"><span class="b">Parent</span><span class="small" dir="auto">${esc(fd.get('parent'))} · ${esc(fd.get('tel'))} · ${esc(fd.get('email'))}</span><span class="small" dir="auto">${esc(fd.get('rue'))}, ${esc(fd.get('cp'))} ${esc(fd.get('ville'))}</span>${fd.get('message') ? `<span class="small mut" dir="auto">« ${esc(fd.get('message'))} »</span>` : ''}</div>`;
}
function goStep(n) {
  const [f, fd] = fdOf();
  f.dataset.step = n;
  if (n === 1) { const box = document.getElementById('dm-classes'); box.innerHTML = classChoices(fd); }
  if (n === 3) document.getElementById('dm-recap').innerHTML = recap(fd);
  f.querySelectorAll('.dm-step').forEach((e) => (e.hidden = +e.dataset.i !== n));
  f.querySelectorAll('.dm-steps li').forEach((e) => { e.classList.toggle('on', +e.dataset.i === n); e.classList.toggle('done', +e.dataset.i < n); });
  f.querySelector('[data-act=dm-prev]').hidden = n === 0;
  f.querySelector('[data-act=dm-next]').hidden = n === 3;
  f.querySelector('[data-send]').hidden = n !== 3;
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function stepValid(n) {
  const [f] = fdOf();
  const step = f.querySelector(`.dm-step[data-i="${n}"]`);
  for (const el of step.querySelectorAll('input,textarea,select')) { if (!el.checkValidity()) { el.reportValidity(); return false; } }
  if (n === 0) for (const e of step.querySelectorAll('input[type=date]')) { const a = d.ageOf({ naissance: e.value }); if (!(a >= 3 && a < 100)) { e.setCustomValidity('Vérifiez la date de naissance'); e.reportValidity(); e.setCustomValidity(''); return false; } }
  if (n === 2) { const t = f.querySelector('[name=tel]').value; if (t.replace(/[^\d]/g, '').length < 8) { toast('Indiquez un numéro de téléphone'); return false; } }
  return true;
}
ACT['dm-next'] = () => { const [f] = fdOf(); const n = +f.dataset.step; if (stepValid(n)) goStep(n + 1); };
ACT['dm-prev'] = () => { const [f] = fdOf(); goStep(Math.max(0, +f.dataset.step - 1)); };
ACT['dm-addkid'] = () => { const ks = kidIdx(); const k = Math.max(...ks) + 1; const box = document.getElementById('dm-kids'); box.insertAdjacentHTML('beforeend', kidBlock(k)); const prev = box.querySelector(`[name="k${ks[ks.length - 1]}-nom"]`); const nn = box.querySelector(`[name="k${k}-nom"]`); if (prev && nn) nn.value = prev.value; box.querySelector(`[name="k${k}-prenoms"]`).focus(); relabel(); };
const relabel = () => { const ks = [...document.querySelectorAll('.dm-kid')]; ks.forEach((e, i) => { const t = e.querySelector('.dm-kt'); if (t) t.textContent = tr(ks.length > 1 ? `Élève ${i + 1}` : 'L’élève'); }); };
ACT['dm-delkid'] = (el) => { const e = document.querySelector(`.dm-kid[data-k="${el.dataset.k}"]`); if (e) e.remove(); relabel(); };

FORMS.demande = async (f, fd) => {
  if (+f.dataset.step !== 3) { ACT['dm-next'](); return; }
  const annee = fd.get('annee') || openYears()[0];
  if (!yearOpen(annee)) { toast(`Les inscriptions ${annee} sont fermées`); return; }
  const kids = kidIdx().map((k) => ({ prenoms: (fd.get(`k${k}-prenoms`) || '').trim().replace(/\s+/g, ' '), nom: (fd.get(`k${k}-nom`) || '').trim(), naissance: fd.get(`k${k}-naissance`) || null, classId: fd.get(`k${k}-class`) || '', public: fd.get(`k${k}-public`) || '', code: (fd.get(`k${k}-code`) || '').trim() }));
  const v = { annee, kids, parent: (fd.get('parent') || '').trim(), tel: (fd.get('tel') || '').trim(), email: (fd.get('email') || '').trim().toLowerCase(), rue: (fd.get('rue') || '').trim(), cp: (fd.get('cp') || '').trim(), ville: (fd.get('ville') || '').trim(), message: (fd.get('message') || '').trim() };
  if (kids.some((k) => !k.prenoms || !k.nom || !k.naissance) || !v.parent || !v.rue || !v.cp || !v.ville) { toast('Merci de remplir tous les champs'); return; }
  if (v.tel.replace(/[^\d]/g, '').length < 8) { toast('Indiquez un numéro de téléphone'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { toast('Indiquez une adresse e-mail valide'); return; }
  // places : une classe complète entre-temps est refusée
  for (const k of kids) { const c = d.cls(k.classId); if (c && seats(c, annee).free <= 0) { toast(`${c.name} vient d’être complète : choisissez une autre classe`); goStep(1); return; } }
  // compatibilité : le premier enfant reste aussi « à plat »
  Object.assign(v, { prenoms: kids[0].prenoms, nom: kids[0].nom, naissance: kids[0].naissance, age: d.ageOf({ naissance: kids[0].naissance }), classId: kids[0].classId });
  const item = { id: d.uid(), at: new Date().toISOString(), status: 'new', ...v };
  // En ligne (Cloudflare) : la demande part vers le serveur de la mosquée (mosquee.json → "api").
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
const TABS = [['new', 'En attente'], ['later', 'Plus tard'], ['ok', 'Acceptées'], ['no', 'Refusées']];
export function demandesView(u, q) {
  const f = TABS.some(([k]) => k === q.get('v')) ? q.get('v') : 'new';
  const all = list().slice().sort((a, b) => b.at.localeCompare(a.at));
  const shown = all.filter((x) => x.status === f);
  const n = (k) => all.filter((x) => x.status === k).length;
  const sel = shown.find((x) => x.id === q.get('s')) || shown[0];
  const PALQ = ['q-p3', 'q-p1', 'q-p2', 'q-p0'];
  const ini = (x) => { const k = kidsOf(x)[0]; return ((k.prenoms || '?')[0] + (k.nom || '')[0]).toUpperCase(); };
  const Y = [schoolYear(0), schoolYear(1)];
  const gy = Y.includes(q.get('g')) ? q.get('g') : Y[0];
  const rows = shown.map((x, k) => { const ks = kidsOf(x); return `<tr class="${sel && x.id === sel.id ? 'sel' : ''}" data-act="dem-pick" data-id="${x.id}" data-v="${f}"><td><span class="q-who"><span class="q-av ${PALQ[k % 4]}">${esc(ini(x))}</span><span class="col" style="gap:0"><span data-notr dir="auto">${esc(ks[0].prenoms)} ${esc(ks[0].nom)}</span>${ks.length > 1 ? `<span class="small mut">+ ${ks.length - 1} autre(s) élève(s)</span>` : ''}</span></span></td><td>${kidAge(ks[0]) ?? '—'} ans</td><td class="hm">${esc(x.annee)}</td><td class="hm mut" data-notr dir="auto">${esc(x.parent)}</td><td class="r mut" style="white-space:nowrap">${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}</td></tr>`; }).join('');
  return shell(u, 4, `<div class="page">
  <div class="qd-h"><a class="ib" href="#/admin" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><h1>Demandes d’inscription</h1><div class="qd-sub">${n('new')} en attente · envoyées depuis l’onglet Cours du site</div></div></div>
  <div class="q-card col" style="padding:18px 22px;gap:14px"><div class="row between wrap" style="gap:10px"><span class="b" style="font-size:16px">Ouverture des inscriptions</span><span class="small mut">Une année fermée disparaît du formulaire du site.</span></div>
    <div class="grid2" style="gap:10px">${Y.map((y) => `<button type="button" class="q-lock ${yearOpen(y) ? 'on' : ''}" data-act="reg-lock" data-y="${y}" role="switch" aria-checked="${yearOpen(y)}"><span class="col" style="gap:2px;text-align:left"><b>Inscriptions ${y}</b><span class="small mut">${y === schoolYear(0) ? 'cette année' : 'année prochaine'} · ${yearOpen(y) ? 'ouvertes' : 'fermées'}</span></span><span class="q-sw"><i></i></span></button>`).join('')}</div>
    <div class="row between wrap" style="gap:10px;margin-top:4px"><span class="b" style="font-size:15px">Places par classe</span><nav class="q-tabs" style="border:0">${Y.map((y) => `<a href="#/admin/demandes?v=${f}&g=${y}" class="${gy === y ? 'on' : ''}">${y}</a>`).join('')}</nav></div>
    ${d.D().classes.length ? `<div class="q-gauges">${d.D().classes.map((c) => gauge(c, gy)).join('')}</div><span class="tiny mut">Une place est comptée dès l’envoi de la demande. Une classe pleine n’est plus proposée. Capacité : Classes → la classe → Modifier.</span>` : '<span class="small mut">Aucune classe pour le moment.</span>'}
  </div>
  <nav class="q-tabs">${TABS.map(([k, l]) => `<a href="#/admin/demandes?v=${k}" class="${f === k ? 'on' : ''}">${l} <span class="mut">${n(k)}</span></a>`).join('')}</nav>
  ${shown.length ? `<div class="q-split"><div class="q-main q-card q-pad"><div style="overflow-x:auto"><table class="q-tbl"><thead><tr><th>Élève(s)</th><th>Âge</th><th class="hm">Année</th><th class="hm">Parent</th><th class="r">Reçue</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  ${sel ? detail(sel, u, PALQ[shown.indexOf(sel) % 4], ini(sel)) : ''}</div>` : `<div class="q-card small mut" style="padding:20px 24px">${f === 'new' ? 'Aucune demande en attente.' : 'Rien à afficher.'}</div>`}
  <p class="small mut">Accepter une demande crée les élèves (ou reprend la fiche d’un ancien élève grâce à son code de suivi), leur code de suivi et leur famille (cotisation « pas payée »).</p></div>`);
}
// ancien élève retrouvé par son code : élève actuel ou élève non réinscrit gardé en archive
export const byCodeAny = (code) => { if (!code) return null; const s = d.byCode(code); if (s) return { s, from: 'eleve' }; const n = d.normCode(code); const a = (d.D().archive || []).find((x) => d.normCode(x.code) === n); return a ? { s: a, from: 'archive' } : null; };
function detail(x, u, pc, ini) {
  const cur = x.annee === schoolYear(0);
  const classes = d.myClasses(u);
  const ks = kidsOf(x);
  const done = (x.studentIds || (x.studentId ? [x.studentId] : [])).map((id) => d.student(id)).filter(Boolean);
  const kidRow = (k, i) => { const old = byCodeAny(k.code); const want = d.cls(k.classId);
    return `<div class="col" style="gap:6px;padding:10px 0;border-top:1px solid var(--q-hair)"><span class="b" data-notr dir="auto">${esc(k.prenoms)} ${esc(k.nom)} <span class="mut" style="font-weight:400">· ${kidAge(k) ?? '—'} ans${k.naissance ? ` · né(e) le ${fdate(k.naissance)}` : ''}${k.public ? ` · cours ${esc(pubLabel(k.public))}` : ''}</span></span>
    ${k.code ? `<span class="small">${old ? `<span class="q-st ok">Réinscription</span> fiche retrouvée : ${esc(old.s.prenoms)} ${esc(old.s.nom)} · ${Object.values(old.s.coran || {}).filter((v) => v.s === 'v').length} sourate(s)` : `<span class="q-st warn">Code inconnu</span> ${esc(k.code)} : une nouvelle fiche sera créée`}</span>` : ''}
    ${x.status === 'new' && cur ? `<div class="field" style="margin:0"><label class="lbl" for="dc-${x.id}-${i}">Classe${want ? ` · demandée : ${esc(want.name)}` : ''}</label><select id="dc-${x.id}-${i}" name="class${i}" class="inp" required>${classes.map((c) => `<option value="${c.id}" ${c.id === (k.classId || (old && old.s.classId)) ? 'selected' : ''}>${esc(c.name)} · ${seats(c).used}/${capOf(c)}</option>`).join('')}</select></div>` : want ? `<span class="small mut">Classe demandée : ${esc(want.name)}</span>` : ''}</div>`; };
  const actions = x.status !== 'new' ? `<div class="row wrap" style="gap:8px">${done.map((st) => `<a class="btn sm" href="#/prof/eleve/${st.id}">${ic('users', 16)}${esc(st.prenoms.split(' ')[0])}</a>`).join('')}<button class="btn2 sm" data-act="dem-del" data-id="${x.id}">${ic('trash', 16)}Supprimer la demande</button></div>`
    : cur ? `<button class="btn full" ${classes.length ? '' : 'disabled'}>${ic('check', 18)}Accepter et inscrire ${ks.length > 1 ? `les ${ks.length} élèves` : ''}</button>
      <div class="grid2" style="gap:8px"><button type="button" class="btn2 sm" data-act="dem-later" data-id="${x.id}">Plus tard</button><button type="button" class="btn2 sm" data-act="dem-no" data-id="${x.id}">Refuser</button></div>`
      : `<button type="button" class="btn full" data-act="dem-later" data-id="${x.id}">${ic('check', 18)}Retenir pour ${esc(x.annee)}</button><button type="button" class="btn2 sm full" data-act="dem-no" data-id="${x.id}">Refuser</button>`;
  const adr = [x.rue, [x.cp, x.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return `<aside class="q-card q-drawer" id="dem-d" aria-label="Demande sélectionnée"><div class="row" style="gap:12px"><span class="q-av lg ${pc}">${esc(ini)}</span><div class="col" style="gap:2px"><span class="b" style="font-size:18px" data-notr dir="auto">${ks.length > 1 ? `Famille ${esc(ks[0].nom)} · ${ks.length} élèves` : `${esc(ks[0].prenoms)} ${esc(ks[0].nom)}`}</span><span class="small mut">Demande du ${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })} · ${esc(x.annee)}${cur ? ' · cette année' : ' · année prochaine'}</span></div></div>
  <div class="q-kvs"><div><span>Parent</span><span data-notr dir="auto">${esc(x.parent)}</span></div><div><span>Téléphone</span><span><a href="tel:${esc(String(x.tel).replace(/\s/g, ''))}" class="q-amt" style="color:inherit">${esc(x.tel)}</a></span></div><div><span>E-mail</span><span style="word-break:break-all"><a href="mailto:${esc(x.email)}" style="color:inherit">${esc(x.email)}</a></span></div>${adr ? `<div><span>Adresse</span><span data-notr dir="auto">${esc(adr)}</span></div>` : ''}${x.cours ? `<div><span>Cours</span><span>${esc(x.cours)}</span></div>` : ''}${x.message ? `<div><span>Remarque</span><span data-notr dir="auto" style="white-space:pre-wrap">${esc(x.message)}</span></div>` : ''}</div>
  <form class="col" style="gap:10px" data-form="dem-ok" data-id="${x.id}">${ks.map(kidRow).join('')}${actions}</form></aside>`;
}
ACT['dem-pick'] = (el) => { location.replace(`#/admin/demandes?v=${el.dataset.v}&s=${el.dataset.id}`); if (matchMedia('(max-width: 959px)').matches) setTimeout(() => { const e = document.getElementById('dem-d'); if (e) e.scrollIntoView({ behavior: 'smooth' }); }, 120); };
const find = (id) => list().find((x) => x.id === id);
FORMS['dem-ok'] = (f, fd) => {
  const x = find(f.dataset.id); if (!x) return;
  const ks = kidsOf(x);
  const cls = ks.map((k, i) => d.cls(fd.get('class' + i)));
  if (cls.some((c) => !c)) { toast('Choisissez une classe pour chaque élève'); return; }
  const digits = (t) => (t || '').replace(/[^\d]/g, '');
  const D = d.D();
  // une seule famille pour tous les enfants de la demande
  const olds = ks.map((k) => byCodeAny(k.code));
  let famId = (olds.find((o) => o && o.s.familyId && D.families.some((fm) => fm.id === o.s.familyId)) || { s: {} }).s.familyId;
  if (!famId) { const sib = D.students.find((o) => o.familyId && digits(o.tel) && digits(o.tel) === digits(x.tel)); if (sib) famId = sib.familyId; }
  if (!famId) { const fam = { id: d.uid(), name: 'Famille ' + ks[0].nom, cotisation: +(D.finance && D.finance.defaultFee) || 0, status: 'unpaid', paid: 0 }; D.families.push(fam); famId = fam.id; }
  const contact = { parent: x.parent, tel: x.tel, email: x.email, ...(x.rue ? { rue: x.rue, cp: x.cp, ville: x.ville } : {}) };
  const ids = ks.map((k, i) => {
    const c = cls[i], o = olds[i];
    if (o && o.from === 'eleve') { Object.assign(o.s, { classId: c.id, familyId: famId, ...contact, ...(k.naissance ? { naissance: k.naissance, age: null, ageAt: null } : {}) }); return o.s.id; }
    const s = { id: d.uid(), classId: c.id, nom: k.nom, prenoms: k.prenoms, naissance: k.naissance || null, age: k.naissance ? null : k.age, ageAt: k.naissance ? null : todayISO(), ...contact, familyId: famId, level: c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
    if (o && o.from === 'archive') { s.coran = o.s.coran || {}; s.level = o.s.level || s.level; s.code = o.s.code; D.archive = D.archive.filter((a) => a !== o.s); }
    if (!s.code || D.students.some((z) => d.normCode(z.code) === d.normCode(s.code))) s.code = d.genCode(s, c);
    D.students.push(s); return s.id;
  });
  Object.assign(x, { status: 'ok', studentId: ids[0], studentIds: ids, doneAt: new Date().toISOString() });
  d.save(); toast(ks.length > 1 ? `${ks.length} élèves inscrits` : `${ks[0].prenoms} est inscrit·e en ${cls[0].name}`);
  location.hash = `#/prof/eleve/${ids[0]}/cree${ids.length > 1 ? `?autres=${ids.slice(1).join(',')}` : ''}`;
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
  const row = (x) => { const inner = `<span class="t"><b data-notr dir="auto">${esc(kidsLabel(x))}</b><span>${esc(x.cours || '')}${x.cours ? ' · ' : ''}${esc(x.annee)} · reçue le ${fdate(x.at.slice(0, 10), { day: 'numeric', month: 'short' })}</span></span><span class="q-st ${x.status === 'new' ? 'warn' : 'neu'}">${x.status === 'new' ? 'En attente' : 'Plus tard'}</span>`;
    return adm ? `<a class="q-lrow q-link" href="#/admin/demandes?v=${x.status}&s=${x.id}">${inner}${ic('chev', 16)}</a>` : `<div class="q-lrow">${inner}</div>`; };
  return `<div class="q-card q-pad"><div class="row between" style="padding:18px 0 4px;gap:10px"><span class="b" style="font-size:16px">Inscriptions en attente <span class="mut" style="font-weight:400">${p.length}</span></span>${adm ? `<a class="btn2 sm" href="#/admin/demandes">Traiter les demandes ${ic('chev', 14)}</a>` : ''}</div>
  <span class="small mut">${adm ? 'Touchez une demande pour l’accepter ou la refuser. ' : 'La direction accepte ou refuse les demandes. '}La cotisation sera à prévoir une fois l’inscription acceptée.</span>
  ${(full ? p : p.slice(0, 4)).map(row).join('')}
  ${!full && p.length > 4 ? `<div style="padding:12px 0"><a class="small b" href="${adm ? '#/admin/demandes' : '#/compta/cotisations'}">Tout voir (${p.length})</a></div>` : '<div style="height:6px"></div>'}</div>`;
}
