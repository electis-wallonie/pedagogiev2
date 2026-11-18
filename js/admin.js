// Connexion, changement de mot de passe, espace administrateur (création des comptes professeurs)
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, fdate, toast, openModal, closeModal, copyText, todayISO, takePending , ask, askText } from './ui.js';
import { shell } from './prof.js';
import { langBtn } from './public.js';
import { locauxTile, financeTile, hoursPill } from './gestion.js';
import { contactFields, readContact } from './contact.js';
import { publicTile, teamHost, mosqueName, loadMawaqit, mawaqitData } from './mosquee.js';
import { demandesTile, pending } from './demandes.js';
import { hero } from './ui.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
let loginErr = false;

export function loginView() {
  const err = loginErr; loginErr = false;
  if (!mawaqitData()) loadMawaqit();
  return `<div class="page narrow" style="padding-top:30px">
  <div class="row">${teamHost() ? '' : `<a href="#/" class="ib" aria-label="Retour">${ic('back', 20)}</a>`}<span class="logo">${ic('moon', 22, 2.6)}</span><span class="grow col" style="gap:0"><span class="b" style="font-size:18px">Espace équipe</span><span class="small mut b" data-notr dir="auto">${esc(mosqueName())}</span></span>${langBtn()}</div>
  <form class="bcard col" data-form="login"><span class="w1-blob" aria-hidden="true"><i></i><i></i></span>
    <span class="col" style="gap:2px;padding-inline-end:70px"><h1 style="margin:0;color:#fff;font-size:24px">Connexion</h1><span class="small b" style="font-weight:600">Réservé à la direction, à la comptabilité et aux professeurs.</span></span>
    <div class="field"><label class="lbl" for="lg">Identifiant</label><input id="lg" name="login" class="inp" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label class="lbl" for="pw">Mot de passe</label><input id="pw" name="pw" type="password" class="inp" autocomplete="current-password" required></div>
    ${err ? '<div class="err" role="alert">Identifiant ou mot de passe incorrect.</div>' : ''}
    <button class="btn full">${ic('lock', 20)}Se connecter</button>
    <p class="small b" style="font-weight:600;color:#DCE3FF">Pas de compte ? Les comptes sont créés par la direction.</p>
  </form>
  ${d.D().demo ? `<div class="ck flat pad col" style="background:var(--hi);gap:8px"><span class="b">Comptes de démonstration</span>
    ${[['Méga admin', 'admin', 'admin1234'], ['Admin', 'direction', 'admin1234'], ['Comptabilité', 'tresorier', 'compta1234'], ['Prof', 'rahman', 'prof1234']].map(([r, l, p]) => `<div class="row between small"><span><b>${r}</b> : ${l} / ${p}</span><button class="btn2 sm" data-act="demo-login" data-l="${l}" data-p="${p}">Utiliser</button></div>`).join('')}</div>` : ''}
  </div>`;
}
FORMS.login = async (f, fd) => {
  const u = await d.checkLogin(fd.get('login') || '', fd.get('pw') || '');
  if (!u) { loginErr = true; go('#/login'); return; }
  d.login(u);
  go(u.mustChange ? '#/mdp' : d.homeOf(u));
};
ACT['demo-login'] = (el) => { document.getElementById('lg').value = el.dataset.l; document.getElementById('pw').value = el.dataset.p; };
ACT.logout = () => { d.logout(); go('#/'); };

