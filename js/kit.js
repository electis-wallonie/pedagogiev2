// Fichier de la mosquée (Excel) : un seul fichier pour l'installation ET pour chaque rentrée scolaire.
// - Installation : on remplit le modèle (toutes les infos de A à Z) et on l'importe.
// - Rentrée : avant de réinitialiser, l'app génère ce même fichier à partir des données de l'année
//   (équipe, classes, horaires, élèves réinscrits avec leurs sourates acquises, demandes en attente…).
//   On le relit / complète, puis on le réimporte après la réinitialisation.
import * as d from './data.js';
import { ACT, CHANGE, esc, ic, toast, todayISO, DAYS, ask } from './ui.js';
import { xlsxBook, readXlsxSheets, readCsv } from './import.js';
import { config } from './mosquee.js';

// ---------- structure du fichier ----------
const MOSQ = [
  // [clé, libellé, obligatoire, explication]
  ['nom', 'Nom de la mosquée', true, 'Tel qu’il doit apparaître sur le site.'],
  ['adresse', 'Adresse (rue et numéro)', true, ''],
  ['cp', 'Code postal', true, ''],
  ['ville', 'Ville', true, ''],
  ['pays', 'Pays', true, 'Belgique, France…'],
  ['tel', 'Téléphone de la mosquée', true, 'Avec l’indicatif : +32…'],
  ['email', 'E-mail de la direction', true, 'Reçoit les messages de la page Contact.'],
  ['imamEmail', 'E-mail qui reçoit les questions à l’imam', true, ''],
  ['mawaqit', 'Lien de la page Mawaqit', true, 'ex. https://mawaqit.net/fr/ma-mosquee — les horaires de prière se mettent à jour tout seuls.'],
  ['annee', 'Année scolaire', true, 'ex. 2026-2027'],
  ['fee', 'Cotisation annuelle par défaut, par famille (€)', true, 'Montant proposé pour chaque nouvelle famille.'],
  ['rate', 'Taux horaire par défaut des enseignants (€)', true, '0 si les enseignants sont bénévoles.'],
  ['opening', 'Solde de départ de la caisse (€)', false, 'Argent disponible au début de l’année (report). À la rentrée, l’app le remplit avec le solde de fin d’année.'],
  ['site', 'Adresse du site souhaitée', false, 'ex. al-mohsinine.be — rempli avec nous.'],
  ['style', 'Style du site public', false, 'Choisi avec nous parmi les styles proposés.'],
  ['couleur', 'Couleur principale', false, 'ex. #1F4FFF'],
];
const SH = [
  { k: 'equipe', n: 'Équipe', note: 'Une ligne par membre : direction, imam, professeurs, trésorier… Il faut au moins un « Méga administrateur ». Les mots de passe temporaires sont créés à l’import (à changer à la 1re connexion).',
    cols: [['role', 'Rôle', true, 'Méga administrateur · Administrateur · Comptabilité · Professeur'], ['name', 'Nom affiché', true, 'ex. Imam Youssef, M. Rahman'], ['fonction', 'Fonction', false, 'ex. Imam, Directeur de l’école, Trésorier, Secrétaire'], ['login', 'Identifiant de connexion', true, 'Lettres, chiffres, point ou tiret (3 caractères min.)'], ['tel', 'Téléphone', true, '+32 470 12 34 56'], ['email', 'E-mail', true, ''], ['rate', 'Taux horaire (€)', false, 'Vide = taux par défaut'], ['pw', 'Mot de passe (protégé — ne pas modifier)', false, 'Rempli automatiquement à la rentrée pour garder les mots de passe. Laisser vide pour un nouveau membre.']] },
  { k: 'locaux', n: 'Locaux', note: 'Toutes les salles utilisables : salles de classe, salles de prière, bureau…',
    cols: [['name', 'Nom du local', true, 'ex. Local 1, Salle de prière femmes'], ['note', 'Remarque', false, 'ex. 20 places, 1er étage']] },
  { k: 'classes', n: 'Classes', note: 'Une ligne par classe. Le professeur est indiqué par son identifiant (feuille Équipe).',
    cols: [['name', 'Nom de la classe', true, 'ex. Classe 1, Coran adultes'], ['prof', 'Professeur (identifiant)', true, 'ex. rahman'], ['level', 'Niveau', false, '1, 2, 3… (objectifs Langue & Religion)'], ['public', 'Public', false, 'Enfants, Adultes, Sœurs…'], ['cap', 'Nombre de places', false, 'Vide = 20']] },
  { k: 'horaires', n: 'Horaires', note: 'Une ligne par cours de la semaine. Une classe peut avoir plusieurs cours.',
    cols: [['classe', 'Classe', true, 'Nom exact (feuille Classes)'], ['day', 'Jour', true, 'lundi … dimanche'], ['time', 'Début', true, '09:00'], ['end', 'Fin', true, '12:00'], ['local', 'Local', true, 'Nom exact (feuille Locaux)']] },
  { k: 'familles', n: 'Familles', note: 'Les frères et sœurs d’une même famille partagent une cotisation.',
    cols: [['name', 'Nom de la famille', true, 'ex. Famille Benali'], ['fee', 'Cotisation annuelle (€)', false, 'Vide = cotisation par défaut']] },
  { k: 'eleves', n: 'Élèves', note: 'Une ligne par élève inscrit cette année. Téléphone ET e-mail du parent obligatoires (devoirs envoyés aux parents). À la rentrée : mettez « non » dans « Réinscrit » pour un élève qui ne revient pas.',
    cols: [['classe', 'Classe', true, 'Nom exact (feuille Classes)'], ['nom', 'Nom', true, ''], ['prenoms', 'Prénom(s)', true, 'Tous les prénoms'], ['age', 'Date de naissance', true, '2016-05-03 (l’âge est calculé tout seul)', ['Date de naissance ou âge', 'Âge']], ['parent', 'Prénom du parent', true, ''], ['tel', 'Téléphone du parent', true, '+32 470 12 34 56'], ['email', 'E-mail du parent', true, ''], ['famille', 'Famille', false, 'Nom exact (feuille Familles)'], ['coran', 'Sourates acquises', false, 'Numéros : 1, 93-114'], ['cours', 'Sourate en cours', false, 'Numéro, ex. 92'], ['level', 'Niveau', false, '1, 2…'], ['code', 'Code de suivi', false, 'Gardé d’une année à l’autre. Vide = créé automatiquement.'], ['rue', 'Rue et numéro', false, ''], ['cp', 'Code postal', false, ''], ['ville', 'Ville', false, ''], ['renew', 'Réinscrit', false, 'oui / non (vide = oui). « non » : l’élève passe dans « Anciens élèves » avec toute sa progression.']] },
  { k: 'archive', n: 'Anciens élèves', note: 'Élèves non réinscrits, avec leur progression. S’ils reviennent, leur code de suivi permet de retrouver leurs sourates et leur niveau.',
    cols: [['nom', 'Nom', true, ''], ['prenoms', 'Prénom(s)', true, ''], ['age', 'Date de naissance', false, '', ['Date de naissance ou âge', 'Âge']], ['parent', 'Prénom du parent', false, ''], ['tel', 'Téléphone du parent', false, ''], ['email', 'E-mail du parent', false, ''], ['classe', 'Dernière classe', false, ''], ['annee', 'Dernière année', false, ''], ['coran', 'Sourates acquises', false, ''], ['cours', 'Sourate en cours', false, ''], ['level', 'Niveau', false, ''], ['code', 'Code de suivi', true, '']] },
  { k: 'demandes', n: 'Demandes', note: 'Inscriptions reçues et pas encore traitées (elles arriveront dans Direction → Demandes). Une ligne par élève (enfant ou adulte) : les élèves d’un même parent ou responsable (même téléphone) forment une seule demande.',
    cols: [['prenoms', 'Prénom(s)', true, ''], ['nom', 'Nom', true, ''], ['naissance', 'Date de naissance', true, '2016-05-03', ['Âge']], ['classe', 'Classe souhaitée', false, 'Nom exact (feuille Classes)'], ['code', 'Code de suivi (réinscription)', false, ''], ['parent', 'Parent', true, ''], ['tel', 'Téléphone', true, ''], ['email', 'E-mail', true, ''], ['rue', 'Rue et numéro', false, ''], ['cp', 'Code postal', false, ''], ['ville', 'Ville', false, ''], ['annee', 'Année', false, '2026–2027'], ['message', 'Message', false, '']] },
  { k: 'contact', n: 'Contact', note: 'Les destinataires de la page Contact du site (les adresses ne sont jamais affichées au public).',
    cols: [['label', 'Destinataire', true, 'ex. La direction, L’imam, Le trésorier'], ['email', 'E-mail', true, '']] },
  { k: 'faq', n: 'Questions imam', note: 'Réponses de l’imam déjà publiées sur le site (sans le nom de la personne).',
    cols: [['theme', 'Thème', true, 'Prière, Jeûne, Zakat, Famille…'], ['q', 'Question', true, ''], ['r', 'Réponse', true, ''], ['freq', 'Fréquente', false, 'oui / non']] },
  { k: 'cours', n: 'Cours publics', note: 'Ce qui s’affiche dans l’onglet « Cours » du site public.',
    cols: [['public', 'Public', true, 'Enfants, Adultes, Sœurs…'], ['detail', 'Détail', false, 'ex. 6–14 ans · Coran, arabe'], ['horaires', 'Horaires', false, 'ex. Mer. 14h–17h']] },
  { k: 'objectifs', n: 'Objectifs', note: 'Objectifs Langue & Religion par niveau. Laisser vide : les objectifs habituels sont proposés à chaque professeur.',
    cols: [['prof', 'Professeur (identifiant)', true, ''], ['level', 'Niveau', true, '1, 2…'], ['group', 'Catégorie', true, 'Langue arabe, Religion…'], ['text', 'Objectif', true, '']] },
  { k: 'cats', n: 'Catégories', note: 'Catégories de recettes et de dépenses de la compta. Vide : la liste habituelle. « Autres recettes » et « Autres dépenses » sont toujours ajoutées.',
    cols: [['type', 'Type', true, 'Recette ou Dépense'], ['label', 'Catégorie', true, 'ex. Quête du vendredi, Loyer']] },
  { k: 'charges', n: 'Charges mensuelles', note: 'Recettes et dépenses qui reviennent chaque mois (loyer, électricité, dons réguliers…).',
    cols: [['type', 'Type', true, 'Recette ou Dépense'], ['cat', 'Catégorie', true, 'ex. Loyer, Électricité, Dons'], ['label', 'Intitulé', false, ''], ['amount', 'Montant par mois (€)', true, '']] },
];
const ROLES = [['super', 'Méga administrateur'], ['admin', 'Administrateur'], ['compta', 'Comptabilité'], ['prof', 'Professeur']];
const roleKey = (u) => (u.role === 'admin' && u.super ? 'super' : u.role);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const DAYN = DAYS.map((x) => norm(x));

