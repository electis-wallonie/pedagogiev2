// Connexion, changement de mot de passe, espace administrateur (création des comptes professeurs)
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, fdate, toast, openModal, closeModal, copyText, todayISO, takePending , ask, askText } from './ui.js';
import { shell } from './prof.js';
import { langBtn } from './public.js';
import { locauxTile, financeTile, hoursPill, locauxSummary, eur } from './gestion.js';
import { contactFields, readContact } from './contact.js';
import { publicTile, teamHost, mosqueName, loadMawaqit, mawaqitData } from './mosquee.js';
import { demandesTile, pending, schoolYear, yearOpen } from './demandes.js';
import { hero, brandLogo } from './ui.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
let loginErr = false;

export function loginView() {
  if (!d.D().users.length) { location.hash = '#/installation'; return null; }
  const err = loginErr; loginErr = false;
  if (!mawaqitData()) loadMawaqit();
  return `<div class="page narrow" style="padding-top:30px">
  <div class="row">${teamHost() ? '' : `<a href="#/" class="ib" aria-label="Retour">${ic('back', 20)}</a>`}${brandLogo(44)}<span class="grow col" style="gap:0"><span class="b" style="font-size:18px">Espace équipe</span><span class="small mut b" data-notr dir="auto">${esc(mosqueName())}</span></span>${langBtn()}</div>
  <form class="bcard col" data-form="login"><span class="w1-blob" aria-hidden="true"><i></i><i></i></span>
    <span class="col" style="gap:2px;padding-inline-end:70px"><h1 style="margin:0;color:#fff;font-size:24px">Connexion</h1><span class="small b" style="font-weight:600">Réservé à la direction, à la comptabilité et aux professeurs.</span></span>
    <div class="field"><label class="lbl" for="lg">Identifiant</label><input id="lg" name="login" class="inp" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label class="lbl" for="pw">Mot de passe</label><input id="pw" name="pw" type="password" class="inp" autocomplete="current-password" required></div>
    ${err ? '<div class="err" role="alert">Identifiant ou mot de passe incorrect.</div>' : ''}
    <button class="btn full">${ic('lock', 20)}Se connecter</button>
    <p class="small b" style="font-weight:600;color:#DCE3FF">Pas de compte ? Les comptes sont créés par la direction.</p>
  </form>
  </div>`;
}
FORMS.login = async (f, fd) => {
  const u = await d.checkLogin(fd.get('login') || '', fd.get('pw') || '');
  if (!u) { loginErr = true; go('#/login'); return; }
  d.login(u);
  go(u.mustChange ? '#/mdp' : d.homeOf(u));
};
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
const PALQ = ['q-p0', 'q-p1', 'q-p2', 'q-p3'];
const RPAL = { super: 'q-p3', admin: 'q-p2', compta: 'q-p1', prof: 'q-p0' };
const ini2 = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const qhead = (title, sub, right = '', back = '') => `<div class="qd-h">${back ? `<a href="${back}" class="ib" aria-label="Retour">${ic('back', 20)}</a>` : ''}<div class="grow"><h1>${title}</h1>${sub ? `<div class="qd-sub">${sub}</div>` : ''}</div>${right}</div>`;
const sortTeam = () => d.D().users.slice().sort((a, b) => (['super', 'admin', 'compta', 'prof'].indexOf(roleKey(a)) - ['super', 'admin', 'compta', 'prof'].indexOf(roleKey(b))) || a.name.localeCompare(b.name));
const annState = (a, today = todayISO()) => (a.to < today ? ['Terminé', 'neu'] : a.from > today ? ['À venir', 'warn'] : ['En ligne', 'ok']);
const modCard = (href, icon, title, sub, info, btn, pri = false) => `<a class="q-card q-mod" href="${href}"><span class="row between"><span class="q-glyph">${ic(icon, 18)}</span>${ic('chev', 18)}</span>
  <span class="col" style="gap:2px"><span class="b" style="font-size:16px">${title}</span><span class="small mut">${sub}</span></span><span class="q-mod-sep"></span><span class="small">${info}</span><span class="${pri ? 'btn' : 'btn2'} sm full">${btn}</span></a>`;

