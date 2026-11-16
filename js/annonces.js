// Messages de la direction (affichés aux parents et aux profs entre deux dates)
import * as d from './data.js';
import { esc, ic, fdate, todayISO } from './ui.js';

export function annoncesHtml() {
  return d.activeAnnouncements(todayISO()).map((a) => `<div class="ck pad col" style="background:var(--pink);gap:8px"><div class="row between wrap"><span class="b">${ic('mega', 20)} Message de la direction</span><span class="tiny b">${fdate(a.from)} → ${fdate(a.to)}</span></div>${a.text ? `<div data-notr dir="auto" style="white-space:pre-wrap;font-weight:600">${esc(a.text)}</div>` : ''}${a.audioId ? `<audio controls preload="none" data-audio="${a.audioId}" style="width:100%;height:40px"></audio>` : ''}</div>`).join('');
}

