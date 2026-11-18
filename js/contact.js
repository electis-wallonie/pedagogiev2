// Coordonnées des comptes (admin, profs), annuaire de l'équipe, et page « Contact » publique
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, toast, openModal, closeModal } from './ui.js';
import { shell } from './prof.js';

const rerender = () => window.dispatchEvent(new Event('hashchange'));
const top = (title, sub, back) => `<div class="top">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div></div>`;
export const okMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m || '').trim());
export const okTel = (t) => String(t || '').replace(/[^\d]/g, '').length >= 8;
const telHref = (t) => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const waNum = (t) => { const x = String(t || '').replace(/[^\d+]/g, ''); return x.startsWith('+') ? x.slice(1) : x.startsWith('00') ? x.slice(2) : null; };
const ROLE = { admin: 'Direction', prof: 'Professeur' };
const initialsOf = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2);

// champs téléphone + e-mail (réutilisés : création de prof, mes coordonnées, modification par l'admin)
export function contactFields(u = {}, pre = 'u') {
  return `<div class="grid2 stack"><div class="field"><label class="lbl" for="${pre}-t">Téléphone</label><input id="${pre}-t" name="tel" type="tel" inputmode="tel" class="inp code" required value="${esc(u.tel || '')}" placeholder="ex. +32 470 12 34 56"></div>
  <div class="field"><label class="lbl" for="${pre}-m">E-mail</label><input id="${pre}-m" name="email" type="email" inputmode="email" autocapitalize="none" class="inp" required value="${esc(u.email || '')}" placeholder="ex. nom@gmail.com"></div></div>`;
}
export function readContact(fd) {
  const tel = (fd.get('tel') || '').trim(), email = (fd.get('email') || '').trim().toLowerCase();
  if (!okTel(tel)) { toast('Indiquez un numéro de téléphone'); return null; }
  if (!okMail(email)) { toast('Indiquez une adresse e-mail valide'); return null; }
  return { tel, email };
}

// ---------- mes coordonnées (Réglages) ----------
export function myContactCard(u) {
  const missing = !u.tel || !u.email;
  return `<form class="ck pad col" data-form="my-contact" ${missing ? 'style="background:var(--hi)"' : ''}><h2>${ic('phone', 20)} Mes coordonnées</h2>
  <p class="small mut b" style="font-weight:600">${missing ? 'À compléter. ' : ''}Visibles par toute l’équipe (direction et professeurs) dans l’annuaire. Les parents ne voient jamais votre numéro ni votre e-mail : ils peuvent seulement vous écrire depuis la page Contact.</p>
  ${contactFields(u, 'me')}<button class="btn sm" style="align-self:flex-start">Enregistrer</button></form>`;
}
FORMS['my-contact'] = (f, fd) => { const v = readContact(fd); if (!v) return; Object.assign(d.me(), v); d.save(); toast('Coordonnées enregistrées'); rerender(); };

// ---------- l'admin modifie les coordonnées d'un compte ----------
ACT['user-contact'] = (el) => {
  const u = d.user(el.dataset.id);
  openModal(() => `<div class="row between"><h2>Coordonnées · ${esc(u.name)}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="user-contact" data-id="${u.id}">${contactFields(u, 'uc')}<button class="btn full">Enregistrer</button></form>`);
};
FORMS['user-contact'] = (f, fd) => { const v = readContact(fd); if (!v) return; Object.assign(d.user(f.dataset.id), v); d.save(); closeModal(); toast('Coordonnées enregistrées'); rerender(); };

// ---------- annuaire de l'équipe (profs et admin) ----------
export function annuaire(u) {
  const team = d.D().users.slice().sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1));
  const rows = team.map((p) => {
    const cl = d.classesOf(p.id).map((c) => c.name).join(', ');
    const wa = waNum(p.tel);
    return `<div class="ck pad col" style="gap:10px" data-q="${esc((p.name + ' ' + (cl || '') + ' ' + (ROLE[p.role] || '')).toLowerCase())}">
    <div class="row">${av(initialsOf(p.name), 46, p.role === 'admin' ? 'var(--yellow)' : 'var(--blue2)', 15)}<div class="grow"><div class="b" style="font-size:17px">${esc(p.name)}${p.id === u.id ? ' (moi)' : ''}</div><div class="small mut b" style="font-weight:600">${ROLE[p.role] || ''}${cl ? ' · ' + esc(cl) : ''}</div></div>${d.isAdmin(u) ? `<button class="ib sm" data-act="user-contact" data-id="${p.id}" aria-label="Modifier les coordonnées de ${esc(p.name)}">${ic('edit', 16)}</button>` : ''}</div>
    <div class="row wrap" style="gap:6px 16px">${p.tel ? `<span class="code">${esc(p.tel)}</span>` : ''}${p.email ? `<span class="b small" style="word-break:break-all">${esc(p.email)}</span>` : ''}${!p.tel && !p.email ? '<span class="small mut b">Coordonnées pas encore renseignées</span>' : ''}</div>
    <div class="row wrap" style="gap:8px">${p.tel ? `<a class="btn2 sm" href="${telHref(p.tel)}">${ic('phone', 16)}Appeler</a>${wa ? `<a class="btn2 sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic('chat', 16)}WhatsApp</a>` : ''}` : ''}${p.email ? `<a class="btn2 sm" href="mailto:${esc(p.email)}">${ic('mail', 16)}E-mail</a>` : ''}</div></div>`;
  }).join('');
  return shell(u, 3, `<div class="page narrow">${top('Annuaire de l’équipe', `${team.length} personne(s) · visible seulement par l’équipe`, '#/prof/reglages')}
  <div class="field"><label class="sr" for="aq">Rechercher</label><input id="aq" class="inp" placeholder="Rechercher un nom, une classe…" data-filter="[data-q]"></div>
  ${rows}</div>`);
}