export function pwView(u) {
  return `<div class="page narrow" style="padding-top:30px">
  <h1>${u.mustChange ? 'Choisissez votre mot de passe' : 'Changer de mot de passe'}</h1>
  ${u.mustChange ? '<p class="mut b" style="font-weight:600">Votre compte a été créé avec un mot de passe temporaire. Choisissez-en un nouveau.</p>' : ''}
  <form class="bcard col" data-form="pw" style="background:var(--ink)"><span class="w1-blob" aria-hidden="true"><i></i><i></i></span>
    ${u.mustChange ? '' : '<div class="field"><label class="lbl" for="p0">Mot de passe actuel</label><input id="p0" name="old" type="password" class="inp" autocomplete="current-password" required></div>'}
    <div class="field"><label class="lbl" for="p1">Nouveau mot de passe</label><input id="p1" name="p1" type="password" class="inp" autocomplete="new-password" minlength="8" required><span class="hint">8 caractères minimum</span></div>
    <div class="field"><label class="lbl" for="p2">Confirmer</label><input id="p2" name="p2" type="password" class="inp" autocomplete="new-password" minlength="8" required></div>
    <button class="btn full">Enregistrer</button>
    ${u.mustChange ? '' : `<a href="#/prof/reglages" class="btn2 full">Annuler</a>`}
  </form></div>`;
}
FORMS.pw = async (f, fd) => {
  const u = d.me();
  if (!u.mustChange && !(await d.checkLogin(u.login, fd.get('old') || ''))) { toast('Mot de passe actuel incorrect'); return; }
  const p1 = fd.get('p1') || '';
  if (p1.length < 8) { toast('8 caractères minimum'); return; }
  if (p1 !== fd.get('p2')) { toast('Les deux mots de passe ne correspondent pas'); return; }
  await d.setPassword(u, p1, false);
  toast('Mot de passe enregistré');
  go('#/prof');
};

