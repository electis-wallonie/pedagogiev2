// Données de démonstration (créées au premier lancement ou via « Réinitialiser la démo »)
import { makeUser, setDb, D, uid, genCode, save, clearAudio, defaultObjectives } from './data.js';

const iso = (d) => d.toISOString().slice(0, 10);
function lastDays(dow, count) {
  const out = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== dow) d.setDate(d.getDate() - 1);
  for (let i = 0; i < count; i++) { out.push(iso(d)); d.setDate(d.getDate() - 7); }
  return out;
}
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const stamp = (n, h = 14) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 10, 0, 0); return d.toISOString(); };

// À augmenter à chaque nouvelle version des données de démo : les appareils qui ont une ancienne démo la rechargent tout seuls.
export const SEED_VERSION = 9;
export async function seed() {
  await clearAudio().catch(() => {});
  const admin = await makeUser('admin', 'admin', 'Administrateur', 'admin1234', false);
  const prof = await makeUser('prof', 'rahman', 'M. Rahman', 'prof1234', false);
  Object.assign(admin, { name: 'Méga administrateur', super: true, tel: '+32 470 00 00 01', email: 'mega.admin@exemple.be' });
  const direction = await makeUser('admin', 'direction', 'M. Directeur', 'admin1234', false);
  Object.assign(direction, { tel: '+32 470 00 00 03', email: 'direction@exemple.be' });
  const tresorier = await makeUser('compta', 'tresorier', 'Trésorier', 'compta1234', false);
  Object.assign(tresorier, { tel: '+32 470 00 00 04', email: 'tresorier@exemple.be' });
  Object.assign(prof, { tel: '+32 470 00 00 02', email: 'rahman@exemple.be' });
  setDb({ v: 1, demo: true, seedV: SEED_VERSION, users: [admin, direction, tresorier, prof], classes: [], students: [], attendance: [], objectives: [], notes: [], snotes: [], announcements: [] });
  const db = D();

  const C = [
    { id: uid(), profId: prof.id, name: 'Classe 1', color: 'mint', level: 1 },
    { id: uid(), profId: prof.id, name: 'Classe 2', color: 'blue', level: 1 },
    { id: uid(), profId: prof.id, name: 'Classe 3', color: 'pink', level: 2 },
  ];
  db.classes = C;

  db.objectives = defaultObjectives(prof.id);

  const mk = (classe, nom, prenoms, naissance, parent, done, level = 1, acquiredCount = 0) => {
    const st = { id: uid(), classId: classe.id, nom, prenoms, naissance: null, age: new Date().getFullYear() - +naissance.slice(0, 4), ageAt: daysAgo(0), parent, level, coran: {}, acquired: {}, createdAt: stamp(70) };
    // progression classique : Al-Fatiha, puis depuis An-Nas en remontant
    let w = 0;
    if (done > 0) { st.coran[1] = { s: 'v', start: daysAgo(80), end: daysAgo(75) }; w = 1; }
    for (let n = 114; w < done; n--, w++) { const e = Math.round(72 - (w / done) * 54); st.coran[n] = { s: 'v', start: daysAgo(e + 6), end: daysAgo(e) }; }
    const cur = 114 - (done - 1);
    if (done > 0 && cur > 1) st.coran[cur] = { s: 'c', start: daysAgo(14) };
    const objs = db.objectives.filter((o) => o.level === level).slice(0, acquiredCount);
    objs.forEach((o, i) => { st.acquired[o.id] = daysAgo(60 - i * 8); });
    st.tel = '+32 470 00 ' + String(10 + db.students.length).padStart(2, '0') + ' ' + String(20 + db.students.length).padStart(2, '0');
    st.email = (parent + '.' + nom).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z.]/g, '') + '@exemple.be';
    st.code = genCode(st, classe);
    db.students.push(st);
    return st;
  };
  const yas = mk(C[1], 'Benali', 'Yasmine Inès', '2016-05-03', 'Karim', 23, 1, 5);
  mk(C[1], 'Haddad', 'Adam', '2015-11-21', 'Nadia', 18, 1, 4);
  mk(C[1], 'Cherif', 'Inès', '2016-02-14', 'Samir', 30, 1, 6);
  mk(C[1], 'Ouali', 'Sami', '2016-09-09', 'Leïla', 12, 1, 2);
  const lina = mk(C[1], 'Mansouri', 'Lina', '2017-01-30', 'Hakim', 9, 1, 2);
  mk(C[1], 'Amrani', 'Youssef', '2015-06-18', 'Fatima', 21, 1, 5);
  mk(C[1], 'Diallo', 'Maryam', '2016-12-02', 'Aminata', 26, 1, 6);
  mk(C[1], 'Belkacem', 'Noah', '2016-04-11', 'Sofiane', 15, 1, 3);
  mk(C[0], 'Benali', 'Ilyes', '2018-03-22', 'Karim', 6, 1, 1);
  mk(C[0], 'Kaci', 'Rayan', '2018-07-05', 'Samia', 4, 1, 1);
  mk(C[0], 'Saidi', 'Hana', '2018-10-15', 'Mourad', 8, 1, 2);
  mk(C[2], 'Toumi', 'Bilal', '2013-01-08', 'Rachid', 40, 2, 3);
  mk(C[2], 'Ferhat', 'Salma', '2013-05-27', 'Nora', 37, 2, 2);
  mk(C[2], 'Brahimi', 'Zakaria', '2012-08-19', 'Ali', 45, 2, 4);

  // assiduité des 8 derniers cours
  const pattern = (k, i) => ((k * 7 + i * 3) % 13 === 0 ? 'A' : (k * 5 + i) % 17 === 0 ? 'E' : 'P');
  // Classe 1 : samedi 9h · Classe 2 : mercredi 17h30 et samedi 14h (2 cours par semaine) · Classe 3 : dimanche 10h
  const slots = [[[6, '09:00']], [[3, '17:30'], [6, '14:00']], [[0, '10:00']]];
  C.forEach((c, ci) => { c.slots = slots[ci].map(([day, time]) => ({ day, time })); });
  C.forEach((c, ci) => {
    const sessions = [];
    for (const [dow, time] of slots[ci]) for (const date of lastDays(dow, 6).slice(1)) sessions.push({ date, time });
    sessions.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    sessions.forEach(({ date, time }, i) => {
      const records = {};
      db.students.filter((s) => s.classId === c.id).forEach((s, k) => { records[s.id] = pattern(k, i); });
      db.attendance.push({ id: uid(), classId: c.id, date, at: date + 'T' + time + ':00', records });
    });
  });
  // quelques absences marquantes pour Yasmine et Lina
  const a2 = db.attendance.filter((a) => a.classId === C[1].id).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  if (a2[0]) { a2[0].records[yas.id] = 'A'; a2[0].records[lina.id] = 'A'; }
  if (a2[2]) { a2[2].records[yas.id] = 'E'; }
  if (a2[1]) { a2[1].records[lina.id] = 'A'; }

  // notes de sourate (le « cahier » de l'imam)
  const cur = 114 - 22;
  db.snotes.push(
    { id: uid(), studentId: yas.id, n: cur, at: stamp(14), text: 'On commence Al-Layl. À la maison : versets 1 à 5, 10 minutes par jour.', audioId: null },
    { id: uid(), studentId: yas.id, n: cur, at: stamp(7), text: 'Versets 1 à 10 bien maîtrisés. Réviser jusqu’au verset 14 pour samedi, attention à l’articulation.', audioId: null },
  );
  db.notes.push(
    { id: uid(), profId: prof.id, scope: 'class', classId: C[1].id, studentId: null, at: stamp(9, 15), text: 'Pas de cours le samedi des vacances. Reprise la semaine suivante.', audioId: null },
    { id: uid(), profId: prof.id, scope: 'student', classId: C[1].id, studentId: yas.id, at: stamp(2, 16), text: 'Très appliquée, participe beaucoup. Continuer 10 minutes de révision par jour.', audioId: null },
  );
  // locaux, fin des cours, familles et finances
  const L = ['Local 1', 'Local 2', 'Local 3', 'Salle de prière hommes', 'Salle de prière femmes'].map((name) => ({ id: uid(), name }));
  db.locaux = L;
  C[0].slots[0].end = '12:00'; C[0].slots[0].localId = L[0].id;
  C[1].slots[0].end = '19:00'; C[1].slots[0].localId = L[1].id;
  C[1].slots[1].end = '16:00'; C[1].slots[1].localId = L[1].id;
  C[2].slots[0].end = '12:30'; C[2].slots[0].localId = L[3].id;
  db.families = [];
  const fams = {};
  for (const s of db.students) {
    const k = s.nom + '|' + s.parent;
    if (!fams[k]) { fams[k] = { id: uid(), name: 'Famille ' + s.nom, cotisation: 0, status: 'unpaid', paid: 0 }; db.families.push(fams[k]); }
    s.familyId = fams[k].id;
  }
  db.families.forEach((f, i) => {
    const n = db.students.filter((s) => s.familyId === f.id).length;
    f.cotisation = n > 1 ? 250 : 150;
    f.status = i % 4 === 1 ? 'unpaid' : i % 4 === 2 ? 'partial' : 'paid';
    if (f.status === 'partial') f.paid = 75;
  });
  const m1 = daysAgo(new Date().getDate() + 25);
  db.finance = { rate: 10, overrides: {}, incomes: [
    { id: uid(), cat: 'jumua', label: 'Quête du vendredi', amount: 420, date: daysAgo(13), monthly: false },
    { id: uid(), cat: 'jumua', label: 'Quête du vendredi', amount: 385, date: daysAgo(6), monthly: false },
    { id: uid(), cat: 'jumua', label: 'Quête du vendredi', amount: 410, date: m1, monthly: false },
    { id: uid(), cat: 'dons', label: 'Don anonyme', amount: 500, date: daysAgo(20), monthly: false },
    { id: uid(), cat: 'membres', label: 'Cotisations mensuelles des membres', amount: 300, date: m1, monthly: true },
  ], expenses: [
    { id: uid(), cat: 'loyer', label: 'Loyer du bâtiment', amount: 950, date: m1, monthly: true },
    { id: uid(), cat: 'electricite', label: 'Électricité', amount: 180, date: m1, monthly: true },
    { id: uid(), cat: 'chauffage', label: 'Gaz', amount: 140, date: m1, monthly: true },
    { id: uid(), cat: 'assurance', label: 'Assurance incendie', amount: 45, date: m1, monthly: true },
    { id: uid(), cat: 'nettoyage', label: 'Produits d’entretien', amount: 62, date: daysAgo(4) },
    { id: uid(), cat: 'fournitures', label: 'Cahiers et stylos (école)', amount: 85, date: daysAgo(3) },
  ] };

  db.mosque = { name: '' };
  db.contacts = [
    { id: uid(), label: 'La direction', email: 'direction@exemple.be' },
    { id: uid(), label: 'L’imam', email: 'imam@exemple.be' },
    { id: uid(), label: 'Le trésorier', email: 'tresorier@exemple.be' },
    { id: uid(), label: 'Le directeur de l’école', email: 'ecole@exemple.be' },
  ];
  { const t = new Date(), y = t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1, Y0 = `${y}–${y + 1}`, Y1 = `${y + 1}–${y + 2}`;
    db.demandes = [
      { id: uid(), at: stamp(1, 18), status: 'new', cours: 'Enfants', annee: Y0, prenoms: 'Inès', nom: 'Haddad', age: 8, parent: 'Samira Haddad', tel: '06 12 34 56 78', email: 'samira.haddad@gmail.com', message: 'Inès lit déjà un peu l’arabe.' },
      { id: uid(), at: stamp(3, 20), status: 'new', cours: 'Adultes', annee: Y0, prenoms: 'Youssef', nom: 'Benali', age: 34, parent: 'Youssef Benali', tel: '07 98 76 54 32', email: 'y.benali@outlook.fr', message: '' },
      { id: uid(), at: stamp(6, 11), status: 'new', cours: 'Enfants', annee: Y1, prenoms: 'Adam', nom: 'Karimi', age: 5, parent: 'Nadia Karimi', tel: '06 55 44 33 22', email: 'nadia.karimi@gmail.com', message: 'Pour la rentrée prochaine, il aura 6 ans.' },
    ]; }
  db.faq = [
    { id: uid(), at: stamp(10), freq: true, theme: 'Prière', q: 'Peut-on rattraper une prière manquée ?', r: 'Oui. La prière manquée (qada) se rattrape dès qu’on s’en souvient, dans l’ordre, de préférence avant la prière suivante. Pour toute situation particulière, venez en parler à l’imam après une prière.' },
    { id: uid(), at: stamp(40), freq: true, theme: 'Jeûne / Ramadan', q: 'Peut-on jeûner en voyage ?', r: 'Le voyageur peut rompre le jeûne et rattraper les jours plus tard. S’il jeûne malgré tout, son jeûne est valable.' },
    { id: uid(), at: stamp(30), freq: true, theme: 'Famille / mariage', q: 'Mon enfant de 7 ans doit-il déjà prier ?', r: 'On l’y encourage dès 7 ans, avec douceur, pour qu’il en prenne l’habitude. L’obligation vient à la puberté.' },
    { id: uid(), at: stamp(2), theme: 'Famille / mariage', q: 'Peut-on célébrer le mariage religieux à la mosquée ?', r: 'Oui, sur rendez-vous avec l’imam, quelques semaines avant la date.' },
    { id: uid(), at: stamp(5), freq: true, theme: 'Zakat / aumône', q: 'À qui remettre la zakat al-Fitr ?', r: 'La mosquée collecte la zakat al-Fitr pendant les derniers jours du Ramadan et la redistribue aux familles dans le besoin avant la prière de l’Aïd. Le montant est annoncé chaque année.' },
  ];
  db.announcements.push({ id: uid(), text: 'Bienvenue sur la nouvelle application de suivi ! Vous y retrouverez l’avancement de votre enfant, ses présences et les notes de l’imam.', audioId: null, from: daysAgo(1), to: daysAgo(-14), at: stamp(1, 9), authorId: admin.id });
  save();
}
