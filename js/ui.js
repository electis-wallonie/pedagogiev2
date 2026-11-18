// Petits outils d'interface partagés
import { getAudio, putAudio, uid } from './data.js';
import { tr, locale } from './i18n.js';

export const ACT = {};    // data-act="nom"    → clic
export const FORMS = {};  // data-form="nom"   → envoi de formulaire
export const CHANGE = {}; // data-change="nom" → changement de champ

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const P = {
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  door: '<path d="M3 21h18"/><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><circle cx="15" cy="12" r="1"/>',
  euro: '<path d="M18 7a7 7 0 1 0 0 10"/><path d="M4 10h10M4 14h10"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  home: '<path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  chev: '<path d="M9 18l6-6-6-6"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clip: '<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  mega: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>', key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M17 6l3 3M14 9l2 2"/>',
};
const FLIP = new Set(['back', 'chev', 'arrow', 'send']);
export function ic(n, s = 22, w = 2.4) {
  return `<svg${FLIP.has(n) ? ' class="fl"' : ''} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
}
export const COLORS = { blue: '#9DB5FF', mint: '#6EE7B7', yellow: '#FFD400', pink: '#FF8FB1' };
export const COLOR_NAMES = { blue: 'Bleu', mint: 'Menthe', yellow: 'Jaune', pink: 'Rose' };
export const ACC = ['#9DB5FF', '#6EE7B7', '#FFD400', '#FF8FB1'];
export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const initials = (s) => (s.prenoms.split(' ')[0][0] || '') + (s.nom[0] || '');
export const fullName = (s) => `${s.prenoms.split(' ')[0]} ${s.nom}`;
export function av(text, size = 44, bg = '#FFD400', fs = 15) { return `<span class="av" style="width:${size}px;height:${size}px;background:${bg};font-size:${fs}px">${esc(text)}</span>`; }
export function pill(t, bg, fg = 'var(--ink)') { return `<span class="pill" style="background:${bg};color:${fg}">${t}</span>`; }

export const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export function fdate(iso, opt = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString(locale, opt);
}
export const flong = (iso) => fdate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fshort = (iso) => fdate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
export const ftime = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
const ORDER = [1, 2, 3, 4, 5, 6, 0];
export const hm = (t) => (t || '').replace(':', 'h');
export function schedLabel(slots) { return slots.slice().sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.time.localeCompare(b.time)).map((s) => `${DAYS[s.day]} ${hm(s.time)}`).join(' · '); }
export function nextLabel(n) {
  if (!n) return '';
  const iso = `${n.when.getFullYear()}-${String(n.when.getMonth() + 1).padStart(2, '0')}-${String(n.when.getDate()).padStart(2, '0')}`;
  const k = Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 864e5);
  const day = k === 0 ? 'Aujourd’hui' : k === 1 ? 'Demain' : fdate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day} à ${hm(n.slot.time)}`;
}
export const ask = (m) => window.confirm(tr(m));
export const askText = (m, v) => window.prompt(tr(m), v);
export function daysSince(iso) { return Math.max(0, Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 864e5)); }

export const STATUS = {
  P: { l: 'Présent', bg: 'var(--present)', fg: 'var(--onpresent)', icon: 'check' },
  A: { l: 'Absent', bg: 'var(--absent)', fg: 'var(--onabsent)', icon: 'x' },
  E: { l: 'Absent prévenu', bg: 'var(--prev)', fg: 'var(--onprev)', icon: 'mail' },
};
export const SST = { v: 'Validée', c: 'En cours', n: 'Non connue' };

