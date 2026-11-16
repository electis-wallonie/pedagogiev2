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
  if (db && db.users) { db.announcements = db.announcements || []; }
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
export function attendanceOfClass(classId) { return db.attendance.filter((a) => a.classId === classId).sort((a, b) => b.date.localeCompare(a.date)); }
export function attendanceOfStudent(st) {
  return db.attendance.filter((a) => a.classId === st.classId && a.records[st.id]).sort((a, b) => b.date.localeCompare(a.date)).map((a) => ({ date: a.date, s: a.records[st.id] }));
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
