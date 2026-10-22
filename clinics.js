/**
 * ui/screens/clinics.js - רשימת היחידות: חיפוש, סינון, מיון, וכרטיס לכל מרפאה.
 */
import { ui } from '../../core/state.js';
import { requestRender, navigate } from '../../core/bus.js';
import { rerenderKeepingFocus } from '../../core/dom.js';
import { esc, sign, signClass, pctLabel, localeSort } from '../../utils/format.js';
import { LIST_PAGE_SIZE, MG_NAMES } from '../../config.js';
import { visibleClinics, isManagerView, me } from '../../domain/permissions.js';
import { clinicStats, targetTone, sizeOf, SIZE_LABELS } from '../../domain/metrics.js';
import { filterSelect } from '../components/formFields.js';
import { pill } from '../components/pill.js';
import { inlineStats } from '../components/statRows.js';
import { emptyNote } from '../components/card.js';

const UNDEFINED_LABEL = 'לא מוגדר';

/** מפתחות מיון: פונקציה שמחזירה מספר, מהנמוך לגבוה */
const SORT_KEYS = {
  pct: c => { const p = clinicStats(c).pct; return p === null ? 9999 : p; },
  bal: c => clinicStats(c).bal,
  ins: c => -(c.ins || 0),
};
const SORT_OPTIONS = [
  ['bal', 'מאזן (נמוך קודם)'],
  ['pct', 'ביצוע מול יעד (נמוך קודם)'],
  ['ins', 'מספר מבוטחים'],
  ['name', 'שם'],
];

/** מסנן ומיין את היחידות לפי מצב התצוגה */
function filteredClinics(all) {
  const f = ui.filters;
  const q = ui.search.trim();
  const list = all.filter(c =>
    (!q || c.name.indexOf(q) >= 0 || (c.town || '').indexOf(q) >= 0)
    && (!f.mg || c.mg === f.mg)
    && (!f.sector || (c.sector || UNDEFINED_LABEL) === f.sector)
    && (!f.kind || (c.kind || UNDEFINED_LABEL) === f.kind));
  return list.sort((a, b) => f.sort === 'name'
    ? localeSort(a.name, b.name)
    : SORT_KEYS[f.sort](a) - SORT_KEYS[f.sort](b));
}

/** כרטיס מרפאה אחד ברשימה */
function clinicCard(c) {
  const s = clinicStats(c);
  const size = sizeOf(c);
  const subtitle = [c.town, c.kind, size ? `${SIZE_LABELS[size]}` : null, isManagerView() ? MG_NAMES[c.mg] : null]
    .filter(Boolean).join(' · ');
  const badge = s.pct === null ? pill('אין יעד', 'na') : pill(pctLabel(s.pct), targetTone(s.pct));
  const body = s.n
    ? `${inlineStats([
        { label: 'מצטרפים', value: s.j },
        { label: 'עוזבים', value: s.l },
        { label: 'מאזן', value: sign(s.bal), cls: signClass(s.bal) },
      ])}
      <div class="muted">${s.pct === null ? 'אין יעד מוגדר' : `ביצוע מול יעד: ${Math.round(s.pct)}% (${s.j} מתוך ${Math.round(s.yt)})`}</div>`
    : '<div class="muted" style="margin-top:8px">אין נתוני קפיטציות ב־2026</div>';
  return `<div class="card" data-act="openClinic" data-id="${esc(c.id)}" tabindex="0" role="button" style="cursor:pointer">
    <div class="row between">
      <div style="min-width:0"><div style="font-weight:800">${esc(c.name)}</div><div class="muted">${esc(subtitle)}</div></div>
      ${badge}
    </div>${body}</div>`;
}

/** שורת הסינונים: מיון, מינהלת, מגזר וסוג יחידה (מוצגים רק כשיש מה לסנן) */
function filtersHtml(all) {
  const f = ui.filters;
  const uniq = pick => [...new Set(all.map(pick))];
  const sortSelect = `<div><label for="f_sort">מיון</label>
    <select id="f_sort" data-chg="clinicFilter" data-key="sort">
      ${SORT_OPTIONS.map(([v, t]) => `<option value="${v}"${f.sort === v ? ' selected' : ''}>${t}</option>`).join('')}
    </select></div>`;
  const mgs = uniq(c => c.mg);
  const sectors = uniq(c => c.sector || UNDEFINED_LABEL);
  const kinds = uniq(c => c.kind || UNDEFINED_LABEL);
  return `<div class="grid2" style="margin-top:6px">${sortSelect}
    ${mgs.length > 1 ? filterSelect({ id: 'f_mg', label: 'מינהלת', chg: 'clinicFilter', key: 'mg', values: mgs, selected: f.mg, labelOf: x => MG_NAMES[x] || x }) : ''}
    ${sectors.length > 1 ? filterSelect({ id: 'f_sec', label: 'מגזר', chg: 'clinicFilter', key: 'sector', values: sectors, selected: f.sector }) : ''}
    ${kinds.length > 1 ? filterSelect({ id: 'f_kind', label: 'סוג יחידה', chg: 'clinicFilter', key: 'kind', values: kinds, selected: f.kind }) : ''}
  </div>`;
}

export function render() {
  const all = visibleClinics();
  const list = filteredClinics(all);
  const shown = list.slice(0, ui.limit);
  const personal = me().role === 'coord' || me().role === 'hosp';
  const more = list.length > ui.limit
    ? `<button class="btn ghost" style="width:100%" data-act="moreClinics">הצגת עוד (${list.length - ui.limit} נוספות)</button>` : '';
  return `<h2 style="margin-top:4px">${personal ? 'היחידות שלי' : 'כל היחידות'} <span class="muted">(${list.length})</span></h2>
    <input type="search" id="q" placeholder="חיפוש לפי שם מרפאה או ישוב" value="${esc(ui.search)}" aria-label="חיפוש" data-inp="clinicSearch">
    ${filtersHtml(all)}
    <div style="height:10px"></div>
    ${shown.length ? shown.map(clinicCard).join('') : emptyNote('לא נמצאו יחידות שמתאימות לחיפוש.')}
    ${more}`;
}

export const handlers = {
  /** פתיחת דף מרפאה (משמש גם מסכים אחרים) */
  openClinic(el) { navigate('clinics', { clinicId: el.dataset.id }); },
  moreClinics() { ui.limit += LIST_PAGE_SIZE; requestRender(); },
  clinicFilter(el) {
    ui.filters[el.dataset.key] = el.value;
    ui.limit = LIST_PAGE_SIZE;
    requestRender();
  },
  clinicSearch(el) {
    ui.search = el.value;
    ui.limit = LIST_PAGE_SIZE;
    rerenderKeepingFocus('q', requestRender);
  },
};
