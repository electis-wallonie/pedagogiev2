// Import d'une liste d'élèves depuis Excel (.xlsx) ou CSV — sans bibliothèque externe
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, pill, toast, todayISO, DAYS, hero } from './ui.js';
import { shell } from './prof.js';

// ---------- lecture .xlsx (zip + XML) ----------
async function unzip(buf) {
  const v = new DataView(buf);
  let e = buf.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const files = {};
  const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nl));
    files[name] = { method, csize, off };
    p += 46 + nl + xl + cl;
  }
  return async (name) => {
    const f = files[name];
    if (!f) return null;
    const start = f.off + 30 + v.getUint16(f.off + 26, true) + v.getUint16(f.off + 28, true);
    const raw = new Uint8Array(buf, start, f.csize);
    if (f.method === 0) return dec.decode(raw);
    const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(ds).text();
  };
}
const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
function colIdx(ref) { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
// toutes les feuilles d'un classeur : [{ name, rows }]
export async function readXlsxSheets(buf) {
  const get = await unzip(buf);
  const wb = xml(await get('xl/workbook.xml'));
  const rels = xml(await get('xl/_rels/workbook.xml.rels'));
  const ssT = await get('xl/sharedStrings.xml');
  const ss = ssT ? [...xml(ssT).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
  const out = [];
  for (const sheet of wb.getElementsByTagName('sheet')) {
    const rid = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = 'worksheets/sheet1.xml';
    for (const r of rels.getElementsByTagName('Relationship')) if (r.getAttribute('Id') === rid) target = r.getAttribute('Target');
    target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
    const txt = await get('xl/' + target);
    if (!txt) continue;
    const sh = xml(txt);
    const rows = [];
    for (const r of sh.getElementsByTagName('row')) {
      const row = [];
      for (const c of r.getElementsByTagName('c')) {
        const t = c.getAttribute('t');
        const vEl = c.getElementsByTagName('v')[0];
        let val = vEl ? vEl.textContent : '';
        if (t === 's') val = ss[+val] ?? '';
        else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
        else if (t !== 'str' && t !== 'b' && val !== '' && !isNaN(val)) val = +val;
        row[colIdx(c.getAttribute('r'))] = val;
      }
      rows[(+r.getAttribute('r') || rows.length + 1) - 1] = row;
    }
    out.push({ name: sheet.getAttribute('name'), rows: Array.from(rows, (x) => x || []) });
  }
  return out;
}
async function readXlsx(buf) { return ((await readXlsxSheets(buf))[0] || { rows: [] }).rows; }
function readCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ---------- interprétation ----------
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const key = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// L'ordre compte : la première règle qui correspond l'emporte (ex. « E-mail du parent » → email, pas parent)
const HEAD = [
  ['email', /^(email|mail|courriel|adressemail|adresseemail|adressee?mail)/],
  ['tel', /^(tel|telephone|portable|gsm|mobile|phone|numero|contact)/],
  ['classe', /^(classe|class|groupe)/],
  ['naissance', /(naissance|nele|birth|datede)/],
  ['parent', /(parent|pere|mere|responsable|tuteur)/],
  ['prenoms', /^(prenom|firstname)/],
  ['nom', /^(nom|lastname)/],
  ['age', /^(age|ans)/],
];
// Colonnes du modèle, dans l'ordre conseillé : [titre, obligatoire, exemple, explication]
export const COLS = [
  ['Classe', true, 'Classe 1', 'Nom exact de la classe. Si elle n’existe pas encore, elle peut être créée à l’import.'],
  ['Nom', true, 'Benali', 'Nom de famille de l’élève.'],
  ['Prénom', true, 'Yasmine', 'Prénom(s) de l’élève.'],
  ['Âge', true, '10', 'Âge en années (il se met à jour tout seul chaque année).'],
  ['Parent', true, 'Karim', 'Prénom d’un parent.'],
  ['Téléphone', true, '+32 470 12 34 56', 'Téléphone du parent, avec l’indicatif (+32, +33…) pour avoir le bouton WhatsApp.'],
  ['E-mail', true, 'karim.benali@gmail.com', 'E-mail du parent.'],
];
function mapHeader(row) {
  const m = {};
  row.forEach((h, i) => {
    const k = norm(h);
    if (!k) return;
    for (const [key, re] of HEAD) if (re.test(k) && m[key] == null) { m[key] = i; break; }
  });
  return m;
}
function parseDate(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number' && v > 1000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += y > 50 ? 1900 : 2000; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return null;
}
const parseAge = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return n > 1 && n < 100 ? n : null; };
const parseTel = (v) => { if (v === '' || v == null) return ''; let t = String(v).trim(); if (typeof v === 'number' && /^\d{9}$/.test(t)) t = '0' + t; return t; };
const cap = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

let imp = null; // { name, rows:[{...}], missingCols }
function analyse(rows, u) {
  const hi = rows.findIndex((r) => r && r.some((x) => /nom|prenom|parent/i.test(norm(x))));
  if (hi < 0) return { error: 'Impossible de trouver la ligne de titres (Nom, Prénom, Parent…).' };
  const m = mapHeader(rows[hi]);
  const missing = ['nom', 'prenoms', 'parent', 'tel', 'email'].filter((k) => m[k] == null);
  if (m.age == null && m.naissance == null) missing.push('age');
  const cls = d.myClasses(u);
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    if (!r || !r.some((x) => String(x ?? '').trim())) continue;
    const x = {
      classe: m.classe != null ? cap(r[m.classe]) : '',
      nom: cap(r[m.nom]), prenoms: cap(r[m.prenoms]), parent: cap(r[m.parent]),
      naissance: m.naissance != null ? parseDate(r[m.naissance]) : null,
      age: m.age != null ? parseAge(r[m.age]) : null,
      tel: m.tel != null ? parseTel(r[m.tel]) : '',
      email: m.email != null ? cap(r[m.email]).toLowerCase() : '',
    };
    const errs = [];
    if (!x.nom) errs.push('nom');
    if (!x.prenoms) errs.push('prénom');
    if (!x.parent) errs.push('parent');
    if (!x.naissance && !x.age) errs.push('âge');
    if (String(x.tel).replace(/[^\d]/g, '').length < 8) errs.push('téléphone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) errs.push('e-mail');
    x.err = errs.length ? 'Manque : ' + errs.join(', ') : '';
    const c = x.classe ? cls.find((k) => key(k.name) === key(x.classe)) : null;
    x.classId = c ? c.id : null;
    x.dup = !!(c && d.studentsOf(c.id).some((s) => key(s.nom) === key(x.nom) && key(s.prenoms) === key(x.prenoms)));
    out.push(x);
  }
  return { rows: out, missing, hasClassCol: m.classe != null };
}

export function importView(u) {
  const cls = d.myClasses(u);
  const admin = d.isAdmin(u);
  let body = '';
  if (imp && imp.done) {
    body = `${hero('Import terminé', `${imp.done.length} élève(s) importé(s)`, { sub: 'Chaque élève a reçu son code de suivi : transmettez-les aux parents.', shadow: 'var(--mint)', extra: `<button class="btn" data-act="imp-codes" style="background:var(--yellow);color:var(--ink)">${ic('dl', 20)}Télécharger la liste des codes</button>` })}
    <div class="ck pad" style="padding-top:4px;padding-bottom:4px;overflow-x:auto"><div class="list">${imp.done.map((s) => `<a class="li" href="#/prof/eleve/${s.id}"><span class="grow b">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b">${esc(d.cls(s.classId).name)}</span><span class="code tiny">${esc(s.code)}</span></a>`).join('')}</div></div>
    <button class="btn2" data-act="imp-reset">Importer un autre fichier</button>`;
  } else if (imp && imp.rows) {
    const ok = imp.rows.filter((r) => !r.err && !r.dup);
    const newCls = [...new Set(ok.filter((r) => r.classe && !r.classId).map((r) => r.classe))];
    const noCls = ok.filter((r) => !r.classe).length;
    body = `${hero('Fichier · ' + esc(imp.name), `${ok.length} prêt(s) à importer`, { sub: `${imp.rows.length} ligne(s) lue(s)`, chip: imp.rows.filter((r) => r.err).length ? imp.rows.filter((r) => r.err).length + ' à corriger' : 'OK', shadow: ok.length ? 'var(--mint)' : 'var(--pink)' })}
    <div class="ck pad col">
    ${imp.missing.length ? `<div class="err">Colonnes introuvables : ${imp.missing.map((k) => ({ nom: 'Nom', prenoms: 'Prénom', parent: 'Parent', age: 'Âge (ou Date de naissance)', tel: 'Téléphone', email: 'E-mail' }[k])).join(', ')}</div>` : ''}
    <div class="row wrap" style="gap:8px">${pill(ok.length + ' prêt(s) à importer', 'var(--mint)')}${pill(imp.rows.filter((r) => r.err).length + ' incomplet(s)', 'var(--absent)', 'var(--onabsent)')}${pill(imp.rows.filter((r) => r.dup).length + ' déjà présent(s)', 'var(--prev)')}</div>
    ${noCls ? `<div class="field"><label class="lbl" for="impc">Classe pour les ${noCls} élève(s) sans classe</label><select id="impc" name="defaultClass" form="impf" class="inp">${cls.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}${cls.length ? '' : '<option value="">(créez d’abord une classe)</option>'}</select></div>` : ''}
    ${newCls.length ? `<div class="ck flat pad col" style="background:var(--hi)"><span class="b">Classes qui seront créées : ${newCls.map(esc).join(', ')}</span>${admin ? `<div class="field"><label class="lbl" for="impp">Professeur de ces nouvelles classes</label><select id="impp" name="prof" form="impf" class="inp">${d.profs().map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>` : ''}</div>` : ''}
    </div>
    <div class="ck" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:var(--neutral);text-align:start">${['Classe', 'Nom', 'Prénom(s)', 'Âge', 'Parent', 'Téléphone', 'E-mail', 'État'].map((h) => `<th style="padding:10px;text-align:start">${h}</th>`).join('')}</tr></thead><tbody>
    ${imp.rows.map((r) => `<tr style="border-top:2px solid var(--neutral)"><td style="padding:8px 10px">${esc(r.classe || '—')}${r.classe && !r.classId ? ' ' + pill('nouvelle', 'var(--hi)') : ''}</td><td style="padding:8px 10px" class="b">${esc(r.nom)}</td><td style="padding:8px 10px">${esc(r.prenoms)}</td><td style="padding:8px 10px">${r.naissance ? d.ageOf({ naissance: r.naissance }) : r.age ?? '—'}</td><td style="padding:8px 10px">${esc(r.parent)}</td><td style="padding:8px 10px" class="code">${esc(r.tel || '—')}</td><td style="padding:8px 10px">${esc(r.email || '—')}</td><td style="padding:8px 10px">${r.err ? pill(esc(r.err), 'var(--absent)', 'var(--onabsent)') : r.dup ? pill('Déjà présent', 'var(--prev)') : pill('OK', 'var(--mint)')}</td></tr>`).join('')}
    </tbody></table></div>
    <form id="impf" data-form="imp-go" class="row wrap"><button type="button" class="btn2" data-act="imp-reset">Annuler</button><span class="grow"></span><button class="btn" ${ok.length ? '' : 'disabled'}>${ic('upload', 20)}Importer ${ok.length} élève(s)</button></form>`;
  } else {
    body = `${hero('Importer des élèves', 'En 2 étapes', { sub: 'Un fichier Excel ou CSV, une ligne par élève. Les codes de suivi sont créés tout seuls.', shadow: 'var(--blue2)' })}
    <h2 class="sec-t">1. Préparez le fichier</h2><div class="ck pad col">
    <p class="b" style="font-weight:600">Une ligne par élève. La 1re ligne contient les titres des colonnes, dans cet ordre (l’ordre conseillé ; l’application reconnaît aussi les colonnes dans un autre ordre) :</p>
    <button class="btn sm" data-act="imp-template" style="align-self:flex-start">${ic('dl', 18)}Télécharger le modèle Excel (.xlsx)</button>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:var(--neutral)">${['#', 'Colonne', '', 'Exemple', 'À savoir'].map((h) => `<th style="padding:8px 10px;text-align:start">${h}</th>`).join('')}</tr></thead><tbody>
    ${COLS.map(([h, req, ex, help], i) => `<tr style="border-top:2px solid var(--neutral)"><td style="padding:8px 10px" class="b">${String.fromCharCode(65 + i)}</td><td style="padding:8px 10px;white-space:nowrap" class="b">${esc(h)}</td><td style="padding:8px 10px">${req ? pill('Obligatoire', 'var(--absent)', 'var(--onabsent)') : pill('Facultatif', 'var(--neutral)')}</td><td style="padding:8px 10px;white-space:nowrap">${esc(ex)}</td><td style="padding:8px 10px" class="small">${esc(help)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="small mut b" style="font-weight:600">Toutes les colonnes sont obligatoires. Une ligne incomplète est signalée et n’est pas importée : complétez-la dans le fichier puis importez à nouveau (les élèves déjà importés sont ignorés).</p></div>
    <h2 class="sec-t">2. Choisissez le fichier</h2><div class="bcard col"><span class="w1-blob" aria-hidden="true"></span>
    <label class="btn" for="impfile" style="cursor:pointer">${ic('upload', 20)}Choisir un fichier Excel ou CSV</label>
    <input id="impfile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr" data-change="imp-file">
    <p class="small b" style="font-weight:600;color:#DCE3FF">Formats acceptés : .xlsx (Excel) et .csv. Pour un ancien fichier .xls, ouvrez-le dans Excel et enregistrez-le en .xlsx.</p>
    ${imp && imp.error ? `<div class="err" role="alert">${esc(imp.error)}</div>` : ''}</div>`;
  }
  return shell(u, 3, `<div class="page">
  <div class="top"><a href="#/prof/reglages" class="ib" aria-label="Retour">${ic('back', 20)}</a><div class="grow"><div class="small mut b">${admin ? 'Toutes les classes' : 'Vos classes'}</div><h1>Importer des élèves</h1></div></div>
  ${body}</div>`);
}
const rerender = () => window.dispatchEvent(new Event('hashchange'));
CHANGE['imp-file'] = async (el) => {
  const f = el.files && el.files[0];
  if (!f) return;
  try {
    const rows = /\.csv$/i.test(f.name) ? readCsv(await f.text()) : await readXlsx(await f.arrayBuffer());
    const a = analyse(rows, d.me());
    imp = a.error ? { error: a.error } : { name: f.name, ...a };
  } catch {
    imp = { error: 'Fichier illisible. Vérifiez qu’il s’agit bien d’un fichier .xlsx ou .csv.' };
  }
  rerender();
};
ACT['imp-reset'] = () => { imp = null; rerender(); };
FORMS['imp-go'] = (f, fd) => {
  const u = d.me();
  const def = fd.get('defaultClass');
  const profId = d.isAdmin(u) ? fd.get('prof') || (d.profs()[0] || {}).id : u.id;
  const created = {};
  const done = [];
  for (const r of imp.rows.filter((x) => !x.err && !x.dup)) {
    let cid = r.classId || (r.classe ? created[d.normCode(r.classe)] : def);
    if (!cid && r.classe) {
      if (!profId) { toast('Créez d’abord un professeur'); return; }
      const c = { id: d.uid(), profId, name: r.classe, slots: [], color: ['blue', 'mint', 'yellow', 'pink'][Object.keys(created).length % 4], level: 1 };
      d.D().classes.push(c); created[d.normCode(r.classe)] = c.id; cid = c.id;
    }
    const c = d.cls(cid);
    if (!c) continue;
    const s = { id: d.uid(), classId: cid, nom: r.nom, prenoms: r.prenoms, parent: r.parent, tel: r.tel || '', email: r.email || '', naissance: r.naissance, age: r.naissance ? null : r.age, ageAt: r.naissance ? null : todayISO(), level: c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
    s.code = d.genCode(s, c);
    d.D().students.push(s);
    done.push(s);
  }
  d.save();
  imp = { done };
  toast(`${done.length} élève(s) importé(s)`);
  rerender();
};
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click();
}
const csvLine = (arr) => arr.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';');
ACT['imp-template'] = () => {
  const rows = [COLS.map((c) => c[0]),
    ['Classe 1', 'Benali', 'Yasmine', 10, 'Karim', '+32 470 12 34 56', 'karim.benali@gmail.com'],
    ['Classe 2', 'Benali', 'Ilyes', 8, 'Karim', '+32 470 12 34 56', 'karim.benali@gmail.com'],
    ['Classe 1', 'Haddad', 'Adam', 11, 'Nadia', '+32 471 98 76 54', 'nadia.haddad@hotmail.com']];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(xlsxBlob(rows, 'Élèves'));
  a.download = 'modele-import-eleves.xlsx'; a.click();
};
// ---------- écriture d'un .xlsx minimal (zip sans compression) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const [name, text] of files) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    parts.push(h, nb, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    central.push(c, nb);
    off += 30 + nb.length + data.length;
  }
  const size = central.reduce((t, x) => t + x.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const xe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));
function sheetXml(rows, opt = {}) {
  const head = opt.head == null ? 0 : opt.head;
  const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => { const st = ri === head ? ' s="1"' : opt.note && ri < head ? ' s="2"' : ''; return v === '' || v == null ? '' : typeof v === 'number'
    ? `<c r="${colName(ci)}${ri + 1}"${st}><v>${v}</v></c>`
    : `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(v)}</t></is></c>`; }).join('')}</row>`).join('');
  const ncol = Math.max(1, ...rows.map((r) => r.length));
  const widths = Array.from({ length: ncol }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(opt.maxW || 60, Math.max(12, ...rows.slice(head).map((r) => String(r[i] ?? '').length + 2)))}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${head + 1}" topLeftCell="A${head + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
}
// classeur à plusieurs feuilles : sheets = [[nom, lignes, { head }]]
export function xlsxBook(sheets) {
  const n = sheets.length;
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([nm], i) => `<sheet name="${xe(nm.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF616161"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF050505"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf fontId="2" applyFont="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'],
    ...sheets.map(([, rows, opt], i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(rows, opt || {})]),
  ]);
}
function xlsxBlob(rows, sheetName) { return xlsxBook([[sheetName, rows]]); }
ACT['imp-codes'] = () => download(`codes-eleves-${todayISO()}.csv`, [csvLine(['Classe', 'Nom', 'Prénom(s)', 'Parent', 'Téléphone', 'E-mail', 'Code de suivi', 'Lien direct'])].concat(imp.done.map((s) => csvLine([d.cls(s.classId).name, s.nom, s.prenoms, s.parent, s.tel || '', s.email || '', s.code, `${location.origin}${location.pathname}#/f/${encodeURIComponent(s.code)}`]))).join('\r\n'));
