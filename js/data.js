// Couche de données — mode démo : tout est stocké sur cet appareil
// (localStorage pour les données, IndexedDB pour les messages vocaux).
// Toutes les lectures/écritures passent par ce fichier : c'est le seul à
// remplacer pour brancher plus tard un vrai serveur (ex. Supabase).

const KEY = 'suivi-db-v1';
const SESSION = 'suivi-session';
const CODES = 'suivi-codes';
let db = null;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (db && db.users) { db.announcements = db.announcements || []; migrateGestion(db); }
  return db;
}
export function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
export function setDb(d) { db = d; save(); }
export function D() { return db; }

import { isAr, SOURATES_AR } from './i18n.js';

// ---------- audio (IndexedDB) ----------
let idbp = null;
function idb() {
  if (!idbp) idbp = new Promise((res, rej) => {
    const r = indexedDB.open('suivi-audio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('a');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return idbp;
}
function tx(mode, fn) {
  return idb().then((d) => new Promise((res, rej) => {
    const t = d.transaction('a', mode);
    const req = fn(t.objectStore('a'));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  }));
}
export const putAudio = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getAudio = (id) => tx('readonly', (s) => s.get(id));
export const delAudio = (id) => tx('readwrite', (s) => s.delete(id));
export const clearAudio = () => tx('readwrite', (s) => s.clear());

// ---------- mots de passe ----------
export async function hashPw(pw, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function randomPw() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(10));
  for (const x of r) s += a[x % a.length];
  return s.slice(0, 5) + '-' + s.slice(5);
}
export async function makeUser(role, login, name, pw, mustChange) {
  const salt = uid() + uid();
  return { id: uid(), role, login: login.trim().toLowerCase(), name: name.trim(), salt, hash: await hashPw(pw, salt), mustChange: !!mustChange, createdAt: new Date().toISOString() };
}
export async function checkLogin(login, pw) {
  const u = db.users.find((x) => x.login === login.trim().toLowerCase());
  if (!u) return null;
  return (await hashPw(pw, u.salt)) === u.hash ? u : null;
}
export async function setPassword(u, pw, mustChange = false) {
  u.salt = uid() + uid();
  u.hash = await hashPw(pw, u.salt);
  u.mustChange = mustChange;
  save();
}

// ---------- session ----------
export function me() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION));
    return s && db.users.find((u) => u.id === s.id) || null;
  } catch { return null; }
}
export function login(u) { localStorage.setItem(SESSION, JSON.stringify({ id: u.id })); }
export function logout() { localStorage.removeItem(SESSION); }

// ---------- codes enregistrés (côté parent, sur cet appareil) ----------
export function savedCodes() { try { return JSON.parse(localStorage.getItem(CODES)) || []; } catch { return []; } }
export function rememberCode(code) { const c = savedCodes().filter((x) => x !== code); c.unshift(code); localStorage.setItem(CODES, JSON.stringify(c.slice(0, 8))); }
export function forgetCodes() { localStorage.removeItem(CODES); }