export function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = tr(msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
let modalRender = null;
export function openModal(fn) {
  modalRender = fn;
  let m = document.getElementById('modal');
  if (!m) { m = document.createElement('div'); m.id = 'modal'; document.body.appendChild(m); }
  m.className = 'modal';
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>${fn()}</div>`;
  hydrateAudio(m);
  document.body.style.overflow = 'hidden';
}
export function refreshModal() { if (modalRender && document.getElementById('modal')) openModal(modalRender); }
export function closeModal() {
  stopRecIfAny();
  const m = document.getElementById('modal');
  if (m) m.remove();
  modalRender = null;
  document.body.style.overflow = '';
}
ACT['close-modal'] = closeModal;

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copié !'); }
  catch { window.prompt(tr('Copiez ce texte :'), t); }
}

// ---------- messages vocaux ----------
const urls = {};
export async function hydrateAudio(root = document) {
  for (const el of root.querySelectorAll('audio[data-audio]')) {
    const id = el.dataset.audio;
    if (!urls[id]) {
      const b = await getAudio(id).catch(() => null);
      if (!b) { el.replaceWith(Object.assign(document.createElement('span'), { className: 'tiny mut', textContent: 'Message vocal indisponible sur cet appareil' })); continue; }
      urls[id] = URL.createObjectURL(b);
    }
    el.src = urls[id];
  }
  for (const el of root.querySelectorAll('[data-blob],[data-blob-href]')) {
    const id = el.dataset.blob || el.dataset.blobHref;
    if (!urls[id]) {
      const b = await getAudio(id).catch(() => null);
      if (!b) { el.replaceWith(Object.assign(document.createElement('span'), { className: 'tiny mut', textContent: 'Pièce jointe expirée ou indisponible sur cet appareil' })); continue; }
      urls[id] = URL.createObjectURL(b);
    }
    if (el.dataset.blob) el.src = urls[id]; else el.href = urls[id];
  }
}
export const pending = {}; // zone → { blob, dur }
// Messages vocaux : 1 minute maximum, qualité « voix » (24 kbit/s ≈ 180 Ko la minute), supprimés au bout de 30 jours
export const VOICE_MAX_S = 60;
export const VOICE_DAYS = 30;
let rec = null;
function fmtDur(s) { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function zoneHtml(zone) {
  const p = pending[zone];
  if (rec && rec.zone === zone) return `<div class="rec"><span class="dot"></span>Enregistrement… <span data-timer>${fmtDur((Date.now() - rec.t0) / 1000)}</span> / ${fmtDur(VOICE_MAX_S)}</div>`;
  if (p) return `<div class="tiny mut b">Vocal de ${fmtDur(Math.min(p.dur, VOICE_MAX_S))} · ${zone.startsWith('zs') ? 'gardé jusqu’à la validation de la sourate' : `supprimé automatiquement au bout de ${VOICE_DAYS} jours`}</div><div class="row"><audio controls src="${p.url}" style="flex:1;min-width:0;height:40px"></audio><button type="button" class="ib sm" data-act="rec-del" data-zone="${zone}" aria-label="Supprimer le message vocal">${ic('trash', 18)}</button></div>`;
  return '';
}
function paintZone(zone) {
  const z = document.getElementById(zone);
  if (z) z.innerHTML = zoneHtml(zone);
  const b = document.querySelector(`[data-act="rec"][data-zone="${zone}"]`);
  if (b) {
    const on = rec && rec.zone === zone;
    b.classList.toggle('on', !!on);
    b.innerHTML = on ? `${ic('stop', 20)}Arrêter` : `${ic('mic', 20)}${pending[zone] ? 'Refaire' : 'Vocal'}`;
  }
}
function stopRecIfAny() { if (rec) { try { rec.mr.stop(); } catch {} } }
ACT['rec'] = async (el) => {
  const zone = el.dataset.zone;
  if (rec && rec.zone === zone) { rec.mr.stop(); return; }
  stopRecIfAny();
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Enregistrement vocal non pris en charge par ce navigateur'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { toast('Micro refusé : autorisez le micro dans le navigateur'); return; }
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
  const opts = { audioBitsPerSecond: 24000 };
  if (type) opts.mimeType = type;
  const mr = new MediaRecorder(stream, opts);
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
    const dur = (Date.now() - rec.t0) / 1000;
    clearInterval(rec.tick);
    rec = null;
    if (blob.size) pending[zone] = { blob, dur, url: URL.createObjectURL(blob) };
    paintZone(zone);
  };
  rec = { mr, zone, t0: Date.now(), tick: setInterval(() => {
    if (!rec) return;
    const s = (Date.now() - rec.t0) / 1000;
    const t = document.querySelector(`#${zone} [data-timer]`); if (t) t.textContent = fmtDur(Math.min(s, VOICE_MAX_S));
    if (s >= VOICE_MAX_S && rec.mr.state === 'recording') { rec.mr.stop(); toast('1 minute maximum : enregistrement arrêté'); }
  }, 250) };
  mr.start();
  paintZone(zone);
};
ACT['rec-del'] = (el) => { delete pending[el.dataset.zone]; paintZone(el.dataset.zone); };
export async function takePending(zone) {
  if (rec && rec.zone === zone) { toast('Arrêtez d’abord l’enregistrement'); return false; }
  const p = pending[zone];
  if (!p) return null;
  const id = uid();
  await putAudio(id, p.blob);
  delete pending[zone];
  return id;
}
// ---------- photos et fichiers (notes de classe) ----------
export const FILE_DAYS = 7;
const MAX_MB = 15;
export const pendingFiles = {}; // zone → [{ blob, name, type, size, url }]
export const fsize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko');
function filesHtml(zone) {
  const l = pendingFiles[zone] || [];
  if (!l.length) return '';
  return `<div class="row wrap" style="gap:8px">${l.map((f, i) => `<span class="pill" style="background:var(--hi);font-size:13px;padding:6px 6px 6px 10px">${f.type.startsWith('image/') ? `<img src="${f.url}" alt="" style="width:28px;height:28px;object-fit:cover;border-radius:6px">` : ic('clip', 16)}<span data-notr dir="auto">${esc(f.name)}</span><button type="button" class="ib sm" style="width:28px;height:28px" data-act="file-rm" data-zone="${zone}" data-i="${i}" aria-label="Retirer ${esc(f.name)}">${ic('x', 14)}</button></span>`).join('')}</div>`;
}
const paintFiles = (zone) => { const z = document.getElementById(zone + '-files'); if (z) z.innerHTML = filesHtml(zone); };
async function shrinkImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch { return file; }
}
ACT['file-pick'] = (el) => document.getElementById(el.dataset.zone + '-f').click();
ACT['file-rm'] = (el) => { pendingFiles[el.dataset.zone].splice(+el.dataset.i, 1); paintFiles(el.dataset.zone); };
CHANGE['file-add'] = async (el) => {
  const zone = el.dataset.zone;
  const l = (pendingFiles[zone] = pendingFiles[zone] || []);
  for (const f of el.files) {
    if (l.length >= 5) { toast('5 pièces jointes maximum'); break; }
    if (f.size > MAX_MB * 1048576) { toast(`Fichier trop lourd (${MAX_MB} Mo maximum)`); continue; }
    const img = f.type.startsWith('image/');
    const blob = img ? await shrinkImage(f) : f;
    const name = img && blob !== f ? f.name.replace(/\.[^.]+$/, '') + '.jpg' : f.name;
    l.push({ blob, name, type: blob.type || f.type || 'application/octet-stream', size: blob.size, url: URL.createObjectURL(blob) });
  }
  el.value = '';
  paintFiles(zone);
};
export async function takeFiles(zone) {
  const l = pendingFiles[zone] || [];
  const until = new Date(Date.now() + FILE_DAYS * 864e5).toISOString();
  const out = [];
  for (const f of l) { const id = uid(); await putAudio(id, f.blob); out.push({ id, name: f.name, type: f.type, size: f.size, until }); }
  delete pendingFiles[zone];
  return out;
}
export function composer(form, zone, attrs = '', placeholder = 'Écrire une note…', withFiles = false) {
  return `<form class="composer" data-form="${form}" ${attrs}>
  <label class="sr" for="${zone}-t">Note</label>
  <textarea id="${zone}-t" name="text" class="inp" placeholder="${esc(placeholder)}"></textarea>
  <div id="${zone}">${zoneHtml(zone)}</div>
  ${withFiles ? `<div id="${zone}-files">${filesHtml(zone)}</div><input id="${zone}-f" type="file" multiple class="sr" accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.txt" data-change="file-add" data-zone="${zone}" tabindex="-1">` : ''}
  <div class="row wrap"><button type="button" class="btn2 sm mic" data-act="rec" data-zone="${zone}">${ic('mic', 20)}Vocal</button>${withFiles ? `<button type="button" class="btn2 sm" data-act="file-pick" data-zone="${zone}">${ic('clip', 20)}Photo / fichier</button>` : ''}<span class="grow"></span><button class="btn sm">${ic('send', 18)}Envoyer</button></div>
  </form>`;
}
export function msgHtml(m, delAct) {
  const audio = m.audioId ? `<audio controls preload="none" data-audio="${m.audioId}"></audio>` : '';
  const del = delAct ? `<button type="button" class="ib sm" data-act="${delAct}" data-id="${m.id}" aria-label="Supprimer la note">${ic('trash', 16)}</button>` : '';
  const files = (m.files || []).length ? `<div class="col" style="gap:8px">${m.files.map((f) => f.type.startsWith('image/')
    ? `<a data-blob-href="${f.id}" target="_blank" rel="noopener" aria-label="Ouvrir la photo"><img data-blob="${f.id}" alt="${esc(f.name)}" style="display:block;max-width:100%;max-height:320px;border-radius:10px;border:2px solid var(--ink)"></a>`
    : `<a class="btn2 sm" data-blob-href="${f.id}" download="${esc(f.name)}" style="align-self:flex-start;white-space:normal;text-align:start">${ic('clip', 18)}<span data-notr dir="auto">${esc(f.name)}</span> <span class="tiny mut">(${fsize(f.size)})</span></a>`).join('')}
    <span class="tiny mut b">Pièces jointes disponibles jusqu’au ${fdate(m.files[0].until)}</span></div>` : '';
  return `<div class="msg"><div class="meta"><span>${esc(fdate(m.at, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${ftime(m.at)}</span>${del}</div>${m.text ? `<div class="txt" data-notr dir="auto">${esc(m.text)}</div>` : ''}${audio}${files}</div>`;
}
