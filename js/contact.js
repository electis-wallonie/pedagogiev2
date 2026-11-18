// Coordonnées des comptes (admin, profs), annuaire de l'équipe, et page « Contact » publique
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, toast, openModal, closeModal } from './ui.js';
import { shell } from './prof.js';
import { comptaShell } from './compta.js';

const rerender = () => window.dispatchEvent(new Event('hashchange'));
const top = (title, sub, back) => `<div class="top">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div></div>`;
export const okMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m || '').trim());
export const okTel = (t) => String(t || '').replace(/[^\d]/g, '').length >= 8;
const telHref = (t) => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const waNum = (t) => { const x = String(t || '').replace(/[^\d+]/g, ''); return x.startsWith('+') ? x.slice(1) : x.startsWith('00') ? x.slice(2) : null; };

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
const rank = (u) => (d.isSuper(u) ? 0 : u.role === 'admin' ? 1 : u.role === 'compta' ? 2 : 3);
export function annuaire(u) {
  const team = d.D().users.slice().sort((a, b) => ((rank(a) - rank(b)) || a.name.localeCompare(b.name)));
  const rows = team.map((p) => {
    const cl = d.classesOf(p.id).map((c) => c.name).join(', ');
    const wa = waNum(p.tel);
    return `<div class="ck pad col" style="gap:10px" data-q="${esc((p.name + ' ' + (cl || '') + ' ' + d.roleLabel(p)).toLowerCase())}">
    <div class="row">${av(initialsOf(p.name), 46, p.role === 'admin' ? 'var(--yellow)' : p.role === 'compta' ? 'var(--mint)' : 'var(--blue2)', 15)}<div class="grow"><div class="b" style="font-size:17px">${esc(p.name)}${p.id === u.id ? ' (moi)' : ''}</div><div class="small mut b" style="font-weight:600">${d.roleLabel(p)}${cl ? ' · ' + esc(cl) : ''}</div></div>${d.isAdmin(u) ? `<button class="ib sm" data-act="user-contact" data-id="${p.id}" aria-label="Modifier les coordonnées de ${esc(p.name)}">${ic('edit', 16)}</button>` : ''}</div>
    <div class="row wrap" style="gap:6px 16px">${p.tel ? `<span class="code">${esc(p.tel)}</span>` : ''}${p.email ? `<span class="b small" style="word-break:break-all">${esc(p.email)}</span>` : ''}${!p.tel && !p.email ? '<span class="small mut b">Coordonnées pas encore renseignées</span>' : ''}</div>
    <div class="row wrap" style="gap:8px">${p.tel ? `<a class="btn2 sm" href="${telHref(p.tel)}">${ic('phone', 16)}Appeler</a>${wa ? `<a class="btn2 sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic('chat', 16)}WhatsApp</a>` : ''}` : ''}${p.email ? `<a class="btn2 sm" href="mailto:${esc(p.email)}">${ic('mail', 16)}E-mail</a>` : ''}</div></div>`;
  }).join('');
  return (d.isCompta(u) ? (b) => comptaShell(u, 'compte', b) : (b) => shell(u, 3, b))(`<div class="page narrow">${top('Annuaire de l’équipe', `${team.length} personne(s) · visible seulement par l’équipe`, d.isCompta(u) ? '#/compta/compte' : '#/prof/reglages')}
  <div class="field"><label class="sr" for="aq">Rechercher</label><input id="aq" class="inp" placeholder="Rechercher un nom, une classe…" data-filter="[data-q]"></div>
  ${rows}</div>`);
}

