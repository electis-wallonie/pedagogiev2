// Espace comptabilité : une application à part, pensée pour le trésorier / comptable de l'association.
// Accessible au compte « Comptabilité » et aux administrateurs. Pas de classes ni d'élèves ici : que la trésorerie.
import * as d from './data.js';
import { locale } from './i18n.js';
import { ACT, esc, ic, av, pill, fdate, toast, openModal, todayISO, hero, band, bands, brandLogo } from './ui.js';
import { eur, monthLabel, entryForm, entryList, teacherRows, PAY } from './gestion.js';
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
  return `<div class="row between ck flat" style="padding:6px"><a class="ib ${i < months.length - 1 ? '' : 'hide'}" href="#/compta/${page}?m=${months[i + 1]}" aria-label="Mois précédent">${ic('back', 20)}</a><span class="b" style="font-size:18px">${monthLabel(m)}${m === d.curMonth() ? ' · en cours' : ''}</span><a class="ib ${i > 0 ? '' : 'hide'}" href="#/compta/${page}?m=${months[i - 1]}" aria-label="Mois suivant">${ic('chev', 20)}</a></div>`;
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
const addBtns = (m) => `<button class="btn sm" data-act="compta-add" data-k="inc" data-m="${m}" style="background:var(--mint);color:var(--ink)">${ic('plus', 18)}Recette</button><button class="btn sm" data-act="compta-add" data-k="exp" data-m="${m}" style="background:var(--absent);color:var(--onabsent)">${ic('plus', 18)}Dépense</button>`;