// ---------- écriture ----------
function readme() {
  const r = [['Fichier de la mosquée'], ['Un seul fichier pour installer l’application ET pour chaque rentrée scolaire.'], [''],
    ['Comment faire'],
    ['1. Remplissez chaque feuille (onglets en bas). Les colonnes marquées * sont obligatoires.'],
    ['2. Ne changez pas le nom des feuilles ni les titres des colonnes. Une ligne = un élément.'],
    ['3. Dans l’application : Installation → Importer le fichier. L’application vérifie tout avant d’installer.'],
    ['4. À la rentrée : Direction → Nouvelle année scolaire → télécharger ce fichier déjà rempli, le relire, réinitialiser, puis le réimporter.'], [''],
    ['Ce qui est gardé d’une année à l’autre'],
    ['Mosquée, équipe (avec leurs mots de passe), locaux, classes, horaires, familles, élèves réinscrits avec leurs sourates acquises et leur code de suivi, demandes en attente, contacts, réponses de l’imam, objectifs, charges mensuelles, solde de la caisse.'],
    ['Ce qui repart à zéro'],
    ['Appels et absences, notes et messages vocaux, objectifs cochés, paiements des cotisations, opérations de compta de l’année (téléchargez la compta de l’année avant de réinitialiser).'], [''],
    ['Les feuilles'], ['Mosquée — identité, contacts, Mawaqit, année scolaire, montants par défaut']];
  for (const s of SH) r.push([`${s.n} — ${s.note}`]);
  return r;
}
const head = (cols) => cols.map(([, l, req]) => l + (req ? ' *' : ''));
const help = (cols) => cols.map(([, , , h]) => h || '');
function book(data) {
  const mo = [['Une ligne par information. Remplissez la colonne « Valeur ».'], ['Information', 'Valeur', 'Obligatoire', 'À savoir'], ...MOSQ.map(([k, l, req, h]) => [l, data ? data.mosque[k] ?? '' : '', req ? 'oui' : '', h])];
  const sheets = [['À lire', readme(), { head: -1, maxW: 120 }], ['Mosquée', mo, { head: 1, note: true }]];
  for (const s of SH) sheets.push([s.n, [[s.note], head(s.cols), ...(data ? data[s.k] : [help(s.cols).map((h) => (h ? 'ex. / ' + h : ''))]).map((r) => (Array.isArray(r) ? r : s.cols.map(([k]) => r[k] ?? '')))], { head: 1, note: true }]);
  return xlsxBook(sheets);
}
const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); };
// liste de sourates compacte : [1,93,94,…,114] → « 1, 93-114 »
function ranges(ns) {
  ns = [...new Set(ns)].sort((a, b) => a - b); const out = [];
  for (let i = 0; i < ns.length; i++) { let j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++; out.push(i === j ? String(ns[i]) : `${ns[i]}-${ns[j]}`); i = j; }
  return out.join(', ');
}
function parseRanges(v) {
  const out = [];
  for (const p of String(v ?? '').split(/[;,\s]+/).filter(Boolean)) { const m = p.match(/^(\d+)(?:-(\d+))?$/); if (!m) continue; const a = +m[1], b = +(m[2] || m[1]); for (let n = Math.min(a, b); n <= Math.max(a, b); n++) if (n >= 1 && n <= 114) out.push(n); }
  return out;
}
function nextYear() { const y = new Date().getFullYear(), m = new Date().getMonth(); const a = m >= 6 ? y + 1 : y; return `${a}-${a + 1}`; }
// données de l'année → contenu du fichier pour la rentrée
export function exportData(db = d.D()) {
  const m = db.mosque || {}, f = db.finance || {}, cfg = config();
  const login = (id) => (db.users.find((u) => u.id === id) || {}).login || '';
  const lname = (id) => ((db.locaux || []).find((l) => l.id === id) || {}).name || '';
  const fname = (id) => ((db.families || []).find((x) => x.id === id) || {}).name || '';
  const cname = (id) => (db.classes.find((c) => c.id === id) || {}).name || '';
  const solde = db === d.D() ? d.financeSummary().solde : 0;
  return {
    mosque: { nom: m.name || cfg.nom || '', adresse: m.adresse || '', cp: m.cp || '', ville: m.ville || '', pays: m.pays || '', tel: m.tel || '', email: m.email || ((db.contacts || [])[0] || {}).email || '', imamEmail: m.imamEmail || '', mawaqit: m.mawaqit || cfg.mawaqit || '', annee: db.year ? nextOf(db.year) : nextYear(), fee: f.defaultFee ?? '', rate: f.rate ?? '', opening: Math.round(solde * 100) / 100, site: m.site || cfg.domaineEquipe || '', style: m.style || cfg.style || '', couleur: m.couleur || cfg.couleurTheme || '' },
    equipe: db.users.map((u) => ({ role: ROLES.find(([k]) => k === roleKey(u))[1], name: u.name, fonction: u.fonction || '', login: u.login, tel: u.tel || '', email: u.email || '', rate: u.rate ?? '', pw: `${u.salt}:${u.hash}` })),
    locaux: (db.locaux || []).map((l) => ({ name: l.name, note: l.note || '' })),
    classes: db.classes.map((c) => ({ name: c.name, prof: login(c.profId), level: c.level || 1, public: c.public || '', cap: +c.capacity > 0 ? +c.capacity : '' })),
    horaires: db.classes.flatMap((c) => d.slotsOf(c).map((s) => ({ classe: c.name, day: DAYS[s.day], time: s.time, end: s.end || '', local: lname(s.localId) }))),
    familles: (db.families || []).filter((x) => db.students.some((s) => s.familyId === x.id)).map((x) => ({ name: x.name, fee: x.cotisation ?? '' })),
    eleves: db.students.slice().sort((a, b) => cname(a.classId).localeCompare(cname(b.classId)) || a.nom.localeCompare(b.nom)).map((s) => { const co = s.coran || {}; return { classe: cname(s.classId), nom: s.nom, prenoms: s.prenoms, age: s.naissance || d.ageOf(s) || '', parent: s.parent, tel: s.tel || '', email: s.email || '', famille: fname(s.familyId), coran: ranges(Object.keys(co).filter((n) => co[n].s === 'v').map(Number)), cours: Object.keys(co).filter((n) => co[n].s === 'c').join(', '), level: s.level || 1, code: s.code || '', rue: s.rue || '', cp: s.cp || '', ville: s.ville || '', renew: s.renew === 'non' ? 'non' : 'oui' }; }),
    archive: (db.archive || []).map((a) => ({ nom: a.nom, prenoms: a.prenoms, age: a.naissance || a.age || '', parent: a.parent || '', tel: a.tel || '', email: a.email || '', classe: a.classe || '', annee: a.annee || '', coran: ranges(Object.keys(a.coran || {}).filter((n) => a.coran[n].s === 'v').map(Number)), cours: Object.keys(a.coran || {}).filter((n) => a.coran[n].s === 'c').join(', '), level: a.level || 1, code: a.code || '' })),
    demandes: (db.demandes || []).filter((x) => x.status === 'new' || x.status === 'later').flatMap((x) => (x.kids && x.kids.length ? x.kids : [{ prenoms: x.prenoms, nom: x.nom, naissance: x.naissance, age: x.age, classId: x.classId, code: x.code }]).map((k) => ({ prenoms: k.prenoms, nom: k.nom, naissance: k.naissance || k.age || '', classe: cname(k.classId), code: k.code || '', parent: x.parent, tel: x.tel, email: x.email, rue: x.rue || '', cp: x.cp || '', ville: x.ville || '', annee: x.annee || '', message: x.message || '' }))),
    contact: (db.contacts || []).map((c) => ({ label: c.label, email: c.email })),
    faq: (db.faq || []).map((x) => ({ theme: x.theme, q: x.q, r: x.r, freq: x.freq ? 'oui' : '' })),
    cours: (m.cours || cfg.cours || []).map((c) => ({ public: c.public, detail: c.detail || '', horaires: c.horaires || '' })),
    objectifs: db.objectives.map((o) => ({ prof: login(o.profId), level: o.level, group: o.group, text: o.text })),
    cats: [...d.INCOME_CATS.filter(([k]) => k !== d.OTHER_CAT).map(([, l]) => ({ type: 'Recette', label: l })), ...d.EXPENSE_CATS.filter(([k]) => k !== d.OTHER_CAT).map(([, l]) => ({ type: 'Dépense', label: l }))],
    charges: [...(f.incomes || []).filter((x) => x.monthly).map((x) => ({ type: 'Recette', cat: d.catLabel(d.INCOME_CATS, x.cat), label: x.label || '', amount: +x.amount || 0 })), ...(f.expenses || []).filter((x) => x.monthly).map((x) => ({ type: 'Dépense', cat: d.catLabel(d.EXPENSE_CATS, x.cat), label: x.label || '', amount: +x.amount || 0 }))],
  };
}
const nextOf = (y) => { const m = String(y).match(/(\d{4})\D+(\d{4})/); return m ? `${+m[1] + 1}-${+m[2] + 1}` : nextYear(); };
export const downloadTemplate = () => dl(book(null), 'fichier-mosquee-vide.xlsx');
export function downloadLeaving() {
  const data = exportData();
  const cols = SH.find((x) => x.k === 'eleves').cols.filter(([k]) => k !== 'renew');
  const rows = data.eleves.filter((e) => e.renew === 'non');
  dl(xlsxBook([['Élèves non réinscrits', [[`Élèves non réinscrits pour ${data.mosque.annee}, avec toute leur progression (sourates, niveau, code de suivi). S’ils reviennent, entrez leur code de suivi dans la demande d’inscription.`], head(cols), ...rows.map((r) => cols.map(([k]) => r[k] ?? ''))], { head: 1, note: true }]]), `eleves-non-reinscrits-${data.mosque.annee}.xlsx`);
}
export const downloadRentree = () => dl(book(exportData()), `fichier-mosquee-rentree-${exportData().mosque.annee}.xlsx`);
// exemple rempli (pour tester) : généré à partir des données d'exemple, puis effacé
export async function exampleData() {
  const { seed } = await import('./seed.js');
  await seed();
  d.load();
  const data = exportData(d.D());
  Object.assign(data.mosque, { nom: 'Mosquée Al-Mohsinine', adresse: 'Rue de l’Exemple 12', cp: '4000', ville: 'Liège', pays: 'Belgique', tel: '+32 4 000 00 00', email: 'direction@exemple.be', imamEmail: 'imam@exemple.be', annee: nextYear().replace(/^(\d+)-(\d+)$/, (x, a, b) => `${a - 1}-${b - 1}`), fee: 150, rate: 10, opening: 0 });
  setEmpty();
  return data;
}
export async function downloadExample() { dl(book(await exampleData()), 'fichier-mosquee-exemple.xlsx'); }