// ---------- sourates ----------
export const SOURATES = ['Al-Fatiha', 'Al-Baqara', 'Al-Imran', 'An-Nisa', 'Al-Ma’ida', 'Al-An’am', 'Al-A’raf', 'Al-Anfal', 'At-Tawba', 'Yunus', 'Hud', 'Yusuf', 'Ar-Ra’d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Mu’minun', 'An-Nur', 'Al-Furqan', 'Ash-Shu’ara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum', 'Luqman', 'As-Sajda', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiya', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqi’a', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahana', 'As-Saff', 'Al-Jumu’a', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqa', 'Al-Ma’arij', 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyama', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Nazi’at', 'Abasa', 'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-A’la', 'Al-Ghashiya', 'Al-Fajr', 'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyina', 'Az-Zalzala', 'Al-Adiyat', 'Al-Qari’a', 'At-Takathur', 'Al-Asr', 'Al-Humaza', 'Al-Fil', 'Quraysh', 'Al-Ma’un', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'];
export const sName = (n) => (isAr ? SOURATES_AR : SOURATES)[n - 1];
export function sState(st, n) { const x = st.coran && st.coran[n]; return x ? x.s : 'n'; }
export function coranStats(st) {
  let v = 0, c = 0;
  for (const k in st.coran || {}) { if (st.coran[k].s === 'v') v++; else if (st.coran[k].s === 'c') c++; }
  return { v, c, n: 114 - v - c };
}
export function enCours(st) { return Object.keys(st.coran || {}).map(Number).filter((n) => st.coran[n].s === 'c').sort((a, b) => b - a); }
export function sourateNotes(sid, n) { return db.snotes.filter((x) => x.studentId === sid && x.n === n).sort((a, b) => a.at.localeCompare(b.at)); }

// ---------- âge ----------
// On enregistre soit la date de naissance (précise), soit l'âge donné à une date (ageAt) :
// l'âge affiché se met à jour tout seul chaque année.
export function ageOf(st) {
  const now = new Date();
  if (st.naissance) {
    const b = new Date(st.naissance + 'T12:00:00');
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a;
  }
  if (st.age != null && st.age !== '') {
    const at = new Date((st.ageAt || now.toISOString().slice(0, 10)) + 'T12:00:00');
    return +st.age + Math.floor((now - at) / (365.25 * 864e5));
  }
  return null;
}

// ---------- périmètre : un prof voit ses classes, l'admin voit tout ----------
export const isAdmin = (u) => u && u.role === 'admin';
export const profs = () => db.users.filter((u) => u.role === 'prof').sort((a, b) => a.name.localeCompare(b.name));
export const user = (id) => db.users.find((u) => u.id === id);
export const myClasses = (u) => (isAdmin(u) ? db.classes.slice() : db.classes.filter((c) => c.profId === u.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
export const myStudents = (u) => { const ids = myClasses(u).map((c) => c.id); return db.students.filter((s) => ids.includes(s.classId)); };
export const canSeeClass = (u, c) => !!c && (isAdmin(u) || c.profId === u.id);
export const canSeeStudent = (u, s) => !!s && canSeeClass(u, cls(s.classId));

// ---------- horaires des classes ----------
// Une classe a 0, 1 ou plusieurs cours par semaine : slots = [{ day: 0-6 (0 = dimanche), time: 'HH:MM' }]
export function slotsOf(c) {
  if (!c) return [];
  if (Array.isArray(c.slots)) return c.slots.filter((s) => s && s.time && s.day != null);
  if (c.day != null && c.time) return [{ day: +c.day, time: c.time }]; // anciennes données
  return [];
}
// Prochain cours à partir de maintenant (un cours en cours depuis moins d'1 h compte encore)
export function nextCourse(c, now = new Date()) {
  let best = null;
  for (const s of slotsOf(c)) {
    const [h, m] = s.time.split(':').map(Number);
    const t = new Date(now); t.setHours(h, m, 0, 0);
    t.setDate(t.getDate() + ((s.day - now.getDay() + 7) % 7));
    if (t.getTime() < now.getTime() - 60 * 60e3) t.setDate(t.getDate() + 7);
    if (!best || t < best.when) best = { when: t, slot: s };
  }
  return best;
}

// ---------- messages de la direction ----------
export function activeAnnouncements(today) {
  return (db.announcements || []).filter((a) => a.from <= today && today <= a.to).sort((a, b) => b.at.localeCompare(a.at));
}

// ---------- requêtes ----------
export const classesOf = (profId) => db.classes.filter((c) => c.profId === profId);
export const cls = (id) => db.classes.find((c) => c.id === id);
export const student = (id) => db.students.find((s) => s.id === id);
export const studentsOf = (classId) => db.students.filter((s) => s.classId === classId).sort((a, b) => a.nom.localeCompare(b.nom));
export const studentsOfProf = (profId) => { const ids = classesOf(profId).map((c) => c.id); return db.students.filter((s) => ids.includes(s.classId)); };
export function byCode(code) {
  const k = normCode(code);
  return k ? db.students.find((s) => normCode(s.code) === k) : null;
}
export const normCode = (c) => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const when = (a) => a.date + ' ' + (a.time || '') + (a.at || '');
// Numéro du cours quand une classe a plusieurs appels le même jour (sinon 0)
export function courseNo(a) { const same = db.attendance.filter((x) => x.classId === a.classId && x.date === a.date).sort((x, y) => when(x).localeCompare(when(y))); return same.length > 1 ? same.indexOf(a) + 1 : 0; }
export function attendanceOfClass(classId) { return db.attendance.filter((a) => a.classId === classId).sort((a, b) => when(b).localeCompare(when(a))); }
export function attendanceOfStudent(st) {
  return db.attendance.filter((a) => a.classId === st.classId && a.records[st.id]).sort((a, b) => when(b).localeCompare(when(a))).map((a) => ({ date: a.date, n: courseNo(a), s: a.records[st.id] }));
}
export function presence(st) {
  const h = attendanceOfStudent(st);
  const P = h.filter((x) => x.s === 'P').length, A = h.filter((x) => x.s === 'A').length, E = h.filter((x) => x.s === 'E').length;
  return { h, P, A, E, total: h.length, rate: h.length ? Math.round((P / h.length) * 100) : null };
}
export function objectivesOf(profId, level) { return db.objectives.filter((o) => o.profId === profId && o.level === level); }
export function levelsOf(profId) { const l = [...new Set(db.objectives.filter((o) => o.profId === profId).map((o) => o.level))].sort((a, b) => a - b); return l.length ? l : [1]; }
export function profOfStudent(st) { const c = cls(st.classId); return c && c.profId; }
export function notesForStudent(st) {
  return db.notes.filter((n) => (n.scope === 'student' && n.studentId === st.id) || (n.scope === 'class' && n.classId === st.classId)).sort((a, b) => b.at.localeCompare(a.at));
}

// ---------- code de suivi ----------
// Format : CLASSE-INITIALES-PARENT-JJMMAAAA-XXXX
// (les 4 derniers caractères sont aléatoires pour qu'on ne puisse pas deviner le code)
function strip(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ''); }
export function classSlug(name) {
  const s = strip(name);
  const m = s.match(/^CLASSE\s*([A-Z0-9]+)/);
  if (m) return 'CL' + m[1];
  return s.replace(/ /g, '').slice(0, 5) || 'CL';
}
export function genCode(st, c) {
  const ini = strip(st.prenoms).split(' ').filter(Boolean).map((w) => w[0]).join('') + strip(st.nom).replace(/ /g, '').slice(0, 1);
  const par = strip(st.parent).split(' ')[0] || 'P';
  const [y, m, d] = (st.naissance || '').split('-');
  const datePart = st.naissance ? `${d}${m}${y}` : `${ageOf(st) ?? 0}ANS`;
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    const r = crypto.getRandomValues(new Uint8Array(4));
    const suf = [...r].map((x) => a[x % a.length]).join('');
    code = `${classSlug(c.name)}-${ini}-${par}-${datePart}-${suf}`;
  } while (db.students.some((s) => s.id !== st.id && normCode(s.code) === normCode(code)));
  return code;
}

// Objectifs proposés par défaut à chaque nouveau professeur (modifiables dans Réglages)
export const DEFAULT_OBJ = [
  [1, 'Langue arabe', 'Reconnaître les 28 lettres'], [1, 'Langue arabe', 'Écrire les lettres isolées'], [1, 'Langue arabe', 'Lire les voyelles courtes'],
  [1, 'Langue arabe', 'Lire des mots de 3 lettres'], [1, 'Langue arabe', 'Lire une phrase courte'],
  [1, 'Religion', 'Connaître les 5 piliers'], [1, 'Religion', 'Savoir faire les ablutions'], [1, 'Religion', 'Invocations du quotidien'],
  [2, 'Langue arabe', 'Lire un texte voyellé'], [2, 'Langue arabe', 'Écrire une phrase dictée'], [2, 'Langue arabe', 'Conjuguer au passé'],
  [2, 'Religion', 'Les étapes de la prière'], [2, 'Religion', 'Histoire des prophètes (1)'],
];
export function defaultObjectives(profId) { return DEFAULT_OBJ.map(([level, group, text]) => ({ id: uid(), profId, level, group, text })); }

// ---------- pièces jointes : supprimées automatiquement après leur date limite ----------
export async function purgeExpired() {
  if (!db) return false;
  const now = new Date().toISOString();
  let changed = false;
  for (const n of db.notes) {
    if (!n.files || !n.files.length) continue;
    const keep = [];
    for (const f of n.files) { if (f.until <= now) { await delAudio(f.id).catch(() => {}); changed = true; } else keep.push(f); }
    n.files = keep;
  }
  if (changed) { db.notes = db.notes.filter((n) => n.text || n.audioId || (n.files && n.files.length)); save(); }
  return changed;
}

// ---------- suppressions en cascade ----------
export async function deleteStudent(id) {
  for (const n of db.snotes.filter((x) => x.studentId === id)) if (n.audioId) await delAudio(n.audioId).catch(() => {});
  for (const n of db.notes.filter((x) => x.studentId === id)) if (n.audioId) await delAudio(n.audioId).catch(() => {});
  db.snotes = db.snotes.filter((x) => x.studentId !== id);
  db.notes = db.notes.filter((x) => x.studentId !== id);
  db.attendance.forEach((a) => delete a.records[id]);
  db.students = db.students.filter((s) => s.id !== id);
  save();
}
export async function deleteClass(id) {
  for (const s of studentsOf(id)) await deleteStudent(s.id);
  for (const n of db.notes.filter((x) => x.classId === id)) for (const b of [n.audioId, ...(n.files || []).map((f) => f.id)]) if (b) await delAudio(b).catch(() => {});
  db.notes = db.notes.filter((n) => n.classId !== id);
  db.attendance = db.attendance.filter((a) => a.classId !== id);
  db.classes = db.classes.filter((c) => c.id !== id);
  save();
}
export async function deleteProf(id) {
  for (const c of classesOf(id)) await deleteClass(c.id);
  db.objectives = db.objectives.filter((o) => o.profId !== id);
  db.notes = db.notes.filter((n) => n.profId !== id);
  db.users = db.users.filter((u) => u.id !== id);
  save();
}

// ---------- gestion : locaux, heures des profs, familles, finances ----------
export const DEFAULT_LOCAUX = ['Local 1', 'Local 2', 'Local 3', 'Salle de prière hommes', 'Salle de prière femmes'];
function migrateGestion(x) {
  if (!Array.isArray(x.locaux)) x.locaux = DEFAULT_LOCAUX.map((name) => ({ id: uid(), name }));
  if (!Array.isArray(x.families)) x.families = [];
  if (!x.finance) x.finance = {};
  const f = x.finance;
  if (f.rate == null) f.rate = 10;
  f.incomes = f.incomes || [];
  f.expenses = f.expenses || [];
  f.overrides = f.overrides || {};
}
export const local = (id) => (db.locaux || []).find((l) => l.id === id);
export const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const slotMin = (s) => (s && s.time && s.end ? Math.max(0, toMin(s.end) - toMin(s.time)) : 0);
// Durée d'un appel = durée du créneau de la classe ce jour-là (le plus proche de l'heure de l'appel)
export function recSlot(a) {
  const sl = slotsOf(cls(a.classId));
  if (!sl.length) return null;
  const dow = new Date(a.date + 'T12:00:00').getDay();
  const cand = sl.filter((s) => +s.day === dow);
  const pool = cand.length ? cand : sl;
  let at = 12 * 60;
  if (a.at) { const t = new Date(a.at); if (!isNaN(t)) at = t.getHours() * 60 + t.getMinutes(); }
  return pool.slice().sort((x, y) => Math.abs(toMin(x.time) - at) - Math.abs(toMin(y.time) - at))[0];
}
// Un appel compte quand il a été terminé (« Terminer l'appel »). Les anciens appels comptent.
export const recDone = (a) => a.done !== false;
export const monthOf = (iso) => (iso || '').slice(0, 7);
export const curMonth = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
// Les heures vont à la personne qui a fait l'appel (prof ou admin qui remplace).
// Anciens appels sans auteur : au prof titulaire de la classe.
export const recBy = (a) => a.byId || (cls(a.classId) || {}).profId;
export function profHours(userId, month = curMonth()) {
  let min = 0, n = 0, missing = 0;
  const list = [];
  for (const a of db.attendance) {
    if (recBy(a) !== userId || monthOf(a.date) !== month || !recDone(a)) continue;
    n++;
    const m = slotMin(recSlot(a));
    if (!m) missing++;
    min += m;
    list.push({ a, min: m });
  }
  list.sort((x, y) => (x.a.date + (x.a.at || '')).localeCompare(y.a.date + (y.a.at || '')));
  return { min, n, missing, list };
}
// personnes à payer pour un mois : tous les profs + les admins qui ont fait des appels ce mois-là
export function staff(month = curMonth()) {
  const ov = (db.finance.overrides[month] || {});
  return db.users.filter((u) => u.role === 'prof' || profHours(u.id, month).n || ov[u.id] != null)
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'prof' ? -1 : 1));
}
export const fmtH = (min) => { const h = Math.floor(min / 60), m = min % 60; return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`; };
export const profRate = (p) => (p && p.rate != null && p.rate !== '' ? +p.rate : +db.finance.rate || 0);

// familles et cotisations
export const family = (id) => db.families.find((f) => f.id === id);
export const familyKids = (fid) => db.students.filter((s) => s.familyId === fid).sort((a, b) => a.prenoms.localeCompare(b.prenoms));
export function famPaid(f) {
  if (f.status === 'paid') return +f.cotisation || 0;
  if (f.status === 'partial') return Math.min(+f.paid || 0, +f.cotisation || 0);
  return 0;
}
export function cotisations() {
  let theo = 0, real = 0;
  for (const f of db.families) { theo += +f.cotisation || 0; real += famPaid(f); }
  return { theo, real, rest: theo - real };
}
// recettes « autres » : un don ponctuel compte une fois, un don mensuel compte chaque mois depuis sa date
export function monthsBetween(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); }
export function incomeTotal(month = null) {
  let t = 0;
  for (const i of db.finance.incomes) {
    const m0 = monthOf(i.date);
    if (month) { if (i.monthly ? m0 <= month : m0 === month) t += +i.amount || 0; }
    else t += (+i.amount || 0) * (i.monthly ? Math.max(0, monthsBetween(m0, curMonth()) + 1) : 1);
  }
  return t;
}
// catégories habituelles d'une association qui gère une mosquée
export const INCOME_CATS = [
  ['jumua', 'Quête du vendredi (jumu’a)'], ['dons', 'Dons'], ['ramadan', 'Dons Ramadan'], ['zakat-fitr', 'Zakat al-Fitr'], ['zakat-mal', 'Zakat al-Mal'],
  ['sadaqa', 'Sadaqa / aide sociale'], ['membres', 'Cotisations des membres'], ['location', 'Location de salle'], ['subvention', 'Subventions'],
  ['evenement', 'Événements (iftar, Aïd, conférences…)'], ['autre', 'Autres recettes'],
];
export const EXPENSE_CATS = [
  ['loyer', 'Loyer / remboursement de prêt'], ['electricite', 'Électricité'], ['chauffage', 'Gaz / chauffage'], ['eau', 'Eau'],
  ['assurance', 'Assurances'], ['entretien', 'Entretien et réparations'], ['nettoyage', 'Nettoyage et produits'], ['internet', 'Internet / téléphone'],
  ['imam', 'Imam / personnel'], ['fournitures', 'Fournitures (bureau, école)'], ['evenement', 'Événements (iftar, Aïd, conférences…)'],
  ['social', 'Aide sociale (zakat, sadaqa redistribuées)'], ['banque', 'Frais bancaires'], ['taxes', 'Taxes et impôts'], ['autre', 'Autres dépenses'],
];
export const catLabel = (list, k) => (list.find((c) => c[0] === k) || list[list.length - 1])[1];
// une ligne « mensuelle » compte chaque mois depuis sa date
const inMonth = (x, month) => (x.monthly ? monthOf(x.date) <= month : monthOf(x.date) === month);
export const incomesOf = (month) => db.finance.incomes.filter((i) => inMonth(i, month));
export const expensesOf = (month) => db.finance.expenses.filter((e) => inMonth(e, month));
export function byCat(items, list) {
  const t = {};
  for (const x of items) { const k = list.some((c) => c[0] === x.cat) ? x.cat : 'autre'; t[k] = (t[k] || 0) + (+x.amount || 0); }
  return list.filter((c) => t[c[0]]).map(([k, l]) => ({ k, l, total: t[k] }));
}
export function profCost(p, month) {
  const o = (db.finance.overrides[month] || {})[p.id];
  if (o != null && o !== '') return +o;
  return Math.round((profHours(p.id, month).min / 60) * profRate(p) * 100) / 100;
}
export function monthExpenses(month) {
  const profsT = staff(month).reduce((t, p) => t + profCost(p, month), 0);
  const other = expensesOf(month).reduce((t, e) => t + (+e.amount || 0), 0);
  return { profs: profsT, other, total: profsT + other };
}
// mois ayant des données (appels, dépenses) jusqu'au mois en cours
export function financeMonths() {
  const all = [...db.attendance.map((a) => monthOf(a.date)), ...db.finance.expenses.map((e) => monthOf(e.date)), ...db.finance.incomes.map((e) => monthOf(e.date)), curMonth()].filter(Boolean).sort();
  const out = []; let m = all[0];
  while (m <= curMonth()) { out.push(m); const [y, mm] = m.split('-').map(Number); m = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, '0')}`; }
  return out.reverse();
}
export function financeSummary() {
  const c = cotisations();
  const other = incomeTotal();
  const dep = financeMonths().reduce((t, m) => t + monthExpenses(m).total, 0);
  const rec = c.real + other;
  return { c, other, rec, dep, solde: rec - dep };
}
