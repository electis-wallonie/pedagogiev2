// Connexion, changement de mot de passe, espace administrateur (création des comptes professeurs)
import * as d from './data.js';
import { ACT, FORMS, esc, ic, av, pill, fdate, toast, openModal, closeModal, copyText, todayISO, takePending , ask, askText } from './ui.js';
import { shell } from './prof.js';
import { langBtn } from './public.js';

const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };
let loginErr = false;

export function loginView() {
  const err = loginErr; loginErr = false;
  return `<div class="page narrow" style="padding-top:30px">
  <div class="row"><a href="#/" class="ib" aria-label="Retour">${ic('back', 20)}</a><span class="logo">${ic('book', 22, 2.6)}</span><span class="b grow" style="font-size:18px">Espace enseignant</span>${langBtn()}</div>
  <h1>Connexion</h1>
  <form class="ck pad col" data-form="login">
    <div class="field"><label class="lbl" for="lg">Identifiant</label><input id="lg" name="login" class="inp" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label class="lbl" for="pw">Mot de passe</label><input id="pw" name="pw" type="password" class="inp" autocomplete="current-password" required></div>
    ${err ? '<div class="err" role="alert">Identifiant ou mot de passe incorrect.</div>' : ''}
    <button class="btn full">${ic('lock', 20)}Se connecter</button>
    <p class="small mut b" style="font-weight:600">Pas de compte ? Les comptes enseignants sont créés par l’administrateur.</p>
  </form>
  ${d.D().demo ? `<div class="ck flat pad col" style="background:var(--hi);gap:8px"><span class="b">Comptes de démonstration</span>
    <div class="row between small"><span><b>Admin</b> : admin / admin1234</span><button class="btn2 sm" data-act="demo-login" data-l="admin" data-p="admin1234">Utiliser</button></div>
    <div class="row between small"><span><b>Prof</b> : rahman / prof1234</span><button class="btn2 sm" data-act="demo-login" data-l="rahman" data-p="prof1234">Utiliser</button></div></div>` : ''}
  </div>`;
}
FORMS.login = async (f, fd) => {
  const u = await d.checkLogin(fd.get('login') || '', fd.get('pw') || '');
  if (!u) { loginErr = true; go('#/login'); return; }
  d.login(u);
  go(u.mustChange ? '#/mdp' : '#/prof');
};
ACT['demo-login'] = (el) => { document.getElementById('lg').value = el.dataset.l; document.getElementById('pw').value = el.dataset.p; };
ACT.logout = () => { d.logout(); go('#/'); };