// ---------- direction : le hub ----------
export function adminView(u) {
  const team = d.D().users;
  const sts = d.D().students, cls = d.D().classes;
  const rates = sts.map((x) => d.presence(x).rate).filter((x) => x != null);
  const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const dem = pending();
  const today = todayISO();
  const ann = d.D().announcements || [];
  const live = ann.filter((a) => annState(a)[1] === 'ok').length, soon = ann.filter((a) => annState(a)[1] === 'warn').length;
  const tmp = team.filter((x) => x.mustChange).length, noCt = team.filter((x) => !x.tel && !x.email).length;
  const L = locauxSummary(), fin = d.financeSummary(), c = d.cotisations();
  const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0;
  const todoF = d.D().families.filter((f) => f.status !== 'paid' && +f.cotisation);
  const resteF = todoF.reduce((t, f) => t + (+f.cotisation || 0) - d.famPaid(f), 0);
  const todo = [
    dem.length && ['q-p3', dem.length, `${dem.length} demande(s) d’inscription`, 'Envoyées depuis l’onglet Cours du site', '#/admin/demandes', 'Traiter'],
    todoF.length && ['q-p2', todoF.length, `${todoF.length} famille(s) à relancer`, `${eur(resteF)} de cotisations en attente`, '#/prof/familles', 'Relancer'],
    tmp && ['q-p1', tmp, `${tmp} compte(s) avec mot de passe temporaire`, 'Pas encore connecté(s) une première fois', '#/admin/equipe', 'Voir'],
    noCt && ['q-p0', noCt, `${noCt} membre(s) sans coordonnées`, 'Téléphone et e-mail à compléter', '#/admin/equipe', 'Compléter'],
    L.conflicts && ['q-p1', L.conflicts, `${L.conflicts} conflit(s) de salle`, 'Deux classes au même moment dans le même local', '#/admin/locaux', 'Voir'],
  ].filter(Boolean);
  return shell(u, 4, `<div class="page">
  ${qhead('Direction', `${fdate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · ${d.roleLabel(u)}`, `<a class="btn sm" href="#/prof/eleve/new">${ic('plus', 18)}Ajouter un élève</a>`)}
  <div class="q-card q-stats q-stats-link"><a href="#/prof/eleves"><b>${sts.length}</b><span>élèves</span></a><a href="#/prof/classes"><b>${cls.length}</b><span>classes</span></a><a href="#/prof/eleves"><b>${avg == null ? '—' : avg + ' %'}</b><span>présence moyenne</span></a><a href="#/admin/demandes"><b>${dem.length}</b><span>demande(s) en attente</span></a></div>
  ${todo.length ? `<div class="q-card q-pad"><div class="q-sec"><b>À traiter</b><span>${todo.length}</span></div>${todo.map(([pc, n, t, sub, h, btn]) => `<a class="q-lrow q-link" href="${h}"><span class="q-av ${pc}">${n}</span><span class="t"><b>${t}</b><span>${sub}</span></span><span class="btn2 sm">${btn}</span></a>`).join('')}</div>` : ''}
  <div class="q-mods">
    ${modCard('#/admin/demandes', 'inbox', 'Demandes d’inscription', 'Reçues depuis l’onglet Cours', `${dem.length ? `${dem.length} en attente` : 'Aucune en attente'}<br>${[schoolYear(0), schoolYear(1)].map((y) => `${y} : ${yearOpen(y) ? 'ouvertes' : '<b>fermées</b>'}`).join(' · ')}`, 'Traiter', dem.length > 0)}
    ${modCard('#/admin/equipe', 'users', 'Équipe &amp; comptes', 'Professeurs, administrateurs, trésorier', `${team.length} compte(s)${tmp ? ` · ${tmp} mot de passe temporaire` : ''}`, 'Gérer l’équipe')}
    ${modCard('#/admin/message', 'bell', 'Message de la direction', 'En haut des fiches et des tableaux de bord', `${live} en ligne · ${soon} à venir`, 'Écrire un message')}
    ${modCard('#/admin/public', 'moon', 'Mosquée &amp; espace public', 'Nom, horaires, contact, questions à l’imam', `${(d.D().contacts || []).length} destinataire(s) · ${(d.D().faq || []).length} réponse(s) publiée(s)`, 'Modifier')}
    ${modCard('#/admin/locaux', 'door', 'Locaux', 'Salles et emploi du temps', `${L.n} salle(s) · ${L.used} créneau(x) · ${L.conflicts ? L.conflicts + ' conflit(s)' : 'aucun conflit'}`, 'Voir les locaux')}
    ${modCard('#/compta', 'euro', 'Finances', 'Comptabilité de l’association', `Solde <span class="q-amt">${eur(fin.solde)}</span> · cotisations ${pct} %`, 'Ouvrir la compta')}
  </div>
  ${d.isSuper(u) ? `<a class="q-card q-lrow q-link" href="#/admin/annee" style="margin:0;padding:16px 22px"><span class="q-glyph">${ic('refresh', 16)}</span><span class="t"><b>Nouvelle année scolaire</b><span>Télécharger le fichier de la rentrée, puis réinitialiser l’application</span></span>${ic('chev', 18)}</a>` : ''}</div>`);
}

// ---------- équipe & comptes ----------
const ROLES_TAB = [['all', 'Tous'], ['prof', 'Professeurs'], ['admin', 'Administration'], ['compta', 'Comptabilité']];
export function equipeView(u, q) {
  const r = (q && q.get('r')) || 'all';
  const team = sortTeam();
  const inTab = (p, k) => k === 'all' || (k === 'admin' ? p.role === 'admin' || d.isSuper(p) : p.role === k && !d.isSuper(p));
  const list = team.filter((p) => inTab(p, r));
  const rows = list.map((p) => {
    const info = p.role === 'prof' ? `${d.classesOf(p.id).length} classe(s) · ${d.studentsOfProf(p.id).length} élève(s)` : d.roleLabel(p);
    const h = d.profHours(p.id);
    return `<tr><td><span class="q-who"><span class="q-av ${RPAL[roleKey(p)]}">${esc(ini2(p.name))}</span><span class="col" style="gap:0"><span>${esc(p.name)}${p.id === u.id ? ' <span class="mut small">(moi)</span>' : ''}</span>${p.mustChange ? '<span class="small" style="color:var(--q-warn)">Mot de passe temporaire</span>' : ''}</span></span></td>
    <td class="hm">${esc(d.roleLabel(p))}</td><td class="hm mut">${esc(p.login)}</td><td class="hm mut">${p.role === 'prof' ? info + (h.n ? ` · ${d.fmtH(h.min)} ce mois` : '') : '—'}</td>
    <td class="hm">${p.tel || p.email ? `<span class="col" style="gap:0"><span class="q-amt" style="font-weight:400">${esc(p.tel || '')}</span><span class="small mut" style="word-break:break-all">${esc(p.email || '')}</span></span>` : '<span style="color:var(--q-neg)">à compléter</span>'}</td>
    <td class="r" style="white-space:nowrap">${canManage(u, p) || p.id === u.id ? `<button class="ib sm" data-act="user-contact" data-id="${p.id}" aria-label="Coordonnées de ${esc(p.name)}">${ic('phone', 16)}</button>` : ''}
    ${canManage(u, p) ? `<button class="ib sm" data-act="prof-reset" data-id="${p.id}" aria-label="Réinitialiser le mot de passe de ${esc(p.name)}">${ic('key', 16)}</button><button class="ib sm" data-act="prof-del" data-id="${p.id}" aria-label="Supprimer ${esc(p.name)}">${ic('trash', 16)}</button>` : ''}</td></tr>`;
  }).join('');
  return shell(u, 4, `<div class="page">
  ${qhead('Équipe &amp; comptes', `${team.length} compte(s) · seuls les administrateurs voient cette page`, `<a class="btn2 sm" href="#/prof/annuaire">${ic('users', 16)}Annuaire</a><button class="btn sm" data-act="acct-new">${ic('plus', 18)}Nouveau compte</button>`, '#/admin')}
  <nav class="q-tabs">${ROLES_TAB.map(([k, l]) => `<a href="#/admin/equipe?r=${k}" class="${r === k ? 'on' : ''}">${l} <span class="mut">${team.filter((p) => inTab(p, k)).length}</span></a>`).join('')}</nav>
  <div class="q-card q-pad"><div style="overflow-x:auto"><table class="q-tbl q-tbl-static"><thead><tr><th>Membre</th><th class="hm">Rôle</th><th class="hm">Identifiant</th><th class="hm">Classes</th><th class="hm">Coordonnées</th><th class="r">Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="mut">Personne ici.</td></tr>'}</tbody></table></div></div>
  <p class="small mut">${ic('phone', 14)} coordonnées · ${ic('key', 14)} nouveau mot de passe temporaire · ${ic('trash', 14)} supprimer le compte</p></div>`);
}
ACT['acct-new'] = () => {
  const roles = creatable(d.me());
  openModal(() => `<div class="row between"><h2>Nouveau compte</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <form class="col" data-form="new-prof">
    ${roles.length > 1 ? `<fieldset style="border:0;padding:0;margin:0"><legend class="lbl">Type de compte</legend><div class="seg roles">${roles.map(([k, l], i) => `<label style="flex:1"><input type="radio" name="role" value="${k}" class="sr" ${i === 0 ? 'checked' : ''}><span class="rolebtn">${l}</span></label>`).join('')}</div></fieldset>
    <p class="small mut">Professeur : ses classes et ses élèves. Administrateur : toute l’école et la direction. Comptabilité : uniquement l’espace comptable.</p>` : '<input type="hidden" name="role" value="prof">'}
    <div class="field"><label class="lbl" for="np-n">Nom affiché</label><input id="np-n" name="name" class="inp" placeholder="ex. Imam Youssef" required></div>
    ${contactFields({}, 'np')}
    <div class="field"><label class="lbl" for="np-l">Identifiant de connexion</label><input id="np-l" name="login" class="inp" autocapitalize="none" placeholder="ex. youssef" pattern="[a-zA-Z0-9._\\-]{3,30}" required><span class="hint">Lettres, chiffres, point ou tiret, 3 caractères minimum</span></div>
    <div class="field"><label class="lbl" for="np-p">Mot de passe temporaire</label><div class="row"><input id="np-p" name="pw" class="inp code" value="${d.randomPw()}" required minlength="8"><button type="button" class="btn2 sm" data-act="gen-pw">${ic('refresh', 16)}Générer</button></div><span class="hint">À changer à la première connexion.</span></div>
    <button class="btn full">${ic('plus', 20)}Créer le compte</button></form>`);
};

// ---------- message de la direction ----------
export function messageView(u) {
  const today = todayISO();
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const ann = (d.D().announcements || []).slice().sort((a, b) => b.from.localeCompare(a.from));
  const rows = ann.map((a) => { const [l, k] = annState(a, today); return `<div class="q-lrow" style="align-items:flex-start"><span class="q-glyph">${ic(a.audioId ? 'mic' : 'bell', 16)}</span><span class="t">${a.text ? `<b data-notr dir="auto" style="white-space:pre-wrap">${esc(a.text)}</b>` : '<b>Message vocal</b>'}<span>${fdate(a.from)} → ${fdate(a.to)}${a.audioId ? ' · avec vocal' : ''}</span>${a.audioId ? `<audio controls preload="none" data-audio="${a.audioId}" style="width:100%;height:40px;margin-top:6px"></audio>` : ''}</span><span class="col" style="gap:8px;align-items:flex-end"><button class="ib sm" data-act="ann-del" data-id="${a.id}" aria-label="Supprimer le message">${ic('trash', 16)}</button><span class="q-st ${k}">${l}</span></span></div>`; }).join('');
  return shell(u, 4, `<div class="page">
  ${qhead('Message de la direction', 'Un message affiché en haut des fiches élèves et des tableaux de bord de l’équipe', '', '#/admin')}
  <div class="q-row2" style="align-items:flex-start">
  <form class="q-card col" data-form="ann" style="width:440px;max-width:100%;flex:none;box-sizing:border-box;padding:20px 24px;gap:12px"><span class="b" style="font-size:16px">Nouveau message</span>
    <span class="small mut">Visible entre les deux dates choisies.</span>
    <div class="grid2"><div class="field"><label class="lbl" for="af">Visible du</label><input id="af" name="from" type="date" class="inp" value="${today}" required></div><div class="field"><label class="lbl" for="at">Jusqu’au</label><input id="at" name="to" type="date" class="inp" value="${in7}" required></div></div>
    <div class="field"><label class="lbl" for="za-t">Message</label><textarea id="za-t" name="text" class="inp" rows="4" placeholder="Ex : l’école sera fermée samedi prochain…"></textarea></div>
    <div id="za"></div>
    <div class="row"><button type="button" class="btn2 sm mic" data-act="rec" data-zone="za">${ic('mic', 18)}Vocal</button><span class="grow"></span><button class="btn sm">${ic('send', 18)}Publier</button></div>
  </form>
  <div class="col grow" style="gap:12px;min-width:0"><h2 style="margin:0">Messages</h2><div class="q-card q-pad">${rows || '<p class="small mut" style="padding:16px 0">Aucun message pour le moment.</p>'}</div></div>
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
  d.save(); toast('Message publié'); go('#/admin/message');
};
ACT['ann-del'] = async (el) => {
  if (!ask('Supprimer ce message ?')) return;
  const a = d.D().announcements.find((x) => x.id === el.dataset.id);
  if (a && a.audioId) await d.delAudio(a.audioId).catch(() => {});
  d.D().announcements = d.D().announcements.filter((x) => x.id !== el.dataset.id);
  d.save(); go('#/admin/message');
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
  closeModal(); go('#/admin/equipe');
  credsModal('Compte créé', name, login, pw);
};
ACT['prof-reset'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !canManage(d.me(), u) || !ask(`Réinitialiser le mot de passe de ${u.name} ?`)) return;
  const pw = d.randomPw();
  await d.setPassword(u, pw, true);
  go('#/admin/equipe');
  credsModal('Nouveau mot de passe', u.name, u.login, pw);
};
ACT['prof-del'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !canManage(d.me(), u)) return;
  if (!ask(`Supprimer le compte de ${u.name} ?${u.role === 'prof' ? '\n\nToutes ses classes, ses élèves et leur suivi seront effacés définitivement.' : ''}`)) return;
  if (u.role === 'prof') await d.deleteProf(u.id); else { d.D().users = d.D().users.filter((x) => x.id !== u.id); d.save(); }
  toast('Compte supprimé');
  go('#/admin/equipe');
};