// ---------- admin ----------
const ROLE_BG = { super: 'var(--yellow)', admin: 'var(--pink)', compta: 'var(--mint)', prof: 'var(--blue2)' };
const roleKey = (u) => (d.isSuper(u) ? 'super' : u.role);
// le méga administrateur crée tous les comptes ; un administrateur crée les professeurs
const creatable = (me) => (d.isSuper(me) ? [['prof', 'Professeur'], ['admin', 'Administrateur'], ['compta', 'Comptabilité']] : [['prof', 'Professeur']]);
const canManage = (me, u) => u.id !== me.id && !d.isSuper(u) && (d.isSuper(me) || u.role === 'prof');
export function adminView(u) {
  const team = d.D().users.slice().sort((a, b) => (['super', 'admin', 'compta', 'prof'].indexOf(roleKey(a)) - ['super', 'admin', 'compta', 'prof'].indexOf(roleKey(b))) || a.name.localeCompare(b.name));
  const rows = team.map((p) => {
    const info = p.role === 'prof' ? ` · ${d.classesOf(p.id).length} classe(s) · ${d.studentsOfProf(p.id).length} élève(s)` : '';
    return `<div class="li" style="align-items:flex-start">${av(p.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 44, ROLE_BG[roleKey(p)], 14)}
    <div class="grow"><div class="row wrap" style="gap:6px"><span class="b">${esc(p.name)}${p.id === u.id ? ' (moi)' : ''}</span>${pill(d.roleLabel(p), ROLE_BG[roleKey(p)])}</div>
    <div class="small mut b" style="font-weight:600">Identifiant : <b>${esc(p.login)}</b>${info} ${p.role === 'prof' || d.profHours(p.id).n ? hoursPill(p) : ''}${p.mustChange ? ' · ' + pill('Mot de passe temporaire', 'var(--hi)') : ''}</div>
    <div class="small b" style="font-weight:600;word-break:break-all">${p.tel || p.email ? `${esc(p.tel || '')}${p.tel && p.email ? ' · ' : ''}${esc(p.email || '')}` : '<span style="color:var(--absent)">Téléphone et e-mail à compléter</span>'}</div></div>
    ${canManage(u, p) || p.id === u.id ? `<button class="ib sm" data-act="user-contact" data-id="${p.id}" aria-label="Coordonnées de ${esc(p.name)}">${ic('phone', 18)}</button>` : ''}
    ${canManage(u, p) ? `<button class="ib sm" data-act="prof-reset" data-id="${p.id}" aria-label="Réinitialiser le mot de passe de ${esc(p.name)}">${ic('key', 18)}</button><button class="ib sm" data-act="prof-del" data-id="${p.id}" aria-label="Supprimer ${esc(p.name)}">${ic('trash', 18)}</button>` : ''}</div>`;
  }).join('');
  const today = todayISO();
  const ann = (d.D().announcements || []).slice().sort((a, b) => b.from.localeCompare(a.from));
  const annRows = ann.map((a) => {
    const st = a.to < today ? ['Terminé', 'var(--neutral)'] : a.from > today ? ['À venir', 'var(--blue2)'] : ['En ligne', 'var(--mint)'];
    return `<div class="li" style="align-items:flex-start"><div class="grow col" style="gap:6px"><div class="row wrap" style="gap:8px">${pill(st[0], st[1])}<span class="small b">${fdate(a.from)} → ${fdate(a.to)}</span></div>${a.text ? `<div data-notr dir="auto" style="white-space:pre-wrap;font-weight:500">${esc(a.text)}</div>` : ''}${a.audioId ? `<audio controls preload="none" data-audio="${a.audioId}" style="width:100%;height:40px"></audio>` : ''}</div><button class="ib sm" data-act="ann-del" data-id="${a.id}" aria-label="Supprimer le message">${ic('trash', 16)}</button></div>`;
  }).join('');
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const roles = creatable(u);
  return shell(u, 4, `<div class="page">
  <div class="top"><span class="logo">${ic('shield', 22, 2.6)}</span><div class="grow"><div class="small mut b">${d.roleLabel(u)}</div><h1>Direction</h1></div></div>
  ${(() => { const p = pending(); return hero('Demandes d’inscription', p.length ? `${p.length} en attente` : 'Aucune en attente', { sub: 'Envoyées depuis l’onglet Cours du site', shadow: 'var(--pink)', extra: `<a class="btn y full" href="#/admin/demandes">${ic('users', 18)}Voir les demandes</a>` }); })()}
  <div class="gridauto">${publicTile()}${locauxTile()}${financeTile()}</div>
  <div class="ck pad col" id="messages"><h2>${ic('mega', 22)} Message de la direction</h2>
  <p class="small mut b" style="font-weight:600">Affiché en haut de toutes les fiches élèves et des tableaux de bord de l’équipe, entre les deux dates choisies.</p>
  <form class="col composer bubble" data-form="ann">
    <div class="grid2"><div class="field"><label class="lbl" for="af">Visible du</label><input id="af" name="from" type="date" class="inp" value="${today}" required></div><div class="field"><label class="lbl" for="at">Jusqu’au</label><input id="at" name="to" type="date" class="inp" value="${in7}" required></div></div>
    <label class="sr" for="za-t">Message</label><textarea id="za-t" name="text" class="inp" placeholder="Ex : l’école sera fermée samedi prochain…"></textarea>
    <div id="za"></div>
    <div class="row"><button type="button" class="btn2 sm mic" data-act="rec" data-zone="za">${ic('mic', 20)}Vocal</button><span class="grow"></span><button class="btn sm">${ic('send', 18)}Publier</button></div>
  </form>
  <div class="list">${annRows || '<p class="small mut">Aucun message pour le moment.</p>'}</div></div>
  <div class="grid2 stack" style="align-items:start">
  <form class="ck pad col" data-form="new-prof">
    <h2>Nouveau compte</h2>
    ${roles.length > 1 ? `<fieldset style="border:0;padding:0;margin:0"><legend class="lbl">Type de compte</legend><div class="seg roles">${roles.map(([k, l], i) => `<label style="flex:1"><input type="radio" name="role" value="${k}" class="sr" ${i === 0 ? 'checked' : ''}><span class="rolebtn">${l}</span></label>`).join('')}</div></fieldset>
    <p class="tiny mut b">Professeur : ses classes et ses élèves. Administrateur : gère toute l’école et la direction. Comptabilité : uniquement l’espace comptable (recettes, dépenses, cotisations, rapports).</p>` : '<input type="hidden" name="role" value="prof">'}
    <div class="field"><label class="lbl" for="np-n">Nom affiché</label><input id="np-n" name="name" class="inp" placeholder="ex. Imam Youssef" required></div>
    ${contactFields({}, 'np')}
    <div class="field"><label class="lbl" for="np-l">Identifiant de connexion</label><input id="np-l" name="login" class="inp" autocapitalize="none" placeholder="ex. youssef" pattern="[a-zA-Z0-9._\\-]{3,30}" required><span class="hint">Lettres, chiffres, point ou tiret, 3 caractères minimum</span></div>
    <div class="field"><label class="lbl" for="np-p">Mot de passe temporaire</label><div class="row"><input id="np-p" name="pw" class="inp" value="${d.randomPw()}" required minlength="8"><button type="button" class="ib" data-act="gen-pw" aria-label="Générer un autre mot de passe">${ic('refresh', 18)}</button></div><span class="hint">À changer à la première connexion.</span></div>
    <button class="btn full">${ic('plus', 20)}Créer le compte</button>
  </form>
  <div class="ck pad col"><div class="row between"><h2>L’équipe</h2>${pill(team.length + ' compte(s)', 'var(--neutral)')}</div>
  <div class="list">${rows}</div><a class="btn2 sm" href="#/prof/annuaire" style="align-self:flex-start">${ic('users', 16)}Annuaire de l’équipe</a></div>
  </div></div>`);
}
FORMS.ann = async (f, fd) => {
  const from = fd.get('from'), to = fd.get('to');
  if (to < from) { toast('La date de fin est avant la date de début'); return; }
  const text = (fd.get('text') || '').trim();
  const audioId = await takePending('za');
  if (audioId === false) return;
  if (!text && !audioId) { toast('Écrivez un message ou enregistrez un vocal'); return; }
  d.D().announcements.push({ id: d.uid(), text, audioId, from, to, at: new Date().toISOString(), authorId: d.me().id });
  d.save(); toast('Message publié'); go('#/admin');
};
ACT['ann-del'] = async (el) => {
  if (!ask('Supprimer ce message ?')) return;
  const a = d.D().announcements.find((x) => x.id === el.dataset.id);
  if (a && a.audioId) await d.delAudio(a.audioId).catch(() => {});
  d.D().announcements = d.D().announcements.filter((x) => x.id !== el.dataset.id);
  d.save(); go('#/admin');
};
ACT['gen-pw'] = () => { document.getElementById('np-p').value = d.randomPw(); };
function credsModal(title, name, login, pw) {
  const txt = `Accès à l’application de la mosquée\nAdresse : ${location.origin}${location.pathname}#/login\nIdentifiant : ${login}\nMot de passe temporaire : ${pw}`;
  openModal(() => `<div class="row between"><h2>${title}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <p class="mut b" style="font-weight:600">Transmettez ces identifiants à ${esc(name)}. Le mot de passe ne sera plus affiché ensuite.</p>
  <div class="ck flat pad col" style="background:var(--hi)"><div><span class="small mut b">Identifiant</span><div class="code" style="font-size:20px">${esc(login)}</div></div><div><span class="small mut b">Mot de passe temporaire</span><div class="code" style="font-size:20px">${esc(pw)}</div></div></div>
  <button class="btn full" data-act="copy-creds" data-t="${esc(txt)}">${ic('copy', 20)}Copier le message</button>`);
}
ACT['copy-creds'] = (el) => copyText(el.dataset.t);
FORMS['new-prof'] = async (f, fd) => {
  const role = fd.get('role') || 'prof';
  if (!creatable(d.me()).some(([k]) => k === role)) { toast('Vous ne pouvez pas créer ce type de compte'); return; }
  const login = (fd.get('login') || '').trim().toLowerCase();
  const name = (fd.get('name') || '').trim();
  const pw = fd.get('pw') || '';
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) { toast('Identifiant invalide'); return; }
  if (d.D().users.some((u) => u.login === login)) { toast('Cet identifiant existe déjà'); return; }
  if (pw.length < 8) { toast('Mot de passe : 8 caractères minimum'); return; }
  const ct = readContact(fd); if (!ct) return;
  const u = await d.makeUser(role, login, name, pw, true);
  Object.assign(u, ct);
  d.D().users.push(u); if (role === 'prof') d.D().objectives.push(...d.defaultObjectives(u.id)); d.save();
  go('#/admin');
  credsModal('Compte créé', name, login, pw);
};
ACT['prof-reset'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !canManage(d.me(), u) || !ask(`Réinitialiser le mot de passe de ${u.name} ?`)) return;
  const pw = d.randomPw();
  await d.setPassword(u, pw, true);
  go('#/admin');
  credsModal('Nouveau mot de passe', u.name, u.login, pw);
};
ACT['prof-del'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !canManage(d.me(), u)) return;
  if (!ask(`Supprimer le compte de ${u.name} ?${u.role === 'prof' ? '\n\nToutes ses classes, ses élèves et leur suivi seront effacés définitivement.' : ''}`)) return;
  if (u.role === 'prof') await d.deleteProf(u.id); else { d.D().users = d.D().users.filter((x) => x.id !== u.id); d.save(); }
  toast('Compte supprimé');
  go('#/admin');
};
