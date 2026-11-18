// Relit la page Mawaqit officielle de la mosquée (lien dans mosquee.json) et écrit data/mawaqit.json.
// Lancé chaque jour par GitHub Actions : aucun serveur, aucune base de données.
// Mawaqit place toutes les infos de la page dans une variable « confData » : on la reprend telle quelle.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const cfg = JSON.parse(await readFile(new URL('../mosquee.json', import.meta.url), 'utf8'));
if (!cfg.mawaqit) { console.log('Pas de lien Mawaqit dans mosquee.json'); process.exit(0); }
const res = await fetch(cfg.mawaqit, { headers: { 'User-Agent': 'Mozilla/5.0 (app de la mosquee; synchro quotidienne)', 'Accept-Language': 'fr' } });
if (!res.ok) throw new Error(`Mawaqit a répondu ${res.status}`);
const html = await res.text();
const at = html.indexOf('confData');
if (at < 0) throw new Error('confData introuvable sur la page');
const start = html.indexOf('{', at);
let depth = 0, end = start, inStr = false, esc = false;
for (; end < html.length; end++) {
  const ch = html[end];
  if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
  if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) break; }
}
const c = JSON.parse(html.slice(start, end + 1));
const KEEP = ['name', 'label', 'url', 'site', 'association', 'image', 'logo', 'countryCode', 'timezone', 'latitude', 'longitude',
  'womenSpace', 'janazaPrayer', 'aidPrayer', 'childrenCourses', 'adultCourses', 'ramadanMeal', 'handicapAccessibility', 'ablutions', 'parking',
  'otherInfo', 'closed', 'paymentWebsite', 'streamUrl', 'announcements', 'events', 'aidPrayerTime', 'aidPrayerTime2', 'aidPrayerTime3',
  'jumua', 'jumua2', 'jumua3', 'jumuaAsDuhr', 'imsakNbMinBeforeFajr', 'hijriAdjustment', 'iqamaEnabled', 'times', 'shuruq', 'calendar', 'iqamaCalendar'];
const out = { source: cfg.mawaqit, updatedAt: new Date().toISOString() };
for (const k of KEEP) out[k] = c[k] ?? null;
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/mawaqit.json', import.meta.url), JSON.stringify(out));
console.log(`OK : ${out.name} · Fajr ${out.times && out.times[0]}`);
