// Import d'une liste d'élèves depuis Excel (.xlsx) ou CSV — sans bibliothèque externe
import * as d from './data.js';
import { ACT, FORMS, CHANGE, esc, ic, pill, toast, todayISO, DAYS } from './ui.js';
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
async function readXlsx(buf) {
  const get = await unzip(buf);
  const wb = xml(await get('xl/workbook.xml'));
  const first = wb.getElementsByTagName('sheet')[0];
  const rid = first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const rels = xml(await get('xl/_rels/workbook.xml.rels'));
  let target = 'worksheets/sheet1.xml';
  for (const r of rels.getElementsByTagName('Relationship')) if (r.getAttribute('Id') === rid) target = r.getAttribute('Target');
  target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
  const ssT = await get('xl/sharedStrings.xml');
  const ss = ssT ? [...xml(ssT).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
  const sh = xml(await get('xl/' + target));
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
    rows.push(row);
  }
  return rows;
}
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
const HEAD = [
  ['tel', /^(tel|telephone|portable|gsm|mobile|phone|numero|contact)/],
  ['classe', /^(classe|class|groupe)/],
  ['naissance', /(naissance|nele|birth|datede)/],
  ['parent', /(parent|pere|mere|responsable|tuteur)/],
  ['prenoms', /^(prenom|firstname)/],
  ['nom', /^(nom|lastname|famille)/],
  ['age', /^(age|ans)/],
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
  const missing = ['nom', 'prenoms', 'parent'].filter((k) => m[k] == null);
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
    };
    const errs = [];
    if (!x.nom) errs.push('nom');
    if (!x.prenoms) errs.push('prénom');
    if (!x.parent) errs.push('parent');
    if (!x.naissance && !x.age) errs.push('âge');
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
    body = `<div class="ck pad col" style="background:var(--mint)"><h2>${imp.done.length} élève(s) importé(s)</h2>
    <p class="b" style="font-weight:600">Chaque élève a reçu son code de suivi. Téléchargez la liste des codes pour les transmettre aux parents.</p>
    <button class="btn" data-act="imp-codes">${ic('dl', 20)}Télécharger la liste des codes</button></div>
    <div class="ck pad" style="padding-top:4px;padding-bottom:4px;overflow-x:auto"><div class="list">${imp.done.map((s) => `<a class="li" href="#/prof/eleve/${s.id}"><span class="grow b">${esc(s.prenoms)} ${esc(s.nom)}</span><span class="small mut b">${esc(d.cls(s.classId).name)}</span><span class="code tiny">${esc(s.code)}</span></a>`).join('')}</div></div>
    <button class="btn2" data-act="imp-reset">Importer un autre fichier</button>`;
  } else if (imp && imp.rows) {
    const ok = imp.rows.filter((r) => !r.err && !r.dup);
    const newCls = [...new Set(ok.filter((r) => r.classe && !r.classId).map((r) => r.classe))];
    const noCls = ok.filter((r) => !r.classe).length;
    body = `<div class="ck pad col"><div class="row between wrap"><h2>${esc(imp.name)}</h2>${pill(imp.rows.length + ' ligne(s)', 'var(--neutral)')}</div>
    ${imp.missing.length ? `<div class="err">Colonnes introuvables : ${imp.missing.map((k) => ({ nom: 'Nom', prenoms: 'Prénom', parent: 'Parent', age: 'Âge (ou Date de naissance)' }[k])).join(', ')}</div>` : ''}
    <div class="row wrap" style="gap:8px">${pill(ok.length + ' prêt(s) à importer', 'var(--mint)')}${pill(imp.rows.filter((r) => r.err).length + ' incomplet(s)', 'var(--absent)', 'var(--onabsent)')}${pill(imp.rows.filter((r) => r.dup).length + ' déjà présent(s)', 'var(--prev)')}</div>
    ${noCls ? `<div class="field"><label class="lbl" for="impc">Classe pour les ${noCls} élève(s) sans classe</label><select id="impc" name="defaultClass" form="impf" class="inp">${cls.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}${cls.length ? '' : '<option value="">(créez d’abord une classe)</option>'}</select></div>` : ''}
    ${newCls.length ? `<div class="ck flat pad col" style="background:var(--hi)"><span class="b">Classes qui seront créées : ${newCls.map(esc).join(', ')}</span>${admin ? `<div class="field"><label class="lbl" for="impp">Professeur de ces nouvelles classes</label><select id="impp" name="prof" form="impf" class="inp">${d.profs().map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>` : ''}</div>` : ''}
    </div>
    <div class="ck" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:var(--neutral);text-align:start">${['Classe', 'Nom', 'Prénom(s)', 'Âge', 'Parent', 'Téléphone', 'État'].map((h) => `<th style="padding:10px;text-align:start">${h}</th>`).join('')}</tr></thead><tbody>
    ${imp.rows.map((r) => `<tr style="border-top:2px solid var(--neutral)"><td style="padding:8px 10px">${esc(r.classe || '—')}${r.classe && !r.classId ? ' ' + pill('nouvelle', 'var(--hi)') : ''}</td><td style="padding:8px 10px" class="b">${esc(r.nom)}</td><td style="padding:8px 10px">${esc(r.prenoms)}</td><td style="padding:8px 10px">${r.naissance ? d.ageOf({ naissance: r.naissance }) : r.age ?? '—'}</td><td style="padding:8px 10px">${esc(r.parent)}</td><td style="padding:8px 10px" class="code">${esc(r.tel || '—')}</td><td style="padding:8px 10px">${r.err ? pill(esc(r.err), 'var(--absent)', 'var(--onabsent)') : r.dup ? pill('Déjà présent', 'var(--prev)') : pill('OK', 'var(--mint)')}</td></tr>`).join('')}
    </tbody></table></div>
    <form id="impf" data-form="imp-go" class="row wrap"><button type="button" class="btn2" data-act="imp-reset">Annuler</button><span class="grow"></span><button class="btn" ${ok.length ? '' : 'disabled'}>${ic('upload', 20)}Importer ${ok.length} élève(s)</button></form>`;
  } else {
    body = `<div class="ck pad col"><h2>1. Préparez le fichier Excel</h2>
    <p class="b" style="font-weight:600">Une ligne par élève, avec ces colonnes (dans n’importe quel ordre) :</p>
    <div class="row wrap" style="gap:8px">${['Classe', 'Nom', 'Prénom(s)', 'Âge', 'Parent', 'Téléphone'].map((h) => pill(h, 'var(--blue2)')).join('')}</div>
    <p class="small mut b" style="font-weight:600">« Téléphone » est facultatif. « Âge » peut être remplacé par « Date de naissance ». Si la colonne Classe est vide ou absente, vous choisirez la classe juste après. Les classes qui n’existent pas encore peuvent être créées automatiquement.</p>
    <button class="btn2 sm" data-act="imp-template" style="align-self:flex-start">${ic('dl', 18)}Télécharger un modèle</button></div>
    <div class="ck pad col"><h2>2. Choisissez le fichier</h2>
    <label class="btn" for="impfile" style="cursor:pointer">${ic('upload', 20)}Choisir un fichier Excel ou CSV</label>
    <input id="impfile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr" data-change="imp-file">
    <p class="small mut b" style="font-weight:600">Formats acceptés : .xlsx (Excel) et .csv. Pour un ancien fichier .xls, ouvrez-le dans Excel et enregistrez-le en .xlsx.</p>
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
    const s = { id: d.uid(), classId: cid, nom: r.nom, prenoms: r.prenoms, parent: r.parent, tel: r.tel || '', naissance: r.naissance, age: r.naissance ? null : r.age, ageAt: r.naissance ? null : todayISO(), level: c.level || 1, coran: {}, acquired: {}, createdAt: new Date().toISOString() };
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
ACT['imp-template'] = () => download('modele-eleves.csv', [csvLine(['Classe', 'Nom', 'Prénom(s)', 'Âge', 'Parent', 'Téléphone']), csvLine(['Classe 1', 'Benali', 'Yasmine Inès', '10', 'Karim', '+32 470 00 00 01']), csvLine(['Classe 1', 'Haddad', 'Adam', '11', 'Nadia', '+32 470 00 00 02'])].join('\r\n'));
ACT['imp-codes'] = () => download(`codes-eleves-${todayISO()}.csv`, [csvLine(['Classe', 'Nom', 'Prénom(s)', 'Parent', 'Téléphone', 'Code de suivi', 'Lien direct'])].concat(imp.done.map((s) => csvLine([d.cls(s.classId).name, s.nom, s.prenoms, s.parent, s.tel || '', s.code, `${location.origin}${location.pathname}#/f/${encodeURIComponent(s.code)}`]))).join('\r\n'));