export function pwView(u) {
  return `<div class="page narrow" style="padding-top:30px">
  <h1>${u.mustChange ? 'Choisissez votre mot de passe' : 'Changer de mot de passe'}</h1>
  ${u.mustChange ? '<p class="mut b" style="font-weight:600">Votre compte a été créé avec un mot de passe temporaire. Choisissez-en un nouveau.</p>' : ''}
  <form class="ck pad col" data-form="pw">
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
export function adminView(u) {
  const profs = d.D().users.filter((x) => x.role === 'prof').sort((a, b) => a.name.localeCompare(b.name));
  const rows = profs.map((p) => {
    const nc = d.classesOf(p.id).length, ns = d.studentsOfProf(p.id).length;
    return `<div class="li">${av(p.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 44, 'var(--blue2)', 14)}
    <div class="grow"><div class="b">${esc(p.name)}</div><div class="small mut b" style="font-weight:600">Identifiant : <b>${esc(p.login)}</b> · ${nc} classe(s) · ${ns} élève(s)${p.mustChange ? ' · ' + pill('Mot de passe temporaire', 'var(--yellow)') : ''}</div></div>
    <button class="ib sm" data-act="prof-reset" data-id="${p.id}" aria-label="Réinitialiser le mot de passe de ${esc(p.name)}">${ic('key', 18)}</button>
    <button class="ib sm" data-act="prof-del" data-id="${p.id}" aria-label="Supprimer ${esc(p.name)}">${ic('trash', 18)}</button></div>`;
  }).join('');
  const today = todayISO();
  const ann = (d.D().announcements || []).slice().sort((a, b) => b.from.localeCompare(a.from));
  const annRows = ann.map((a) => {
    const st = a.to < today ? ['Terminé', 'var(--neutral)'] : a.from > today ? ['À venir', 'var(--blue2)'] : ['En ligne', 'var(--mint)'];
    return `<div class="li" style="align-items:flex-start"><div class="grow col" style="gap:6px"><div class="row wrap" style="gap:8px">${pill(st[0], st[1])}<span class="small b">${fdate(a.from)} → ${fdate(a.to)}</span></div>${a.text ? `<div data-notr dir="auto" style="white-space:pre-wrap;font-weight:500">${esc(a.text)}</div>` : ''}${a.audioId ? `<audio controls preload="none" data-audio="${a.audioId}" style="width:100%;height:40px"></audio>` : ''}</div><button class="ib sm" data-act="ann-del" data-id="${a.id}" aria-label="Supprimer le message">${ic('trash', 16)}</button></div>`;
  }).join('');
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  return shell(u, 4, `<div class="page">
  <div class="top"><span class="logo">${ic('shield', 22, 2.6)}</span><div class="grow"><div class="small mut b">Administration</div><h1>Direction</h1></div></div>
  <p class="mut b" style="font-weight:600">En tant qu’administrateur, vous voyez et gérez tout : toutes les classes, tous les élèves, l’appel, le Coran, les objectifs et les notes, comme un professeur. Ici : les comptes des professeurs et les messages de la direction.</p>
  <div class="ck pad col" id="messages"><h2>${ic('mega', 22)} Message de la direction</h2>
  <p class="small mut b" style="font-weight:600">Affiché en haut de toutes les fiches élèves (parents) et des tableaux de bord (professeurs), entre les deux dates choisies.</p>
  <form class="col" data-form="ann">
    <div class="grid2"><div class="field"><label class="lbl" for="af">Visible du</label><input id="af" name="from" type="date" class="inp" value="${today}" required></div><div class="field"><label class="lbl" for="at">Jusqu’au</label><input id="at" name="to" type="date" class="inp" value="${in7}" required></div></div>
    <label class="sr" for="za-t">Message</label><textarea id="za-t" name="text" class="inp" placeholder="Ex : l’école sera fermée samedi prochain…"></textarea>
    <div id="za"></div>
    <div class="row"><button type="button" class="btn2 sm mic" data-act="rec" data-zone="za">${ic('mic', 20)}Vocal</button><span class="grow"></span><button class="btn sm">${ic('send', 18)}Publier</button></div>
  </form>
  <div class="list">${annRows || '<p class="small mut">Aucun message pour le moment.</p>'}</div></div>
  <div class="grid2 stack" style="align-items:start">
  <form class="ck pad col" data-form="new-prof">
    <h2>Nouveau professeur</h2>
    <div class="field"><label class="lbl" for="np-n">Nom affiché aux parents</label><input id="np-n" name="name" class="inp" placeholder="ex. Imam Youssef" required></div>
    <div class="field"><label class="lbl" for="np-l">Identifiant de connexion</label><input id="np-l" name="login" class="inp" autocapitalize="none" placeholder="ex. youssef" pattern="[a-zA-Z0-9._\\-]{3,30}" required><span class="hint">Lettres, chiffres, point ou tiret, 3 caractères minimum</span></div>
    <div class="field"><label class="lbl" for="np-p">Mot de passe temporaire</label><div class="row"><input id="np-p" name="pw" class="inp" value="${d.randomPw()}" required minlength="8"><button type="button" class="ib" data-act="gen-pw" aria-label="Générer un autre mot de passe">${ic('refresh', 18)}</button></div><span class="hint">Le professeur devra le changer à sa première connexion.</span></div>
    <button class="btn full">${ic('plus', 20)}Créer le compte</button>
  </form>
  <div class="ck pad col"><div class="row between"><h2>Professeurs</h2>${pill(profs.length + ' compte(s)', 'var(--neutral)')}</div>
  <div class="list">${rows || '<p class="mut small">Aucun professeur pour le moment.</p>'}</div></div>
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
  const txt = `Suivi — accès enseignant\nAdresse : ${location.origin}${location.pathname}#/login\nIdentifiant : ${login}\nMot de passe temporaire : ${pw}`;
  openModal(() => `<div class="row between"><h2>${title}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>
  <p class="mut b" style="font-weight:600">Transmettez ces identifiants à ${esc(name)}. Le mot de passe ne sera plus affiché ensuite.</p>
  <div class="ck flat pad col" style="background:var(--hi)"><div><span class="small mut b">Identifiant</span><div class="code" style="font-size:20px">${esc(login)}</div></div><div><span class="small mut b">Mot de passe temporaire</span><div class="code" style="font-size:20px">${esc(pw)}</div></div></div>
  <button class="btn full" data-act="copy-creds" data-t="${esc(txt)}">${ic('copy', 20)}Copier le message</button>`);
}
ACT['copy-creds'] = (el) => copyText(el.dataset.t);
FORMS['new-prof'] = async (f, fd) => {
  const login = (fd.get('login') || '').trim().toLowerCase();
  const name = (fd.get('name') || '').trim();
  const pw = fd.get('pw') || '';
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) { toast('Identifiant invalide'); return; }
  if (d.D().users.some((u) => u.login === login)) { toast('Cet identifiant existe déjà'); return; }
  if (pw.length < 8) { toast('Mot de passe : 8 caractères minimum'); return; }
  const u = await d.makeUser('prof', login, name, pw, true);
  d.D().users.push(u); d.D().objectives.push(...d.defaultObjectives(u.id)); d.save();
  go('#/admin');
  credsModal('Compte créé', name, login, pw);
};
ACT['prof-reset'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !ask(`Réinitialiser le mot de passe de ${u.name} ?`)) return;
  const pw = d.randomPw();
  await d.setPassword(u, pw, true);
  go('#/admin');
  credsModal('Nouveau mot de passe', u.name, u.login, pw);
};
ACT['prof-del'] = async (el) => {
  const u = d.D().users.find((x) => x.id === el.dataset.id);
  if (!u || !ask(`Supprimer le compte de ${u.name} ?\n\nToutes ses classes, ses élèves et leur suivi seront effacés définitivement.`)) return;
  await d.deleteProf(u.id);
  toast('Compte supprimé');
  go('#/admin');
};