// ---------- page Contact (publique, pour tout le monde) ----------
import { pubShell } from './mosquee.js';
const SUJETS = ['Question générale', 'Prière / vie de la mosquée', 'Question religieuse', 'Cours / école', 'Absence ou retard à un cours', 'Inscription', 'Don / zakat', 'Location de salle', 'Événement', 'Bénévolat', 'Autre'];
function recipients() {
  const g1 = (d.D().contacts || []).filter((c) => okMail(c.email)).map((c) => ({ id: 'c:' + c.id, label: c.label, email: c.email, icon: 'shield' }));
  const g2 = d.profs().filter((p) => okMail(p.email) && p.showContact !== false).map((p) => { const cl = d.classesOf(p.id).map((c) => c.name).join(', '); return { id: 'u:' + p.id, label: p.name, sub: cl ? 'Enseignant · ' + cl : 'Enseignant', email: p.email, icon: 'book' }; });
  return [g1, g2];
}
export function contactPage(q) {
  const [g1, g2] = recipients();
  const radio = (r, first) => `<label class="ck flat row" style="gap:10px;padding:10px 12px;cursor:pointer"><input type="radio" name="to" value="${r.id}" ${first ? 'checked' : ''} required style="width:22px;height:22px">${ic(r.icon, 20)}<span class="grow"><span class="b" style="display:block">${esc(r.label)}</span>${r.sub ? `<span class="small mut b" style="font-weight:600">${esc(r.sub)}</span>` : ''}</span></label>`;
  return pubShell(3, `<h1 style="font-size:clamp(30px,5vw,46px);line-height:1.05">Contact</h1>
  <p class="mut b" style="font-weight:600">Une question, une demande, un message ? Choisissez qui vous voulez contacter. En appuyant sur « Écrire le message », votre application e-mail s’ouvre avec le destinataire, le sujet et le message déjà remplis : il ne reste plus qu’à envoyer.</p>
  ${g1.length || g2.length ? `<form class="ck pad col" data-form="contact">
    <fieldset style="border:0;padding:0;margin:0"><legend class="lbl">1. Qui voulez-vous contacter ?</legend><div class="col" style="gap:8px">
    ${g1.length ? `<span class="tiny b mut">LA MOSQUÉE</span>${g1.map((r, i) => radio(r, i === 0)).join('')}` : ''}
    ${g2.length ? `<span class="tiny b mut" style="margin-top:6px">LES ENSEIGNANTS</span>${g2.map((r, i) => radio(r, !g1.length && i === 0)).join('')}` : ''}</div></fieldset>
    <div class="field"><label class="lbl" for="cs">2. Sujet</label><select id="cs" name="sujet" class="inp" required>${SUJETS.map((x) => `<option>${x}</option>`).join('')}</select></div>
    <div class="field"><label class="lbl" for="co">3. Objet</label><input id="co" name="objet" class="inp" required placeholder="ex. Demande de renseignements"></div>
    <div class="field"><label class="lbl" for="cm">4. Votre message</label><textarea id="cm" name="message" class="inp" rows="6" required placeholder="As-salamu alaykum, …"></textarea></div>
    <div class="grid2 stack"><div class="field"><label class="lbl" for="cn">Votre nom</label><input id="cn" name="nom" class="inp" required></div>
    <div class="field"><label class="lbl" for="ctl">Votre téléphone (facultatif)</label><input id="ctl" name="tel" type="tel" class="inp" placeholder="Pour être rappelé"></div></div>
    <button class="btn full">${ic('mail', 20)}Écrire le message</button>
    <p class="tiny mut b">Les numéros et adresses de l’équipe ne sont pas affichés publiquement.</p></form>`
    : `<div class="ck pad" style="background:var(--hi)"><p class="b">Aucun contact disponible pour le moment.</p></div>`}`);
}
FORMS.contact = (f, fd) => {
  const r = recipients().flat().find((x) => x.id === fd.get('to'));
  if (!r) { toast('Choisissez un destinataire'); return; }
  const tel = (fd.get('tel') || '').trim();
  const subject = `[${fd.get('sujet')}] ${(fd.get('objet') || '').trim()}`;
  const body = `${(fd.get('message') || '').trim()}\n\n${(fd.get('nom') || '').trim()}${tel ? `\nTél. : ${tel}` : ''}`;
  location.href = `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