export function view(u, page, q) {
  const months = d.financeMonths();
  const m = months.includes(q.get('m')) ? q.get('m') : d.curMonth();
  const P = { bord, journal, recettes, depenses, cotisations, enseignants, rapports, compte, plus }[page] || bord;
  return comptaShell(u, page, `<div class="page">${P(u, m, months, q)}</div>`);
}
function bord(u, m, months) {
  const s = d.financeSummary();
  const r = d.incomeTotal(m), e = d.monthExpenses(m);
  const c = d.cotisations();
  const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0;
  const unpaid = d.D().families.filter((f) => f.status !== 'paid' && f.cotisation).length;
  const noEnd = d.staff(m).reduce((t, p) => t + d.profHours(p.id, m).missing, 0);
  const expCats = d.byCat(d.expensesOf(m), d.EXPENSE_CATS).concat(e.profs ? [{ l: 'Enseignants de l’école', total: e.profs }] : []);
  const recent = ops(m).slice(0, 6);
  return `${top('Tableau de bord', `Bonjour ${esc(u.name)}`, `<div class="row wrap" style="gap:8px">${addBtns(m)}</div>`)}
  ${monthNav('bord', m, months)}
  ${hero('Solde de l’association', sign(s.solde), { sub: 'depuis le début des comptes', shadow: s.solde >= 0 ? 'var(--mint)' : 'var(--pink)' })}
  <div class="kpis">${kpi(`Recettes · ${monthLabel(m).split(' ')[0]}`, eur(r), 'var(--mint)')}${kpi(`Dépenses · ${monthLabel(m).split(' ')[0]}`, eur(e.total), 'var(--pink)')}${kpi('Résultat du mois', sign(r - e.total), r - e.total >= 0 ? 'var(--hi)' : 'var(--pink)')}</div>
  ${comptaPending()}
  <div class="ck pad col"><div class="row between wrap"><h2>${ic('pie', 20)} 12 derniers mois</h2><button class="btn2 sm" data-act="compta-csv" data-m="${m}">${ic('dl', 16)}Exporter le mois (Excel)</button></div>${chart(lastMonths(12))}</div>
  <div class="grid2 stack" style="align-items:start">
    <div class="ck pad col"><div class="row between"><h2>Dépenses du mois</h2><a class="small b" href="#/compta/depenses?m=${m}">Détail</a></div>${bars(expCats, '#FF5A5F')}</div>
    <div class="ck pad col"><div class="row between"><h2>Recettes du mois</h2><a class="small b" href="#/compta/recettes?m=${m}">Détail</a></div>${bars(d.byCat(d.incomesOf(m), d.INCOME_CATS), '#2BB673')}</div>
  </div>
  <div class="grid2 stack" style="align-items:start">
    <a class="ck pad col" href="#/compta/cotisations" style="text-decoration:none;color:var(--ink)"><div class="row between"><h2>${ic('users', 20)} Cotisations de l’école</h2>${ic('chev', 18)}</div><div class="row between b"><span>${eur(c.real)} encaissés</span><span class="mut">sur ${eur(c.theo)}</span></div><div class="prog"><span style="width:${pct}%"></span></div><span class="small b">${pct} % · reste ${eur(c.rest)}${unpaid ? ` · ${unpaid} famille(s) à relancer` : ''}</span></a>
    <div class="ck pad col"><h2>${ic('alert', 20)} À vérifier</h2>
      ${unpaid ? `<a class="li" href="#/compta/cotisations?s=todo" style="text-decoration:none;color:var(--ink)"><span class="grow b">${unpaid} famille(s) n’ont pas tout payé</span>${ic('chev', 18)}</a>` : ''}
      ${noEnd ? `<a class="li" href="#/compta/enseignants?m=${m}" style="text-decoration:none;color:var(--ink)"><span class="grow b">${noEnd} cours sans heure de fin (heures non comptées)</span>${ic('chev', 18)}</a>` : ''}
      ${!d.incomesOf(m).length ? `<div class="li"><span class="grow b">Aucune recette saisie ce mois-ci (quêtes, dons…)</span></div>` : ''}
      ${!unpaid && !noEnd && d.incomesOf(m).length ? '<p class="small mut b">Tout est en ordre.</p>' : ''}</div>
  </div>
  <div class="ck pad col"><div class="row between"><h2>${ic('list', 20)} Dernières opérations</h2><a class="small b" href="#/compta/journal?m=${m}">Tout le journal</a></div>${opsTable(recent)}</div>`;
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
  return `${top('Journal', 'Toutes les opérations du mois', `<div class="row wrap" style="gap:8px">${addBtns(m)}</div>`)}
  ${monthNav('journal', m, months)}
  ${hero('Résultat du mois', sign(tr - td), { sub: `+ ${eur(tr)} d’entrées · − ${eur(td)} de sorties`, shadow: tr - td >= 0 ? 'var(--mint)' : 'var(--pink)' })}
  <div class="row wrap" style="gap:8px"><div class="seg" style="flex:1 1 280px">${[['all', 'Tout'], ['rec', 'Recettes'], ['dep', 'Dépenses']].map(([k, l]) => `<a href="#/compta/journal?m=${m}&t=${k}" class="${t === k ? 'on' : ''}">${l}</a>`).join('')}</div><button class="btn2 sm" data-act="compta-csv" data-m="${m}">${ic('dl', 16)}Exporter (Excel)</button></div>
  <div class="field"><label class="sr" for="jq">Rechercher</label><input id="jq" class="inp" placeholder="Rechercher une opération…" data-filter=".op"></div>
  <div class="ck pad">${opsTable(list, true)}</div>
  <p class="tiny mut b">« auto » : calculé à partir des heures des enseignants. Les lignes mensuelles (loyer, électricité…) apparaissent chaque mois.</p>`;
}
function recettes(u, m, months) {
  return `${top('Recettes', 'Dons, quêtes, zakat, cotisations…')}
  ${monthNav('recettes', m, months)}
  ${hero(`Recettes · ${monthLabel(m)}`, eur(d.incomeTotal(m)), { sub: `${d.incomesOf(m).length} opération(s)`, shadow: 'var(--mint)' })}
  <div class="bcard col"><span class="w1-blob" aria-hidden="true"></span><h2>${ic('plus', 20)} Nouvelle recette</h2>${entryForm('inc', m, d.INCOME_CATS)}</div>
  <h2 class="sec-t">Ce mois-ci</h2>
  <div class="ck pad col" style="gap:0">${entryList(d.incomesOf(m), d.INCOME_CATS, 'inc-del')}</div>`;
}
function depenses(u, m, months) {
  const e = d.monthExpenses(m);
  return `${top('Dépenses', 'Loyer, énergie, entretien, personnel…')}
  ${monthNav('depenses', m, months)}
  ${hero(`Total des dépenses · ${monthLabel(m)}`, eur(e.total), { sub: `${eur(e.other)} saisies · ${eur(e.profs)} enseignants`, shadow: 'var(--pink)' })}
  <div class="bcard col"><span class="w1-blob" aria-hidden="true"></span><h2>${ic('plus', 20)} Nouvelle dépense</h2>${entryForm('exp', m, d.EXPENSE_CATS)}</div>
  <h2 class="sec-t">Ce mois-ci</h2>
  <div class="ck pad col" style="gap:0">${entryList(d.expensesOf(m), d.EXPENSE_CATS, 'exp-del')}</div>
  ${bands([band('Enseignants de l’école', { sub: 'heures × taux', right: eur(e.profs), href: `#/compta/enseignants?m=${m}`, bg: 'var(--blue2)', icon: 'clock' })])}`;
}
function cotisations(u, m, months, q) {
  const s = q.get('s') || 'all';
  const c = d.cotisations();
  const F = d.D().families.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const list = F.filter((f) => s === 'all' || (s === 'todo' ? f.status !== 'paid' && f.cotisation : f.status === s));
  const pct = c.theo ? Math.round((c.real / c.theo) * 100) : 0;
  return `${top('Cotisations de l’école', `${F.length} famille(s)`)}
  ${hero('Encaissé', eur(c.real), { sub: `sur ${eur(c.theo)} prévus · reste ${eur(c.rest)}`, chip: pct + ' %', shadow: 'var(--mint)', extra: `<div class="hero-bar"><span style="width:${pct}%"></span></div>` })}
  ${comptaPending(true)}
  <div class="seg" style="overflow-x:auto">${[['all', 'Toutes'], ['todo', 'À relancer'], ['unpaid', 'Pas payé'], ['partial', 'Partiel'], ['paid', 'Payé']].map(([k, l]) => `<a href="#/compta/cotisations?s=${k}" class="${s === k ? 'on' : ''}">${l}</a>`).join('')}</div>
  <div class="field"><label class="sr" for="cq">Rechercher</label><input id="cq" class="inp" placeholder="Rechercher une famille…" data-filter=".fr"></div>
  <div class="ck pad"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Famille</th><th>Élèves</th><th style="text-align:end">Cotisation</th><th style="text-align:end">Payé</th><th style="text-align:end">Reste</th><th>État</th></tr></thead><tbody>
  ${list.map((f) => { const [l, bg, fg] = PAY[f.status] || PAY.unpaid; const p = d.famPaid(f); return `<tr class="fr" data-q="${esc(f.name.toLowerCase())}"><td class="b">${esc(f.name)}</td><td>${d.familyKids(f.id).length}</td><td style="text-align:end">${eur(f.cotisation)}</td><td style="text-align:end">${eur(p)}</td><td style="text-align:end" class="b">${eur((+f.cotisation || 0) - p)}</td><td><button class="btn2 sm" data-act="fam-pay" data-id="${f.id}" style="background:${bg};color:${fg};min-height:34px">${l}</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="mut">Aucune famille.</td></tr>'}
  </tbody></table></div></div>
  <p class="tiny mut b">Touchez l’état pour enregistrer un paiement. Les familles sont créées par l’école (Élèves → Familles &amp; cotisations).</p>`;
}
function enseignants(u, m, months) {
  const P = d.staff(m);
  return `${top('Enseignants de l’école', 'Heures de cours et montants')}
  ${monthNav('enseignants', m, months)}
  ${hero(`À verser · ${monthLabel(m)}`, eur(d.monthExpenses(m).profs), { sub: `${P.length} enseignant(s)`, shadow: 'var(--mint)' })}
  <div class="ck pad col">
  <div class="list">${P.map((p) => { const h = d.profHours(p.id, m); return `<button type="button" class="li" data-act="hours-detail" data-id="${p.id}" data-m="${m}" style="background:none;border:0;border-bottom:2px solid var(--neutral);width:100%;text-align:start;cursor:pointer;font:inherit;color:var(--ink)"><span class="grow"><span class="b" style="display:block">${esc(p.name)}</span><span class="small mut b" style="font-weight:600">${h.n} cours · ${d.fmtH(h.min)}${h.missing ? ` · ${h.missing} sans heure de fin` : ''} · voir le détail</span></span><span class="b">${eur(d.profCost(p, m))}</span>${ic('chev', 18)}</button>`; }).join('') || '<p class="small mut">Aucun enseignant.</p>'}</div></div>
  <div class="ck pad col"><h2>Taux et montants</h2>${teacherRows(m)}</div>`;
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
  const rows = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([l, v]) => `<tr><td>${esc(l)}</td><td style="text-align:end">${eur(v)}</td></tr>`).join('');
  return `${top('Rapports', 'Compte de résultat simplifié', `<div class="row wrap" style="gap:8px"><button class="btn2 sm" data-act="compta-csv" data-y="${y}">${ic('dl', 16)}Journal ${y} (Excel)</button><button class="btn2 sm" data-act="print">${ic('note', 16)}Imprimer</button></div>`)}
  <div class="seg">${years.map((x) => `<a href="#/compta/rapports?y=${x}" class="${x === y ? 'on' : ''}">Année ${x}</a>`).join('')}</div>
  ${hero(`Résultat ${y}`, sign(ti - te), { sub: `+ ${eur(ti)} de recettes · − ${eur(te)} de dépenses`, shadow: ti - te >= 0 ? 'var(--mint)' : 'var(--pink)' })}
  <div class="kpis">${kpi('Total recettes', eur(ti), 'var(--mint)')}${kpi('Total dépenses', eur(te), 'var(--pink)')}</div>
  <div class="grid2 stack" style="align-items:start">
    <div class="ck pad col"><h2>Recettes ${y}</h2><table class="tbl"><tbody>${rows(inc) || '<tr><td class="mut">—</td></tr>'}<tr class="b"><td>Total</td><td style="text-align:end">${eur(ti)}</td></tr></tbody></table></div>
    <div class="ck pad col"><h2>Dépenses ${y}</h2><table class="tbl"><tbody>${rows(exp) || '<tr><td class="mut">—</td></tr>'}<tr class="b"><td>Total</td><td style="text-align:end">${eur(te)}</td></tr></tbody></table></div>
  </div>
  <div class="ck pad col"><h2>Mois par mois</h2><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Mois</th><th style="text-align:end">Recettes</th><th style="text-align:end">Dépenses</th><th style="text-align:end">Résultat</th></tr></thead><tbody>
  ${ms.slice().reverse().map((mm) => { const r = d.incomeTotal(mm), e = d.monthExpenses(mm).total; return `<tr><td><a href="#/compta/journal?m=${mm}">${monthLabel(mm)}</a></td><td style="text-align:end" class="pos">${eur(r)}</td><td style="text-align:end" class="neg">${eur(e)}</td><td style="text-align:end" class="b">${sign(r - e)}</td></tr>`; }).join('')}</tbody></table></div></div>
  <p class="tiny mut b">Les cotisations de l’école sont annuelles : elles comptent dans le total, pas dans les mois. Document utile pour l’assemblée générale.</p>`;
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