// ---------- adresse de la direction (Direction) ----------
export function directionMail() {
  const c = d.D().contact || {};
  if (okMail(c.email)) return c.email;
  const a = d.D().users.find((x) => x.role === 'admin' && okMail(x.email));
  return a ? a.email : '';
}
export function directionContactCard() {
  const c = d.D().contact || {};
  return `<form class="ck pad col" data-form="dir-contact"><h2>${ic('mail', 20)} Contact de la direction</h2>
  <p class="small mut b" style="font-weight:600">Adresse qui reçoit les messages envoyés à « La direction » depuis la page Contact. Si elle est vide, c’est l’e-mail de l’administrateur qui est utilisé.</p>
  <div class="row"><label class="sr" for="dc">E-mail de la direction</label><input id="dc" name="email" type="email" class="inp" value="${esc(c.email || '')}" placeholder="${esc(directionMail() || 'ex. direction@ecole.be')}"><button class="btn sm">Enregistrer</button></div></form>`;
}
FORMS['dir-contact'] = (f, fd) => {
  const email = (fd.get('email') || '').trim().toLowerCase();
  if (email && !okMail(email)) { toast('Adresse e-mail invalide'); return; }
  d.D().contact = { ...(d.D().contact || {}), email }; d.save(); toast('Enregistré'); rerender();
};

// ---------- page Contact (publique) ----------
const SUJETS = ['Absence', 'Retard', 'Question sur le suivi', 'Inscription', 'Cotisation / paiement', 'Autre'];
function recipients() {
  const out = [];
  if (directionMail()) out.push({ id: 'direction', label: 'La direction', email: directionMail() });
  for (const p of d.profs()) if (okMail(p.email)) { const cl = d.classesOf(p.id).map((c) => c.name).join(', '); out.push({ id: p.id, label: p.name + (cl ? ` (${cl})` : ''), email: p.email }); }
  return out;
}
export function contactPage(q) {
  const st = q && q.get('c') ? d.byCode(q.get('c')) : null;
  const R = recipients();
  const pid = st ? d.profOfStudent(st) : null;
  const def = R.find((r) => r.id === pid) ? pid : 'direction';
  const back = st ? `#/f/${encodeURIComponent(st.code)}` : '#/';
  return `<div class="page narrow" style="padding-top:20px">
  <div class="row"><a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a><span class="grow"></span></div>
  <h1>Contact</h1>
  <p class="mut b" style="font-weight:600">Écrivez à un professeur ou à la direction. En appuyant sur « Écrire le message », votre application e-mail s’ouvre avec le destinataire, le sujet et le message déjà remplis : il ne reste plus qu’à envoyer.</p>
  ${R.length ? `<form class="ck pad col" data-form="contact">
    <fieldset style="border:0;padding:0;margin:0"><legend class="lbl">1. Qui voulez-vous contacter ?</legend><div class="col" style="gap:8px">
    ${R.map((r) => `<label class="ck flat row" style="gap:10px;padding:10px 12px;cursor:pointer"><input type="radio" name="to" value="${r.id}" ${r.id === def ? 'checked' : ''} required style="width:22px;height:22px">${r.id === 'direction' ? ic('shield', 20) : ic('users', 20)}<span class="b grow">${esc(r.label)}</span></label>`).join('')}</div></fieldset>
    <div class="field"><label class="lbl" for="cs">2. Sujet</label><select id="cs" name="sujet" class="inp" required>${SUJETS.map((s) => `<option>${s}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="co">3. Objet</label><input id="co" name="objet" class="inp" required placeholder="ex. Yasmine sera absente samedi"></div>
    <div class="field"><label class="lbl" for="cm">4. Votre message</label><textarea id="cm" name="message" class="inp" rows="6" required placeholder="Bonjour,…"></textarea></div>
    <div class="grid2 stack"><div class="field"><label class="lbl" for="cn">Votre nom</label><input id="cn" name="nom" class="inp" required value="${st ? esc(st.parent + ' ' + st.nom) : ''}"></div>
    <div class="field"><label class="lbl" for="ce">Enfant concerné (facultatif)</label><input id="ce" name="enfant" class="inp" value="${st ? esc(st.prenoms.split(' ')[0] + ' ' + st.nom + ' · ' + (d.cls(st.classId) || {}).name) : ''}"></div></div>
    <button class="btn full">${ic('mail', 20)}Écrire le message</button>
    <p class="tiny mut b">Les numéros de téléphone et adresses de l’équipe ne sont pas affichés publiquement.</p></form>`
    : `<div class="ck pad" style="background:var(--hi)"><p class="b">Aucun contact disponible pour le moment.</p></div>`}</div>`;
}
FORMS.contact = (f, fd) => {
  const r = recipients().find((x) => x.id === fd.get('to'));
  if (!r) { toast('Choisissez un destinataire'); return; }
  const enfant = (fd.get('enfant') || '').trim();
  const subject = `[${fd.get('sujet')}] ${(fd.get('objet') || '').trim()}${enfant ? ' – ' + enfant : ''}`;
  const body = `${(fd.get('message') || '').trim()}\n\n${(fd.get('nom') || '').trim()}${enfant ? `\nEnfant : ${enfant}` : ''}`;
  location.href = `mailto:${encodeURIComponent(r.email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
