// Espace comptabilité : une application à part, pensée pour le trésorier / comptable de l'association.
// Accessible au compte « Comptabilité » et aux administrateurs. Pas de classes ni d'élèves ici : que la trésorerie.
import * as d from './data.js';
import { locale } from './i18n.js';
import { ACT, esc, ic, av, pill, fdate, toast, openModal, todayISO, hero, band, bands, brandLogo } from './ui.js';
import { eur, monthLabel, entryForm, entryList, teacherRows, PAY, cotisB } from './gestion.js';
import { myContactCard } from './contact.js';
import { comptaPending } from './demandes.js';

const NAV = [['bord', 'pie', 'Tableau de bord'], ['journal', 'list', 'Journal'], ['recettes', 'plus', 'Recettes'], ['depenses', 'note', 'Dépenses'], ['cotisations', 'users', 'Cotisations'], ['enseignants', 'clock', 'Enseignants'], ['rapports', 'sheet', 'Rapports'], ['compte', 'gear', 'Mon compte']];
const MOB = ['bord', 'journal', 'recettes', 'depenses', 'plus'];
export function comptaShell(u, active, body) {
  const link = (k, i, l, cls) => `<a class="${cls} ${k === active ? 'on' : ''}" href="#/compta/${k}">${ic(i, 20)}${l}</a>`;
  return `<div class="shell compta"><nav class="side" aria-label="Comptabilité">
  <div class="row" style="padding:0 6px 16px">${brandLogo(44)}<span class="b" style="font-size:19px">Comptabilité</span></div>
  ${NAV.map(([k, i, l]) => link(k, i, l, 'nav')).join('')}
  ${d.isAdmin(u) ? `<a class="sub" href="#/admin" style="margin-top:10px">${ic('back', 16)}Retour à la direction</a>` : ''}
  <span class="grow"></span><div class="row" style="padding:8px 6px">${av(u.name.split(' ').map((w) => w[0]).join('').slice(0, 2), 40, 'var(--mint)', 13)}<div class="grow"><div class="b small">${esc(u.name)}</div><div class="tiny mut b">${d.roleLabel(u)}</div></div><button class="ib sm" data-act="logout" aria-label="Se déconnecter">${ic('out', 16)}</button></div>
  </nav><main class="main"><header class="ihead">${brandLogo(44)}<span class="col grow" style="gap:0;min-width:0"><span class="tiny b mut" style="letter-spacing:1.2px">ESPACE ÉQUIPE</span><span class="b" style="font-size:17px;line-height:1.1">Comptabilité</span></span><button class="ib" data-act="lang" aria-label="Langue">${ic('globe', 18)}</button><a class="who" href="#/compta/compte" style="background:var(--mint)" aria-label="${esc(u.name)}">${esc(u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</a></header>${body}</main>
  <nav class="tabbar" aria-label="Comptabilité">${MOB.map((k) => { const [, i, l] = k === 'plus' ? ['plus', 'grid', 'Plus'] : NAV.find((x) => x[0] === k); return `<a class="${k === active || (k === 'plus' && !MOB.includes(active)) ? 'on' : ''}" href="#/compta/${k}"><span>${ic(i, 22)}</span>${l === 'Tableau de bord' ? 'Bord' : l}</a>`; }).join('')}</nav></div>`;
}
const top = (title, sub, right = '') => `<div class="top"><div class="grow">${sub ? `<div class="small mut b">${sub}</div>` : ''}<h1>${title}</h1></div>${right}</div>`;
function monthNav(page, m, months) {
  const i = months.indexOf(m);
  const prev = i < months.length - 1 ? months[i + 1] : null, next = i > 0 ? months[i - 1] : null;
  return `<div class="q-month">${prev ? `<a class="ib sm" href="#/compta/${page}?m=${prev}" aria-label="Mois précédent">${ic('back', 18)}</a>` : '<span class="ib sm" style="visibility:hidden"></span>'}<span class="b">${monthLabel(m)}${m === d.curMonth() ? ' <span class="mut" style="font-weight:400">· en cours</span>' : ''}</span>${next ? `<a class="ib sm" href="#/compta/${page}?m=${next}" aria-label="Mois suivant">${ic('chev', 18)}</a>` : '<span class="ib sm" style="visibility:hidden"></span>'}</div>`;
}
const kpi = (label, value, bg, sub = '') => `<div class="ck pad col" style="gap:4px;background:${bg}"><span class="small b">${label}</span><span class="kpi">${value}</span>${sub ? `<span class="tiny b">${sub}</span>` : ''}</div>`;
const sign = (n) => `${n >= 0 ? '▲' : '▼'} ${eur(Math.abs(n))}`;
// barres horizontales (répartition par catégorie)
function bars(items, color) {
  const max = Math.max(1, ...items.map((x) => x.total));
  return items.length ? `<div class="col" style="gap:8px">${items.sort((a, b) => b.total - a.total).map((x) => `<div class="col" style="gap:3px"><div class="row between small b"><span>${esc(x.l)}</span><span>${eur(x.total)}</span></div><div class="hbar"><span style="width:${Math.max(2, (x.total / max) * 100)}%;background:${color}"></span></div></div>`).join('')}</div>` : '<p class="small mut">Rien ce mois-ci.</p>';
}
// histogramme 12 mois : recettes / dépenses
function chart(months) {
  const data = months.map((m) => ({ m, r: d.incomeTotal(m), e: d.monthExpenses(m).total }));
  const max = Math.max(1, ...data.flatMap((x) => [x.r, x.e]));
  const W = 640, H = 200, bw = W / data.length;
  const bar = (x, v, c) => { const h = (v / max) * (H - 30); return `<rect x="${x}" y="${H - 20 - h}" width="${bw * 0.32}" height="${h}" rx="3" fill="${c}"><title>${eur(v)}</title></rect>`; };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recettes et dépenses des derniers mois" style="width:100%;height:auto">${data.map((x, i) => `${bar(i * bw + bw * 0.14, x.r, '#2BB673')}${bar(i * bw + bw * 0.5, x.e, '#FF5A5F')}<text x="${i * bw + bw / 2}" y="${H - 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#3D4E85">${new Date(x.m + '-15').toLocaleDateString(locale, { month: 'short' })}</text>`).join('')}</svg>
  <div class="row small b" style="gap:16px"><span><span class="dot" style="background:#2BB673"></span> Recettes</span><span><span class="dot" style="background:#FF5A5F"></span> Dépenses</span></div>`;
}
function lastMonths(n) { const out = []; let [y, mm] = d.curMonth().split('-').map(Number); for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(mm).padStart(2, '0')}`); mm--; if (!mm) { mm = 12; y--; } } return out; }
// toutes les opérations d'un mois (recettes, dépenses, enseignants)
function ops(m) {
  const out = [];
  for (const x of d.incomesOf(m)) out.push({ id: x.id, del: 'inc-del', date: x.monthly ? m + '-01' : x.date, type: 'R', cat: d.catLabel(d.INCOME_CATS, x.cat), label: x.label, amount: +x.amount || 0, monthly: x.monthly });
  for (const x of d.expensesOf(m)) out.push({ id: x.id, del: 'exp-del', date: x.monthly ? m + '-01' : x.date, type: 'D', cat: d.catLabel(d.EXPENSE_CATS, x.cat), label: x.label, amount: +x.amount || 0, monthly: x.monthly });
  for (const p of d.staff(m)) { const c = d.profCost(p, m); if (c) out.push({ date: m + '-28', type: 'D', cat: 'Enseignants de l’école', label: `${p.name} · ${d.fmtH(d.profHours(p.id, m).min)}`, amount: c, auto: true }); }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
function csv(name, rows) {
  const line = (a) => a.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(line).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click();
}
ACT['compta-csv'] = (el) => {
  const ms = el.dataset.y ? lastMonthsOfYear(el.dataset.y) : [el.dataset.m];
  const rows = [['Date', 'Type', 'Catégorie', 'Intitulé', 'Montant (€)']];
  for (const m of ms) for (const o of ops(m).reverse()) rows.push([o.date, o.type === 'R' ? 'Recette' : 'Dépense', o.cat, o.label || '', (o.type === 'R' ? '' : '-') + o.amount.toFixed(2).replace('.', ',')]);
  csv(`comptabilite-${el.dataset.y || el.dataset.m}.csv`, rows);
};
const lastMonthsOfYear = (y) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`).filter((m) => m <= d.curMonth());
ACT['compta-add'] = (el) => {
  const kind = el.dataset.k, m = el.dataset.m;
  openModal(() => `<div class="row between"><h2>${kind === 'inc' ? 'Nouvelle recette' : 'Nouvelle dépense'}</h2><button class="ib" data-act="close-modal" aria-label="Fermer">${ic('x', 20)}</button></div>${entryForm(kind, m, kind === 'inc' ? d.INCOME_CATS : d.EXPENSE_CATS)}`);
};
const addBtns = (m) => `<button class="btn sm" data-act="compta-add" data-k="inc" data-m="${m}">${ic('plus', 18)}Recette</button><button class="btn2 sm" data-act="compta-add" data-k="exp" data-m="${m}">${ic('plus', 18)}Dépense</button>`;

export function view(u, page, q) {
  const months = d.financeMonths();
  const m = months.includes(q.get('m')) ? q.get('m') : d.curMonth();
  const P = { bord, journal, recettes, depenses, cotisations, enseignants, rapports, compte, plus }[page] || bord;
  return comptaShell(u, page, `<div class="page">${P(u, m, months, q)}</div>`);
}
function bord(u, m, months, q) {
  const s = d.financeSummary();
  const r = d.incomeTotal(m), e = d.monthExpenses(m);
  const c = d.cotisations();
  const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0;
  const unpaid = d.D().families.filter((f) => f.status !== 'paid' && f.cotisation).length;
  const noEnd = d.staff(m).reduce((t, p) => t + d.profHours(p.id, m).missing, 0);
  const expCats = d.byCat(d.expensesOf(m), d.EXPENSE_CATS).concat(e.profs ? [{ l: 'Enseignants de l’école', total: e.profs }] : []);
  const t = (q && q.get('t')) || 'all';
  const all = ops(m), list = all.filter((o) => t === 'all' || (t === 'rec' ? o.type === 'R' : o.type === 'D')).slice(0, 8);
  const mn = monthLabel(m).split(' ')[0];
  const [ent, cts] = qSplit(s.solde);
  const six = lastMonths(6).map((x) => ({ m: x, r: d.incomeTotal(x), e: d.monthExpenses(x).total }));
  const mx = Math.max(1, ...six.flatMap((x) => [x.r, x.e]));
  const h = (v) => Math.max(2, Math.round((v / mx) * 100));
  return `<div class="qd-h"><div class="grow"><div class="qd-sub">Comptabilité · ${monthLabel(m)}</div><h1>Vue d’ensemble</h1></div><button class="btn2 sm" data-act="compta-csv" data-m="${m}">${ic('dl', 16)}Exporter</button></div>
  ${monthNav('bord', m, months)}
  <div class="q-row2">
    <div class="q-dark" style="width:380px;flex:none;box-sizing:border-box;max-width:100%"><span class="q-l">Solde · Compte de l’association</span><span class="q-money">${s.solde < 0 ? '−' : ''}${ent}<span class="c">${cts}</span></span>
      <span class="q-sep"></span>
      <div class="q-kv"><span>Entrées · ${mn}</span><span class="q-amt" style="color:#7FE3B5">+ ${eur(r)}</span></div>
      <div class="q-kv"><span>Sorties · ${mn}</span><span class="q-amt">− ${eur(e.total)}</span></div>
      <div class="row wrap" style="gap:8px;margin-top:14px"><button class="q-btn-w" data-act="compta-add" data-k="inc" data-m="${m}">${ic('plus', 17)}Recette</button><button class="q-btn-g" data-act="compta-add" data-k="exp" data-m="${m}" style="background:none">${ic('plus', 17)}Dépense</button></div></div>
    <div class="q-card q-chart"><div class="row between wrap"><span class="b" style="font-size:16px">Entrées et sorties · 6 mois</span><span class="q-leg"><span><i></i>Entrées</span><span><i class="g"></i>Sorties</span></span></div>
      <div class="q-bars" role="img" aria-label="Entrées et sorties des 6 derniers mois">${six.map((x) => `<span><span class="q-bb"><i style="height:${h(x.r)}%" title="Entrées ${eur(x.r)}"></i><i style="height:${h(x.e)}%" title="Sorties ${eur(x.e)}"></i></span><small>${new Date(x.m + '-15').toLocaleDateString(locale, { month: 'short' })}</small></span>`).join('')}</div></div>
  </div>
  ${comptaPending()}
  <div class="row between wrap" style="align-items:flex-end;gap:12px"><h2 style="margin:0">Opérations</h2><nav class="q-tabs">${[['all', 'Tout'], ['rec', 'Entrées'], ['dep', 'Sorties']].map(([k, l]) => `<a href="#/compta/bord?m=${m}&t=${k}" class="${t === k ? 'on' : ''}">${l}</a>`).join('')}</nav></div>
  <div class="q-card q-pad">${qOps(list)}<div style="padding:12px 0;border-top:1px solid var(--q-hair)"><a class="small b" href="#/compta/journal?m=${m}">Tout le journal (${all.length})</a></div></div>
  <div class="grid2 stack" style="align-items:start">
    <a class="q-card col" href="#/compta/cotisations" style="padding:20px 24px;text-decoration:none;color:var(--ink);gap:10px"><div class="row between"><span class="b" style="font-size:16px">Cotisations de l’école</span>${ic('chev', 18)}</div><div class="row between"><span class="q-amt">${eur(c.real)} encaissés</span><span class="mut small">sur ${eur(c.theo)}</span></div><span class="q-bar"><i style="width:${pct}%"></i></span><span class="small mut">${pct} % · reste ${eur(c.rest)}${unpaid ? ` · ${unpaid} famille(s) à relancer` : ''}</span></a>
    <div class="q-card col" style="padding:20px 24px;gap:0"><span class="b" style="font-size:16px;padding-bottom:6px">À vérifier</span>
      ${unpaid ? `<a class="q-lrow" href="#/compta/cotisations?s=todo" style="text-decoration:none;color:var(--ink)"><span class="q-st warn"></span><span class="t"><b>${unpaid} famille(s) n’ont pas tout payé</b></span>${ic('chev', 18)}</a>` : ''}
      ${noEnd ? `<a class="q-lrow" href="#/compta/enseignants?m=${m}" style="text-decoration:none;color:var(--ink)"><span class="q-st warn"></span><span class="t"><b>${noEnd} cours sans heure de fin</b><span>heures non comptées</span></span>${ic('chev', 18)}</a>` : ''}
      ${!d.incomesOf(m).length ? `<div class="q-lrow"><span class="q-st neu"></span><span class="t"><b>Aucune recette saisie ce mois-ci</b><span>quêtes, dons…</span></span></div>` : ''}
      ${!unpaid && !noEnd && d.incomesOf(m).length ? '<div class="q-lrow"><span class="q-st ok">Tout est en ordre</span></div>' : ''}</div>
  </div>
  <div class="grid2 stack" style="align-items:start">
    <div class="q-card col" style="padding:20px 24px"><div class="row between"><span class="b" style="font-size:16px">Sorties du mois</span><a class="small b" href="#/compta/depenses?m=${m}">Détail</a></div>${bars(expCats, '#050505')}</div>
    <div class="q-card col" style="padding:20px 24px"><div class="row between"><span class="b" style="font-size:16px">Entrées du mois</span><a class="small b" href="#/compta/recettes?m=${m}">Détail</a></div>${bars(d.byCat(d.incomesOf(m), d.INCOME_CATS), '#0A7F4F')}</div>
  </div>`;
}
// montant découpé « 4 812 » + « ,40 € » pour la grande carte
function qSplit(n) { const t = eur(Math.abs(n)); const i = t.search(/[,.]\d\d/); return i > 0 ? [t.slice(0, i), t.slice(i)] : [t, '']; }
const PAL = ['q-p0', 'q-p1', 'q-p2', 'q-p3'];
const pal = (s) => PAL[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4];
const ini = (s) => String(s || '?').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';
function qOps(list, withDel = false, noCat = false) {
  if (!list.length) return '<p class="small mut" style="padding:16px 0">Aucune opération.</p>';
  return `<div style="overflow-x:auto"><table class="q-tbl"><thead><tr><th>Date</th><th>Intitulé</th>${noCat ? '' : '<th class="hm">Catégorie</th>'}<th class="r">Montant</th>${withDel ? '<th></th>' : ''}</tr></thead><tbody>
  ${list.map((o) => `<tr class="op" data-q="${esc((o.cat + ' ' + (o.label || '')).toLowerCase())}"><td class="mut" style="white-space:nowrap">${o.monthly ? 'mensuel' : fdate(o.date, { day: 'numeric', month: 'short' })}</td><td><span class="q-who"><span class="q-av ${pal(o.cat)}">${ini(o.label || o.cat)}</span><span>${esc(o.label || o.cat)}${o.auto ? ' <span class="small mut">· auto</span>' : ''}</span></span></td>${noCat ? '' : `<td class="hm mut">${esc(o.cat)}</td>`}<td class="r"><span class="q-amt ${o.type === 'R' ? 'pos' : ''}">${o.type === 'R' ? '+' : '−'} ${eur(o.amount)}</span></td>${withDel ? `<td class="r" style="width:44px">${o.del ? `<button class="ib sm" data-act="${o.del}" data-id="${o.id}" aria-label="Supprimer">${ic('trash', 14)}</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function opsTable(list, withDel = false) {
  if (!list.length) return '<p class="small mut">Aucune opération.</p>';
  return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Date</th><th>Catégorie</th><th>Intitulé</th><th style="text-align:end">Montant</th>${withDel ? '<th></th>' : ''}</tr></thead><tbody>
  ${list.map((o) => `<tr class="op" data-q="${esc((o.cat + ' ' + (o.label || '')).toLowerCase())}"><td>${o.monthly ? 'mensuel' : fdate(o.date, { day: 'numeric', month: 'short' })}</td><td>${esc(o.cat)}</td><td>${esc(o.label || '—')}${o.auto ? ' ' + pill('auto', 'var(--neutral)') : ''}</td><td style="text-align:end;white-space:nowrap" class="b ${o.type === 'R' ? 'pos' : 'neg'}">${o.type === 'R' ? '+' : '−'} ${eur(o.amount)}</td>${withDel ? `<td>${o.del ? `<button class="ib sm" data-act="${o.del}" data-id="${o.id}" aria-label="Supprimer">${ic('trash', 14)}</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function journal(u, m, months, q) {
  const t = q.get('t') || 'all';
  const all = ops(m);
  const list = all.filter((o) => t === 'all' || (t === 'rec' ? o.type === 'R' : o.type === 'D'));
  const tr = all.filter((o) => o.type === 'R').reduce((a, o) => a + o.amount, 0), td = all.filter((o) => o.type === 'D').reduce((a, o) => a + o.amount, 0);
  return `<div class="qd-h"><div class="grow"><h1>Journal</h1><div class="qd-sub">${monthLabel(m)} · ${all.length} opération(s)</div></div><button class="btn2 sm" data-act="compta-csv" data-m="${m}">${ic('dl', 16)}Exporter (Excel)</button><span class="row" style="gap:8px">${addBtns(m)}</span></div>
  ${monthNav('journal', m, months)}
  <div class="q-card q-stats" style="grid-template-columns:repeat(3,1fr)"><div><b style="color:var(--q-pos)">+ ${eur(tr)}</b><span>entrées</span></div><div><b>− ${eur(td)}</b><span>sorties</span></div><div><b>${tr - td >= 0 ? '+' : '−'} ${eur(Math.abs(tr - td))}</b><span>résultat du mois</span></div></div>
  <div class="row wrap" style="gap:12px;align-items:center"><label class="q-search">${ic('search', 18)}<span class="sr">Rechercher</span><input id="jq" placeholder="Rechercher une opération…" data-filter=".op"></label><nav class="q-tabs" style="border:0">${[['all', 'Tout'], ['rec', 'Entrées'], ['dep', 'Sorties']].map(([k, l]) => `<a href="#/compta/journal?m=${m}&t=${k}" class="${t === k ? 'on' : ''}">${l}</a>`).join('')}</nav></div>
  <div class="q-card q-pad">${qOps(list, true)}</div>
  <p class="small mut">« auto » : calculé à partir des heures des enseignants. Les lignes mensuelles (loyer, électricité…) apparaissent chaque mois.</p>`;
}
function saisie(kind, u, m, months) {
  const inc = kind === 'inc';
  const list = ops(m).filter((o) => o.type === (inc ? 'R' : 'D'));
  const tot = list.reduce((t, o) => t + o.amount, 0);
  const e = d.monthExpenses(m);
  const page = inc ? 'recettes' : 'depenses';
  return `<div class="qd-h"><div class="grow"><h1>${inc ? 'Recettes' : 'Dépenses'}</h1><div class="qd-sub">${monthLabel(m)} · <span class="q-amt">${eur(tot)}</span>${inc ? '' : ` · dont <span class="q-amt">${eur(e.profs)}</span> enseignants`}</div></div><button class="btn sm" data-act="compta-add" data-k="${kind}" data-m="${m}">${ic('plus', 18)}${inc ? 'Nouvelle recette' : 'Nouvelle dépense'}</button></div>
  ${monthNav(page, m, months)}
  <div class="q-split"><div class="q-main q-card q-pad">${qOps(list, true, true)}</div>
  <aside class="q-card q-drawer q-entry-aside" aria-label="${inc ? 'Nouvelle recette' : 'Nouvelle dépense'}"><span class="b" style="font-size:18px">${inc ? 'Nouvelle recette' : 'Nouvelle dépense'}</span>
    <div class="segq"><a href="#/compta/recettes?m=${m}" class="${inc ? 'on' : ''}">Recette</a><a href="#/compta/depenses?m=${m}" class="${inc ? '' : 'on'}">Dépense</a></div>
    ${entryForm(kind, m, inc ? d.INCOME_CATS : d.EXPENSE_CATS)}</aside></div>
  <p class="small mut">${inc ? 'Dons, quêtes, zakat, cotisations…' : 'Loyer, énergie, entretien, fournitures… La ligne « Enseignants » est calculée à partir des heures (page Enseignants).'} Les lignes « mensuel » apparaissent chaque mois.</p>`;
}
const recettes = (u, m, months) => saisie('inc', u, m, months);
const depenses = (u, m, months) => saisie('exp', u, m, months);
function cotisations(u, m, months, q) {
  const F = d.D().families.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return `<div class="qd-h"><div class="grow"><div class="qd-sub">${F.length} famille(s)</div><h1>Cotisations de l’école</h1></div></div>
  ${comptaPending(true)}
  ${F.length ? cotisB(F) : '<p class="mut">Aucune famille.</p>'}
  <p class="small mut">Touchez « Paiement » ou « Payé » pour enregistrer un paiement. Les familles sont créées par l’école (Élèves → Familles &amp; cotisations).</p>`;
}
function enseignants(u, m, months) {
  const P = d.staff(m);
  const PALQ = ['q-p0', 'q-p1', 'q-p2', 'q-p3'];
  const H = P.map((p) => ({ p, h: d.profHours(p.id, m), cost: d.profCost(p, m) }));
  const tmin = H.reduce((t, x) => t + x.h.min, 0), miss = H.reduce((t, x) => t + x.h.missing, 0);
  return `<div class="qd-h"><div class="grow"><h1>Enseignants</h1><div class="qd-sub">${monthLabel(m)} · heures comptées depuis les appels</div></div></div>
  ${monthNav('enseignants', m, months)}
  <div class="q-card q-stats"><div><b>${eur(d.monthExpenses(m).profs)}</b><span>à verser ce mois</span></div><div><b>${d.fmtH(tmin)}</b><span>heures du mois</span></div><div><b>${P.length}</b><span>enseignant(s)</span></div><div><b style="${miss ? 'color:var(--q-warn)' : ''}">${miss}</b><span>cours sans heure de fin</span></div></div>
  <div class="q-card q-pad">${H.length ? `<div style="overflow-x:auto"><table class="q-tbl"><thead><tr><th>Enseignant</th><th class="hm">Cours</th><th>Heures</th><th class="hm">Taux</th><th class="r">Montant</th><th></th></tr></thead><tbody>
  ${H.map(({ p, h, cost }, k) => `<tr data-act="hours-detail" data-id="${p.id}" data-m="${m}"><td><span class="q-who"><span class="q-av ${PALQ[k % 4]}">${esc(p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</span><span>${esc(p.name)}${p.role === 'admin' ? ' <span class="mut small">· admin</span>' : ''}</span></span></td><td class="hm mut">${h.n}${h.missing ? ` <span style="color:var(--q-warn)">· ${h.missing} sans fin</span>` : ''}</td><td><span class="q-amt" style="font-weight:400">${d.fmtH(h.min)}</span></td><td class="hm mut">${p.benevole ? 'Bénévole' : `<span class="q-amt" style="font-weight:400">${eur(d.profRate(p))}/h</span>`}</td><td class="r"><span class="q-amt">${eur(cost)}</span></td><td class="r" style="width:30px">${ic('chev', 16)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small mut" style="padding:16px 0">Aucun enseignant.</p>'}</div>
  <div class="q-card col q-rates" style="padding:20px 24px;gap:12px"><span class="b" style="font-size:16px">Taux et montants</span>${teacherRows(m)}</div>`;
}
function rapports(u, m, months, q) {
  const years = [...new Set(months.map((x) => x.slice(0, 4)))];
  const y = years.includes(q.get('y')) ? q.get('y') : d.curMonth().slice(0, 4);
  const ms = lastMonthsOfYear(y);
  const inc = {}, exp = {};
  let prof = 0;
  for (const mm of ms) {
    for (const x of d.byCat(d.incomesOf(mm), d.INCOME_CATS)) inc[x.l] = (inc[x.l] || 0) + x.total;
    for (const x of d.byCat(d.expensesOf(mm), d.EXPENSE_CATS)) exp[x.l] = (exp[x.l] || 0) + x.total;
    prof += d.monthExpenses(mm).profs;
  }
  if (prof) exp['Enseignants de l’école'] = prof;
  const c = d.cotisations();
  if (c.real) inc['Cotisations de l’école (encaissées)'] = c.real;
  const ti = Object.values(inc).reduce((a, b) => a + b, 0), te = Object.values(exp).reduce((a, b) => a + b, 0);
  const catCard = (title, o, col) => { const E = Object.entries(o).sort((a, b) => b[1] - a[1]); const mx = Math.max(1, ...E.map((x) => x[1])); const tot = E.reduce((t, x) => t + x[1], 0);
    return `<div class="q-card col" style="padding:20px 24px;gap:12px;flex:1;min-width:0"><div class="row between"><span class="b" style="font-size:16px">${title}</span><span class="q-amt">${eur(tot)}</span></div>${E.map(([l, v]) => `<div class="col" style="gap:6px"><div class="row between small" style="gap:10px"><span>${esc(l)}</span><span class="q-amt">${eur(v)} <span class="mut" style="font-weight:400">· ${tot ? Math.round((v / tot) * 100) : 0} %</span></span></div><span class="q-bar"><i style="width:${Math.max(2, (v / mx) * 100)}%;background:${col}"></i></span></div>`).join('') || '<p class="small mut">—</p>'}</div>`; };
  const all = ms.map((mm) => ({ m: mm, r: d.incomeTotal(mm), e: d.monthExpenses(mm).total }));
  const f0 = all.findIndex((x) => x.r || x.e);
  const data = f0 < 0 ? all.slice(-1) : all.slice(f0);
  const mx = Math.max(1, ...data.flatMap((x) => [x.r, x.e]));
  const hh = (v) => Math.max(2, Math.round((v / mx) * 100));
  const sg = (n) => `${n >= 0 ? '+' : '−'} ${eur(Math.abs(n))}`;
  return `<div class="qd-h"><div class="grow"><h1>Rapports</h1><div class="qd-sub">Année ${y} · compte de résultat simplifié pour l’assemblée générale</div></div>
  <nav class="q-tabs" style="border:0">${years.map((x) => `<a href="#/compta/rapports?y=${x}" class="${x === y ? 'on' : ''}">${x}</a>`).join('')}</nav><button class="btn2 sm" data-act="print">${ic('note', 16)}Imprimer</button><button class="btn sm" data-act="compta-csv" data-y="${y}">${ic('dl', 16)}Exporter (Excel)</button></div>
  <div class="q-card q-stats"><div><b style="color:var(--q-pos)">${eur(ti)}</b><span>recettes</span></div><div><b>${eur(te)}</b><span>dépenses</span></div><div><b>${sg(ti - te)}</b><span>résultat ${y}</span></div><div><b>${eur(d.financeSummary().solde)}</b><span>solde actuel</span></div></div>
  <div class="q-row2" style="align-items:flex-start">${catCard('Recettes par catégorie', inc, '#050505')}${catCard('Dépenses par catégorie', exp, '#8A8A86')}</div>
  <div class="q-card q-chart"><div class="row between wrap"><span class="b" style="font-size:16px">Évolution sur l’année</span><span class="q-leg"><span><i></i>Recettes</span><span><i class="g"></i>Dépenses</span></span></div>
    <div class="q-bars" role="img" aria-label="Recettes et dépenses par mois">${data.map((x) => `<span><span class="q-bb"><i style="height:${hh(x.r)}%" title="Recettes ${eur(x.r)}"></i><i style="height:${hh(x.e)}%" title="Dépenses ${eur(x.e)}"></i></span><small>${new Date(x.m + '-15').toLocaleDateString(locale, { month: 'short' })}</small></span>`).join('')}</div></div>
  <div class="q-card q-pad"><div class="q-sec"><b>Mois par mois</b></div><div style="overflow-x:auto"><table class="q-tbl q-tbl-static"><thead><tr><th>Mois</th><th class="r">Recettes</th><th class="r">Dépenses</th><th class="r">Résultat</th></tr></thead><tbody>
  ${data.slice().reverse().map((x) => `<tr><td><a href="#/compta/journal?m=${x.m}" style="color:inherit">${monthLabel(x.m)}</a></td><td class="r"><span class="q-amt pos">${eur(x.r)}</span></td><td class="r"><span class="q-amt">${eur(x.e)}</span></td><td class="r"><span class="q-amt">${sg(x.r - x.e)}</span></td></tr>`).join('')}
  <tr><td class="b">Total ${y}</td><td class="r"><span class="q-amt pos" style="font-weight:600">${eur(ti)}</span></td><td class="r"><span class="q-amt" style="font-weight:600">${eur(te)}</span></td><td class="r"><span class="q-amt" style="font-weight:600">${sg(ti - te)}</span></td></tr></tbody></table></div></div>
  <p class="small mut">Les cotisations de l’école sont annuelles : elles comptent dans le total, pas dans les mois.</p>`;
}
ACT.print = () => window.print();
const MBG = ['var(--mint)', 'var(--blue2)', 'var(--yellow)', 'var(--pink)', 'var(--mint)', 'var(--blue2)', 'var(--yellow)'];
const menuBands = (arr) => bands(arr.map(([h, i, l, act], k) => act
  ? `<button type="button" class="bd" data-act="${act}" style="--rot:0deg;background:${MBG[k % 7]};width:100%;font:inherit;text-align:start;cursor:pointer;color:var(--ink)"><span class="bd-ic">${ic(i, 18)}</span><span class="bd-t grow">${l}</span>${ic('chev', 18)}</button>`
  : `<a class="bd" href="${h}" style="--rot:0deg;background:${MBG[k % 7]}"><span class="bd-ic">${ic(i, 18)}</span><span class="bd-t grow">${l}</span>${ic('chev', 18)}</a>`));
function compte(u) {
  return `${top('Mon compte', '')}
  ${hero(d.roleLabel(u), esc(u.name), { sub: `Identifiant : ${esc(u.login)}`, chip: esc(u.name.split(' ').map((w) => w[0]).join('').slice(0, 2)), shadow: 'var(--mint)' })}
  ${myContactCard(u)}
  <h2 class="sec-t">Compte</h2>
  ${menuBands([['#/prof/annuaire', 'users', 'Annuaire de l’équipe'], ['#/mdp', 'key', 'Changer mon mot de passe'], ['', 'globe', 'Langue : français / العربية', 'lang']])}
  <button class="btn2 full" data-act="logout">${ic('out', 20)}Se déconnecter</button>`;
}
function plus(u) {
  return `${top('Comptabilité', '')}${menuBands([...NAV.filter(([k]) => !MOB.includes(k)).map(([k, i, l]) => [`#/compta/${k}`, i, l]), ...(d.isAdmin(u) ? [['#/admin', 'back', 'Retour à la direction']] : [])])}`;
}