// ---------- base vide (aucune donnée de démonstration) ----------
export function emptyDb() {
  return { v: 1, archive: [], regLocks: {}, users: [], classes: [], students: [], attendance: [], objectives: [], notes: [], snotes: [], announcements: [], locaux: [], families: [], demandes: [], contacts: [], faq: [], mosque: { name: '' }, finance: { rate: 10, incomes: [], expenses: [], overrides: {} } };
}
export function setEmpty() { d.setDb(emptyDb()); d.load(); }

// ---------- lecture et vérification ----------
const isMosq = (n) => norm(n) === 'mosquee';
function table(rows, cols) {
  // ligne de titres : la première dont la 1re cellule correspond au 1er titre attendu
  const h0 = norm(cols[0][1]);
  const hi = rows.findIndex((r) => r && norm(String(r[0] ?? '').replace('*', '')) === h0);
  if (hi < 0) return null;
  const hdr = rows[hi].map((x) => norm(String(x ?? '').replace('*', '')));
  const idx = cols.map(([, l, , , al]) => { let i = hdr.indexOf(norm(l)); for (const a of al || []) if (i < 0) i = hdr.indexOf(norm(a)); return i; });
  return rows.slice(hi + 1).map((r, i) => ({ line: hi + i + 2, v: Object.fromEntries(cols.map(([k], j) => [k, idx[j] >= 0 ? String(r[idx[j]] ?? '').trim() : ''])) }))
    .filter((x) => Object.values(x.v).some((v) => v !== '') && !/^ex\. \//.test(Object.values(x.v).find((v) => v) || ''));
}
const xlDate = (v) => { const n = +v; if (!isNaN(n) && n > 20000 && n < 80000) { const t = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return t.toISOString().slice(0, 10); } const m = String(v).match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
const okMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
const okTel = (t) => String(t).replace(/[^\d]/g, '').length >= 8;
const hhmm = (v) => { if (v === '' || v == null) return ''; const n = +v; if (!isNaN(n) && n > 0 && n < 1) { const m = Math.round(n * 1440); return d.fromMin(m); } const m = String(v).match(/^(\d{1,2})\s*[:hH.]\s*(\d{2})?$/); return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : null; };
const num = (v) => { const x = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(x) ? null : x; };
const yes = (v) => /^(oui|yes|o|y|x|1|vrai|true)$/i.test(String(v).trim());

// version CSV (un seul fichier) : chaque feuille commence par une ligne « [Nom de la feuille] »
function csvSheets(text) {
  const out = []; let cur = null;
  for (const r of readCsv(text)) {
    const m = String(r[0] ?? '').trim().match(/^\[(.+)\]$/);
    if (m && r.slice(1).every((x) => !String(x ?? '').trim())) { cur = { name: m[1].trim(), rows: [] }; out.push(cur); continue; }
    if (cur) cur.rows.push(r);
  }
  return out;
}
export async function parseFile(file) {
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name) || /^\uFEFF?\s*\[/.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(16, buf.byteLength))));
  const sheets = isCsv ? csvSheets(new TextDecoder().decode(buf)) : await readXlsxSheets(buf);
  const by = (n) => (sheets.find((s) => norm(s.name) === norm(n)) || {}).rows;
  const err = [], warn = [];
  const E = (sh, line, msg) => err.push(`${sh}${line ? ` · ligne ${line}` : ''} : ${msg}`);
  // Mosquée
  const mrows = by('Mosquée');
  const mosque = {};
  if (!mrows) E('Mosquée', 0, 'feuille introuvable');
  else for (const [k, l, req] of MOSQ) { const r = mrows.find((x) => x && norm(x[0]) === norm(l)); const v = r ? String(r[1] ?? '').trim() : ''; mosque[k] = v; if (req && !v) E('Mosquée', 0, `« ${l} » est vide`); }
  if (mosque.email && !okMail(mosque.email)) E('Mosquée', 0, 'e-mail de la direction invalide');
  const T = {};
  for (const s of SH) {
    const rows = by(s.n);
    T[s.k] = rows ? table(rows, s.cols) : null;
    if (!T[s.k]) { if (['equipe', 'classes', 'eleves', 'locaux', 'horaires'].includes(s.k)) E(s.n, 0, 'feuille ou titres de colonnes introuvables'); T[s.k] = []; continue; }
    for (const x of T[s.k]) for (const [k, l, req] of s.cols) if (req && !x.v[k] && !(s.k === 'eleves' && /^non$/i.test(x.v.renew))) E(s.n, x.line, `« ${l} » manquant`);
  }
  // cohérence
  const logins = new Set();
  for (const x of T.equipe) {
    const lg = x.v.login.toLowerCase();
    if (lg && !/^[a-z0-9._-]{3,30}$/.test(lg)) E('Équipe', x.line, `identifiant « ${x.v.login} » invalide`);
    if (logins.has(lg)) E('Équipe', x.line, `identifiant « ${x.v.login} » en double`); logins.add(lg);
    if (x.v.role && !ROLES.some(([, l]) => norm(l) === norm(x.v.role))) E('Équipe', x.line, `rôle « ${x.v.role} » inconnu`);
    if (x.v.tel && !okTel(x.v.tel)) E('Équipe', x.line, 'téléphone invalide');
    if (x.v.email && !okMail(x.v.email)) E('Équipe', x.line, 'e-mail invalide');
  }
  if (!T.equipe.some((x) => /^(megaadministrateur|administrateur)$/.test(norm(x.v.role)))) E('Équipe', 0, 'il faut au moins un administrateur');
  const loc = new Set(T.locaux.map((x) => norm(x.v.name)));
  const cl = new Set();
  for (const x of T.classes) { if (cl.has(norm(x.v.name))) E('Classes', x.line, `« ${x.v.name} » en double`); cl.add(norm(x.v.name)); if (x.v.prof && !logins.has(x.v.prof.toLowerCase())) E('Classes', x.line, `professeur « ${x.v.prof} » absent de la feuille Équipe`); }
  for (const x of T.horaires) {
    if (x.v.classe && !cl.has(norm(x.v.classe))) E('Horaires', x.line, `classe « ${x.v.classe} » inconnue`);
    if (x.v.local && !loc.has(norm(x.v.local))) E('Horaires', x.line, `local « ${x.v.local} » absent de la feuille Locaux`);
    if (x.v.day && !DAYN.includes(norm(x.v.day))) E('Horaires', x.line, `jour « ${x.v.day} » non reconnu`);
    if (x.v.time && !hhmm(x.v.time)) E('Horaires', x.line, 'heure de début illisible (ex. 09:00)');
    if (x.v.end && !hhmm(x.v.end)) E('Horaires', x.line, 'heure de fin illisible (ex. 12:00)');
  }
  const fam = new Set(T.familles.map((x) => norm(x.v.name)));
  const eleves = T.eleves.filter((x) => !/^non$/i.test(x.v.renew));
  const leaving = T.eleves.filter((x) => /^non$/i.test(x.v.renew));
  for (const x of eleves) {
    if (x.v.classe && !cl.has(norm(x.v.classe))) E('Élèves', x.line, `classe « ${x.v.classe} » inconnue`);
    if (x.v.tel && !okTel(x.v.tel)) E('Élèves', x.line, 'téléphone du parent invalide');
    if (x.v.email && !okMail(x.v.email)) E('Élèves', x.line, 'e-mail du parent invalide');
    if (x.v.age && !xlDate(x.v.age)) E('Élèves', x.line, num(x.v.age) > 1 && num(x.v.age) < 100 ? `un âge (${x.v.age}) au lieu de la date de naissance : indiquez la date (ex. 2016-05-03)` : 'date de naissance illisible (ex. 2016-05-03)');
    if (x.v.famille && !fam.has(norm(x.v.famille))) warn.push(`Élèves · ligne ${x.line} : famille « ${x.v.famille} » ajoutée automatiquement`);
  }
  for (const x of T.objectifs) if (x.v.prof && !logins.has(x.v.prof.toLowerCase())) E('Objectifs', x.line, `professeur « ${x.v.prof} » inconnu`);
  for (const x of T.cats || []) if (!/^(recette|depense)$/.test(norm(x.v.type))) E('Catégories', x.line, 'type : « Recette » ou « Dépense »');
  for (const x of T.charges) { if (!/^(recette|depense)$/.test(norm(x.v.type))) E('Charges mensuelles', x.line, 'type : « Recette » ou « Dépense »'); if (x.v.amount && num(x.v.amount) == null) E('Charges mensuelles', x.line, 'montant illisible'); }
  for (const x of T.demandes) { if (x.v.classe && !cl.has(norm(x.v.classe))) warn.push(`Demandes · ligne ${x.line} : classe « ${x.v.classe} » inconnue (à choisir à l’acceptation)`); if (x.v.naissance && !xlDate(x.v.naissance)) E('Demandes', x.line, 'date de naissance attendue (ex. 2016-05-03)'); }
  if (leaving.length) warn.push(`${leaving.length} élève(s) non réinscrit(s) : gardé(s) dans « Anciens élèves » avec leur progression`);
  return { mosque, T: { ...T, eleves, leaving }, err, warn };
}

// ---------- installation ----------
export async function install(P) {
  const { mosque: M, T } = P;
  const db = emptyDb();
  d.setDb(db); d.load();
  const D = d.D();
  Object.assign(D.mosque, { name: M.nom, adresse: M.adresse, cp: M.cp, ville: M.ville, pays: M.pays, tel: M.tel, email: M.email, imamEmail: M.imamEmail, mawaqit: M.mawaqit, site: M.site, style: M.style, couleur: M.couleur });
  D.year = M.annee;
  D.finance.rate = num(M.rate) ?? 10;
  D.finance.defaultFee = num(M.fee) ?? 0;
  D.finance.opening = num(M.opening) ?? 0;
  const creds = [];
  let hasSuper = false;
  for (const { v } of T.equipe) {
    const rk = (ROLES.find(([, l]) => norm(l) === norm(v.role)) || ['prof'])[0];
    const role = rk === 'super' ? 'admin' : rk;
    const pw = d.randomPw();
    const u = await d.makeUser(role, v.login, v.name, pw, true);
    const m = String(v.pw || '').match(/^([a-z0-9]{8,}):([0-9a-f]{64})$/);
    if (m) { u.salt = m[1]; u.hash = m[2]; u.mustChange = false; } else creds.push({ name: v.name, login: u.login, pw, role: v.role });
    if (rk === 'super' && !hasSuper) { u.super = true; hasSuper = true; }
    Object.assign(u, { tel: v.tel, email: v.email.toLowerCase(), fonction: v.fonction || undefined });
    if (num(v.rate) != null) u.rate = num(v.rate);
    D.users.push(u);
  }
  if (!hasSuper) { const a = D.users.find((u) => u.role === 'admin'); if (a) a.super = true; }
  const uBy = (lg) => D.users.find((u) => u.login === String(lg).toLowerCase());
  D.locaux = T.locaux.map(({ v }) => ({ id: d.uid(), name: v.name, ...(v.note ? { note: v.note } : {}) }));
  const lBy = (n) => D.locaux.find((l) => norm(l.name) === norm(n));
  const COL = ['mint', 'blue', 'pink', 'yellow'];
  D.classes = T.classes.map(({ v }, i) => ({ id: d.uid(), name: v.name, profId: (uBy(v.prof) || {}).id, level: num(v.level) || 1, color: COL[i % 4], ...(v.public ? { public: v.public } : {}), capacity: Math.round(num(v.cap)) || 20, slots: [] }));
  const cBy = (n) => D.classes.find((c) => norm(c.name) === norm(n));
  for (const { v } of T.horaires) { const c = cBy(v.classe); if (c) c.slots.push({ day: DAYN.indexOf(norm(v.day)), time: hhmm(v.time), end: hhmm(v.end) || '', localId: (lBy(v.local) || {}).id }); }
  const fee = D.finance.defaultFee;
  D.families = T.familles.map(({ v }) => ({ id: d.uid(), name: v.name, cotisation: num(v.fee) ?? fee, status: 'unpaid', paid: 0 }));
  const fBy = (n) => { let f = D.families.find((x) => norm(x.name) === norm(n)); if (!f && n) { f = { id: d.uid(), name: n, cotisation: fee, status: 'unpaid', paid: 0 }; D.families.push(f); } return f; };
  // objectifs : ceux du fichier, sinon les objectifs habituels pour chaque prof
  for (const { v } of T.objectifs) { const u = uBy(v.prof); if (u) D.objectives.push({ id: d.uid(), profId: u.id, level: num(v.level) || 1, group: v.group, text: v.text }); }
  for (const u of D.users.filter((x) => x.role === 'prof' || D.classes.some((c) => c.profId === x.id))) if (!D.objectives.some((o) => o.profId === u.id)) D.objectives.push(...d.defaultObjectives(u.id));
  const today = todayISO();
  for (const { v } of T.eleves) {
    const c = cBy(v.classe); if (!c) continue;
    const nais = xlDate(v.age);
    const s = { id: d.uid(), classId: c.id, nom: v.nom, prenoms: v.prenoms.replace(/\s+/g, ' '), naissance: nais, age: nais ? null : Math.round(num(v.age)), ageAt: nais ? null : today, parent: v.parent, tel: v.tel, email: v.email.toLowerCase(), ...(v.rue ? { rue: v.rue, cp: v.cp, ville: v.ville } : {}), level: num(v.level) || c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
    for (const n of parseRanges(v.coran)) s.coran[n] = { s: 'v' };
    for (const n of parseRanges(v.cours)) if (!s.coran[n]) s.coran[n] = { s: 'c', start: today };
    if (v.famille) s.familyId = fBy(v.famille).id;
    D.students.push(s);
    s.code = v.code && !D.students.some((o) => o !== s && d.normCode(o.code) === d.normCode(v.code)) ? v.code : d.genCode(s, c);
  }
  // demandes : une ligne par enfant, regroupées par parent (même téléphone)
  const DG = new Map();
  for (const { v } of T.demandes) {
    const key = String(v.tel).replace(/[^\d]/g, '') || v.email || d.uid();
    const nais = xlDate(v.naissance);
    const kid = { prenoms: v.prenoms, nom: v.nom, naissance: nais, age: nais ? null : Math.round(num(v.naissance) || 0) || null, classId: (cBy(v.classe) || {}).id || '', code: v.code || '' };
    if (!DG.has(key)) DG.set(key, { id: d.uid(), status: 'new', at: new Date().toISOString(), parent: v.parent, tel: v.tel, email: String(v.email).toLowerCase(), rue: v.rue, cp: v.cp, ville: v.ville, annee: v.annee || M.annee, message: v.message, kids: [] });
    DG.get(key).kids.push(kid);
  }
  D.demandes = [...DG.values()].map((x) => ({ ...x, prenoms: x.kids[0].prenoms, nom: x.kids[0].nom, naissance: x.kids[0].naissance, age: x.kids[0].naissance ? d.ageOf({ naissance: x.kids[0].naissance }) : x.kids[0].age, classId: x.kids[0].classId }));
  // anciens élèves (non réinscrits) : gardés avec leur progression, retrouvables par leur code de suivi
  const arch = (v, from) => { const nais = xlDate(v.age); const a = { id: d.uid(), nom: v.nom, prenoms: v.prenoms, naissance: nais, age: nais ? null : Math.round(num(v.age)) || null, parent: v.parent, tel: v.tel, email: String(v.email || '').toLowerCase(), classe: v.classe, annee: v.annee || from, level: num(v.level) || 1, code: v.code, coran: {} };
    for (const n of parseRanges(v.coran)) a.coran[n] = { s: 'v' }; for (const n of parseRanges(v.cours)) if (!a.coran[n]) a.coran[n] = { s: 'c', start: today }; return a; };
  const prevYear = (y) => { const m = String(y).match(/(\d{4})\D+(\d{4})/); return m ? `${+m[1] - 1}–${+m[2] - 1}` : ''; };
  D.archive = [...(T.archive || []).map(({ v }) => arch(v, v.annee)), ...(T.leaving || []).filter(({ v }) => v.code || v.nom).map(({ v }) => arch(v, prevYear(M.annee)))];

  D.contacts = T.contact.map(({ v }) => ({ id: d.uid(), label: v.label, email: v.email.toLowerCase() }));
  if (!D.contacts.length && M.email) D.contacts.push({ id: d.uid(), label: 'La direction', email: M.email.toLowerCase() });
  if (M.imamEmail) D.mosque.imamEmail = M.imamEmail;
  D.faq = T.faq.map(({ v }) => ({ id: d.uid(), at: new Date().toISOString(), theme: v.theme, q: v.q, r: v.r, freq: yes(v.freq) }));
  if (T.cours.length) D.mosque.cours = T.cours.map(({ v }) => ({ public: v.public, detail: v.detail, horaires: v.horaires }));
  // catégorie du fichier : reprise si elle existe, sinon ajoutée à la liste
  const catKey = (list, l) => { const f = list.find(([k, lab]) => norm(lab) === norm(l) || norm(k) === norm(l) || (norm(l).length > 3 && norm(lab).startsWith(norm(l)))); if (f) return f[0]; if (!String(l || '').trim()) return d.OTHER_CAT; const key = 'c-' + d.uid().slice(0, 8); list.splice(list.length - 1, 0, [key, String(l).trim()]); d.catsSave(); return key; };
  if (T.cats && T.cats.length) {
    const mk = (type) => T.cats.filter(({ v }) => norm(v.type) === type && norm(v.label) !== norm('Autres recettes') && norm(v.label) !== norm('Autres dépenses')).map(({ v }) => { const old = [...d.INCOME_CATS, ...d.EXPENSE_CATS].find(([, l]) => norm(l) === norm(v.label)); return [old ? old[0] : 'c-' + d.uid().slice(0, 8), v.label]; });
    const inc = mk('recette'), exp = mk('depense');
    if (inc.length) d.INCOME_CATS.splice(0, d.INCOME_CATS.length, ...inc);
    if (exp.length) d.EXPENSE_CATS.splice(0, d.EXPENSE_CATS.length, ...exp);
    d.catsSave();
  }
  const m0 = d.curMonth() + '-01';
  for (const { v } of T.charges) {
    const inc = norm(v.type) === 'recette';
    (inc ? D.finance.incomes : D.finance.expenses).push({ id: d.uid(), cat: catKey(inc ? d.INCOME_CATS : d.EXPENSE_CATS, v.cat), label: v.label || v.cat, amount: num(v.amount) || 0, date: m0, monthly: true });
  }
  d.save(); d.load(); d.logout();
  return creds;
}

// ---------- écrans ----------
let st = { parsed: null, creds: null, busy: false, name: '' };
const card = (n, title, body) => `<div class="q-card col" style="padding:22px 24px;gap:12px"><div class="row" style="gap:12px"><span class="q-step">${n}</span><span class="b" style="font-size:17px">${title}</span></div>${body}</div>`;
function summary(P) {
  const T = P.T;
  const c = [['Équipe', T.equipe.length], ['Locaux', T.locaux.length], ['Classes', T.classes.length], ['Cours / semaine', T.horaires.length], ['Élèves', T.eleves.length], ['Familles', T.familles.length], ['Demandes', T.demandes.length], ['Contacts', T.contact.length], ['Réponses imam', T.faq.length], ['Charges mensuelles', T.charges.length]];
  return `<div class="q-card q-stats" style="grid-template-columns:repeat(5,1fr);row-gap:16px">${c.map(([l, n]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>
  <div class="q-kvs"><div><span>Mosquée</span><span>${esc(P.mosque.nom || '—')}</span></div><div><span>Année scolaire</span><span>${esc(P.mosque.annee || '—')}</span></div></div>`;
}
export function installView() {
  if (d.D().users && d.D().users.length && !st.creds) { location.hash = '#/login'; return null; }
  const P = st.parsed;
  let body;
  if (st.creds) {
    body = `<div class="q-card col" style="padding:24px 28px;gap:14px"><div class="row" style="gap:12px"><span class="q-ok">${ic('check', 22, 2.6)}</span><div class="col" style="gap:2px"><h1 style="font-size:22px;margin:0">L’application est prête</h1><span class="small mut">${esc((d.D().mosque || {}).name || '')} · ${esc(d.D().year || '')}</span></div></div>
    ${st.creds.length ? `<p class="small" style="margin:0">Voici les identifiants et mots de passe temporaires des nouveaux comptes. <b>Téléchargez-les maintenant</b> : ils ne seront plus affichés. Chacun choisira son mot de passe à la première connexion.</p>
    <div class="q-card q-pad"><div style="overflow-x:auto"><table class="q-tbl q-tbl-static"><thead><tr><th>Nom</th><th>Rôle</th><th>Identifiant</th><th>Mot de passe temporaire</th></tr></thead><tbody>${st.creds.map((c) => `<tr><td>${esc(c.name)}</td><td class="mut">${esc(c.role)}</td><td class="code">${esc(c.login)}</td><td class="code">${esc(c.pw)}</td></tr>`).join('')}</tbody></table></div></div>
    <button class="btn2" data-act="kit-creds">${ic('dl', 18)}Télécharger les identifiants (Excel)</button>` : '<p class="small mut" style="margin:0">Les comptes de l’équipe gardent leurs mots de passe.</p>'}
    <a class="btn full" href="#/login" data-act="kit-done">Aller à la connexion</a></div>`;
  } else {
    body = `${card(1, 'Téléchargez le fichier de la mosquée', `<p class="small mut" style="margin:0">Un seul fichier Excel avec tout ce qu’il faut : la mosquée, l’équipe (direction, imam, professeurs, trésorier), les locaux, les classes et leurs horaires, les élèves, les familles, les contacts, les réponses de l’imam… Chaque feuille explique quoi mettre.</p>
      <div class="row wrap" style="gap:8px"><button class="btn sm" data-act="kit-template">${ic('dl', 16)}Fichier vide à remplir</button><button class="btn2 sm" data-act="kit-example">${ic('dl', 16)}Exemple déjà rempli</button></div>`)}
    ${card(2, 'Importez le fichier rempli', `<p class="small mut" style="margin:0">À l’installation comme à chaque rentrée, c’est le même fichier. L’application vérifie tout avant d’installer.</p>
      <label class="q-drop" for="kitfile">${ic('upload', 22)}<span class="b">${st.name ? esc(st.name) : 'Choisir le fichier (Excel .xlsx ou .csv)'}</span><span class="small mut">${st.busy ? 'Lecture…' : 'Fichier Excel téléchargé à l’étape 1, puis rempli'}</span></label>
      <input id="kitfile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr" data-change="kit-file">
      ${P ? `${summary(P)}
      ${P.err.length ? `<div class="err col" style="gap:4px;align-items:flex-start"><b>${P.err.length} point(s) à corriger dans le fichier avant d’installer :</b>${P.err.slice(0, 40).map((e) => `<span>• ${esc(e)}</span>`).join('')}${P.err.length > 40 ? `<span>… et ${P.err.length - 40} autre(s)</span>` : ''}</div>` : ''}
      ${P.warn.length ? `<div class="q-note col" style="gap:2px;align-items:flex-start">${P.warn.map((w) => `<span class="small">${esc(w)}</span>`).join('')}</div>` : ''}
      ${P.err.length ? '' : `<button class="btn full" data-act="kit-install">${ic('check', 18)}Installer l’application</button>`}` : ''}`)}
    <p class="small mut" style="text-align:center">Pour tester l’application sans remplir de fichier : <button class="linkbtn" data-act="kit-try">charger l’exemple</button>.</p>`;
  }
  return `<div class="page narrow" style="max-width:760px;padding-top:28px"><div class="qd-h"><span class="grow"><h1>Installation</h1><span class="qd-sub">${st.creds ? 'Terminé' : 'Mettez en place l’application de la mosquée en 2 étapes'}</span></span></div>${body}</div>`;
}
const rerender = () => window.dispatchEvent(new Event('hashchange'));
ACT['kit-template'] = () => downloadTemplate();
ACT['kit-example'] = async () => { await downloadExample(); };
CHANGE['kit-file'] = async (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  st = { parsed: null, creds: null, busy: true, name: f.name }; rerender();
  try { st.parsed = await parseFile(f); } catch (e) { st.parsed = { mosque: {}, T: { equipe: [], locaux: [], classes: [], horaires: [], eleves: [], familles: [], demandes: [], contact: [], faq: [], charges: [] }, err: ['Fichier illisible : utilisez le fichier Excel (.xlsx) de l’étape 1 ou sa version .csv.'], warn: [] }; }
  st.busy = false; rerender();
};
ACT['kit-install'] = async () => {
  if (!st.parsed || st.parsed.err.length) return;
  st.creds = await install(st.parsed); st.parsed = null;
  toast('Application installée'); rerender();
};
ACT['kit-try'] = async () => {
  const data = await exampleData();
  // l'exemple garde ses mots de passe d'exemple : admin / admin1234, rahman / prof1234, tresorier / compta1234
  const T = {};
  for (const s of SH) T[s.k] = (data[s.k] || []).map((v, i) => ({ line: i + 3, v: Object.fromEntries(s.cols.map(([k]) => [k, String(v[k] ?? '')])) }));
  st.creds = await install({ mosque: Object.fromEntries(Object.entries(data.mosque).map(([k, v]) => [k, String(v ?? '')])), T });
  toast('Exemple chargé · identifiant admin, mot de passe admin1234'); rerender();
};
ACT['kit-done'] = () => { st = { parsed: null, creds: null, busy: false, name: '' }; location.hash = '#/login'; };
ACT['kit-creds'] = () => dl(xlsxBook([['Identifiants', [['Nom', 'Rôle', 'Identifiant', 'Mot de passe temporaire', 'Adresse'], ...st.creds.map((c) => [c.name, c.role, c.login, c.pw, `${location.origin}${location.pathname}#/login`])], { head: 0 }]]), 'identifiants-equipe.xlsx');

// ---------- nouvelle année scolaire ----------
let ny = { got: false };
export function yearView(u, shell) {
  const data = exportData();
  const sts = d.D().students.slice().sort((a, b) => d.cls(a.classId).name.localeCompare(d.cls(b.classId).name) || a.nom.localeCompare(b.nom));
  const leaving = sts.filter((s) => s.renew === 'non').length, dem = data.demandes.length;
  return shell(u, 4, `<div class="page" style="max-width:860px">
  <div class="qd-h"><a href="#/admin" class="ib" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><h1>Nouvelle année scolaire</h1><div class="qd-sub">Réinitialiser l’application pour ${esc(data.mosque.annee)}, sans rien perdre d’important</div></div></div>
  ${card(1, 'Qui revient l’année prochaine ?', `<p class="small mut" style="margin:0">Décochez les élèves qui ne se réinscrivent pas. Ils ne sont pas perdus : ils vont dans une fiche à part, avec toute leur progression.</p>
    <div class="q-card q-pad" style="max-height:380px;overflow:auto"><table class="q-tbl q-tbl-static"><thead><tr><th>Élève</th><th class="hm">Classe</th><th class="hm">Sourates</th><th class="r">Réinscrit</th></tr></thead><tbody>${sts.map((s) => `<tr><td>${esc(s.prenoms)} ${esc(s.nom)}</td><td class="hm mut">${esc(d.cls(s.classId).name)}</td><td class="hm">${d.coranStats(s).v}</td><td class="r"><label class="row" style="gap:8px;justify-content:flex-end;cursor:pointer"><span class="small mut">${s.renew === 'non' ? 'non' : 'oui'}</span><input type="checkbox" data-change="ny-renew" data-id="${s.id}" ${s.renew === 'non' ? '' : 'checked'} style="width:20px;height:20px;accent-color:#050505" aria-label="${esc(s.prenoms)} se réinscrit"></label></td></tr>`).join('')}</tbody></table></div>
    <span class="small">${sts.length - leaving} réinscrit(s) · <b>${leaving}</b> non réinscrit(s)</span>`)}
  ${card(2, 'Téléchargez les 2 fiches', `<div class="col" style="gap:4px"><span class="b small">① Fichier de la rentrée</span><p class="small mut" style="margin:0">Tout pour l’année prochaine : la mosquée, l’équipe (avec leurs mots de passe), les locaux, les classes et horaires, les ${sts.length - leaving} élève(s) réinscrit(s) avec leurs sourates et leur code de suivi, ${dem} demande(s) en attente, les contacts, les réponses de l’imam, les objectifs, les charges mensuelles et le solde de la caisse. Vous pouvez l’ouvrir dans Excel pour le préparer.</p></div>
    <button class="btn sm" data-act="ny-kit" style="align-self:flex-start">${ic('dl', 16)}Fichier de la rentrée (Excel)</button>
    <div class="col" style="gap:4px;margin-top:6px"><span class="b small">② Élèves non réinscrits</span><p class="small mut" style="margin:0">Les ${leaving} élève(s) qui ne reviennent pas, avec toute leur progression (sourates, niveau, code de suivi). Ils sont aussi gardés dans l’application (« Anciens élèves ») : s’ils reviennent, leur code de suivi retrouve leur progression.</p></div>
    <button class="btn2 sm" data-act="ny-leaving" style="align-self:flex-start" ${leaving ? '' : 'disabled'}>${ic('dl', 16)}Élèves non réinscrits (Excel)</button>
    <div class="row wrap" style="gap:8px;margin-top:6px"><button class="btn2 sm" data-act="compta-csv" data-y="${d.curMonth().slice(0, 4)}">${ic('dl', 16)}Compta de l’année (Excel)</button><button class="btn2 sm" data-act="ny-backup">${ic('dl', 16)}Sauvegarde complète (fichier)</button></div>
    <p class="small mut" style="margin:0">Appels, absences, notes et opérations de compta de l’année ne sont pas repris : gardez la compta et la sauvegarde pour vos archives.</p>`)}
  ${card(3, 'Réinitialisez l’application', `<p class="small mut" style="margin:0">Tout est effacé sur cet appareil, puis l’écran d’installation s’ouvre : importez-y le fichier de la rentrée (fiche ①).</p>
    <label class="row small" style="gap:10px;cursor:pointer"><input type="checkbox" data-change="ny-got" ${ny.got ? 'checked' : ''} style="width:20px;height:20px;accent-color:#050505">J’ai bien téléchargé le fichier de la rentrée</label>
    <button class="btnd sm" data-act="ny-reset" ${ny.got ? '' : 'disabled'} style="align-self:flex-start">${ic('refresh', 16)}Réinitialiser pour la nouvelle année</button>`)}
  </div>`);
}
CHANGE['ny-renew'] = (el) => { const s = d.student(el.dataset.id); if (!s) return; if (el.checked) delete s.renew; else s.renew = 'non'; d.save(); rerender(); };
ACT['ny-leaving'] = () => downloadLeaving();
ACT['ny-kit'] = () => { downloadRentree(); ny.got = true; rerender(); };
CHANGE['ny-got'] = (el) => { ny.got = el.checked; rerender(); };
ACT['ny-backup'] = () => dl(new Blob([JSON.stringify(d.D(), null, 2)], { type: 'application/json' }), `sauvegarde-complete-${todayISO()}.json`);
ACT['ny-reset'] = async () => {
  if (!d.isSuper(d.me())) { toast('Réservé au méga administrateur'); return; }
  if (!ny.got) { toast('Téléchargez d’abord le fichier de la rentrée'); return; }
  if (!ask('Tout effacer et préparer la nouvelle année ?\n\nPensez à réimporter le fichier de la rentrée juste après.')) return;
  await d.clearAudio().catch(() => {});
  setEmpty(); d.logout(); ny.got = false;
  st = { parsed: null, creds: null, busy: false, name: '' };
  location.hash = '#/installation';
  toast('Application réinitialisée · importez le fichier de la rentrée');
};
