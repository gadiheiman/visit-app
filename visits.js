/**
 * ui/screens/visits.js - מסך הביקורים.
 *  רכז/ת: פתיחת ביקור חדש, ללא ביקור מעל 20 יום, והיסטוריה.
 *  מנהל ונופר: דשבורד לפי רכז, סינון לפי רכז, והיסטוריה עם ייצוא לאקסל.
 * המסך משמש גם כמארח לטופס ביקור ולצפייה בביקור (לפי ui.visitClinic / ui.showVisit).
 */
import { ui } from '../../core/state.js';
import { store } from '../../core/state.js';
import { requestRender, navigate } from '../../core/bus.js';
import { $, toast } from '../../core/dom.js';
import { esc, addDays, todayIso, localeSort } from '../../utils/format.js';
import { VISIT_STALE_DAYS } from '../../config.js';
import {
  visibleClinics, visibleVisits, getClinic, coordinators, coordinatorOf, canVisit, isManagerView, userName,
} from '../../domain/permissions.js';
import { lastVisitDate, openTasks, clinicStats, isOverdue } from '../../domain/metrics.js';
import { card, emptyNote } from '../components/card.js';
import { visitItem } from '../components/visitItem.js';
import { options } from '../components/formFields.js';
import { exportVisits } from '../../exports/visitsExcel.js';
import * as visitForm from './visitForm.js';
import * as visitDetail from './visitDetail.js';

/** מרפאות שמוצגות לפי סינון הרכז (מנהל ונופר בלבד) */
function clinicsInScope() {
  const real = visibleClinics().filter(c => !c.pool);
  if (canVisit() || !ui.visitFilters.rc) return real;
  return real.filter(c => { const owner = coordinatorOf(c); return owner && owner.id === ui.visitFilters.rc; });
}

/** מסנן את רשימת הביקורים לפי הסינונים שנבחרו */
function filteredVisits(clinics) {
  const f = ui.visitFilters;
  const ids = new Set(clinics.map(c => c.id));
  let list = visibleVisits().filter(v => ids.has(v.clinicId)).sort((a, b) => b.date.localeCompare(a.date));
  if (f.clinic) list = list.filter(v => v.clinicId === f.clinic);
  if (f.coord) list = list.filter(v => v.coordId === f.coord);
  if (f.status === 'open') list = list.filter(v => v.tasks.some(t => !t.done));
  if (f.period) { const from = addDays(-Number(f.period)); list = list.filter(v => v.date >= from); }
  return list;
}

/** מרפאות ללא ביקור מעל מספר הימים שהוגדר, מהמרפאה עם הביצוע הנמוך ביותר */
function staleClinics(clinics) {
  const limit = addDays(-VISIT_STALE_DAYS);
  const pctOf = c => { const p = clinicStats(c).pct; return p === null ? 999 : p; };
  return clinics
    .filter(c => { const last = lastVisitDate(c.id); return !last || last < limit; })
    .sort((a, b) => pctOf(a) - pctOf(b));
}

// ---------- חלקי התצוגה ----------

/** רכז/ת: בחירת מרפאה ופתיחת טופס ביקור */
function newVisitCard(clinics) {
  const sorted = clinics.slice().sort((a, b) => localeSort(a.name, b.name));
  return card('דיווח ביקור חדש', `
    <label for="v_pick">בחירת יחידה</label>
    <select id="v_pick"><option value="">בחרו מרפאה</option>
      ${sorted.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
    </select>
    <button class="btn" data-act="newVisitPick" style="width:100%;margin-top:10px">פתיחת טופס ביקור</button>`);
}

/** מנהל ונופר: טבלת סיכום לכל רכז + סינון */
function managerDashboard(allReal) {
  const limit = addDays(-VISIT_STALE_DAYS);
  const month = todayIso().slice(0, 7);
  const today = todayIso();
  const rows = coordinators().map(user => {
    const mine = allReal.filter(c => { const owner = coordinatorOf(c); return owner && owner.id === user.id; });
    const ids = new Set(mine.map(c => c.id));
    const visited = mine.filter(c => { const last = lastVisitDate(c.id); return last && last >= limit; }).length;
    const tasks = openTasks(mine);
    return {
      user, units: mine.length, visited,
      monthVisits: store.visits.filter(v => ids.has(v.clinicId) && v.date.indexOf(month) === 0).length,
      tasks: tasks.length, late: tasks.filter(x => isOverdue(x.task, today)).length,
    };
  });
  const tableRows = rows.map(r => `<tr>
    <td><b>${esc(r.user.name)}</b></td><td>${r.units}</td><td>${r.visited}</td>
    <td class="${r.units - r.visited ? 'neg' : 'pos'}">${r.units - r.visited}</td><td>${r.monthVisits}</td>
    <td>${r.tasks}${r.late ? ` <span class="neg">(${r.late} באיחור)</span>` : ''}</td></tr>`).join('');
  const filterOptions = options(rows.map(r => r.user.id), ui.visitFilters.rc, id => {
    const u = rows.find(r => r.user.id === id).user;
    return `${u.name} – ${u.title}`;
  });
  return card('דשבורד ביקורים לפי רכז/ת', `<div class="scroll"><table>
      <thead><tr><th>רכז/ת</th><th>יחידות</th><th>בוקרו ב־${VISIT_STALE_DAYS} יום</th><th>ללא ביקור</th><th>ביקורים החודש</th><th>משימות פתוחות</th></tr></thead>
      <tbody>${tableRows}</tbody></table></div>`)
    + card('', `<label for="f_rc" style="margin-top:0">סינון לפי רכז/ת</label>
      <select id="f_rc" data-chg="visitFilter" data-key="rc"><option value="">כל הרכזים</option>${filterOptions}</select>
      <div class="muted" style="margin-top:6px">הסינון חל על רשימת היחידות ללא ביקור ועל היסטוריית הביקורים.</div>`);
}

function staleCard(stale) {
  if (!stale.length) return '';
  const chips = stale.slice(0, 10)
    .map(c => `<span class="chip" data-act="openClinic" data-id="${esc(c.id)}" role="button" tabindex="0">${esc(c.name)}</span>`).join('');
  const more = stale.length > 10 ? `<span class="muted">ועוד ${stale.length - 10}</span>` : '';
  return card(`ללא ביקור מעל ${VISIT_STALE_DAYS} יום (${stale.length})`,
    `<div class="muted">ממוינות לפי ביצוע נמוך מול היעד:</div><div class="chips">${chips}${more}</div>`);
}

/** היסטוריית ביקורים עם סינונים וייצוא (ייצוא למנהל ולנופר בלבד) */
function historyCard(clinics, visits) {
  const f = ui.visitFilters;
  const sorted = clinics.slice().sort((a, b) => localeSort(a.name, b.name));
  const who = [...new Set(visibleVisits().map(v => v.coordId))];
  const exportButton = isManagerView()
    ? `<button class="btn small" data-act="exportVisits">ייצוא לאקסל (${visits.length})</button>` : '';
  const coordFilter = canVisit() && who.length > 1
    ? `<div><label for="f_coord">מתעד/ת</label><select id="f_coord" data-chg="visitFilter" data-key="coord">
         <option value="">הכול</option>${options(who, f.coord, userName)}</select></div>` : '';
  const periods = [['', 'כל הזמן'], ['7', 'שבוע אחרון'], ['30', '30 ימים'], ['90', '90 ימים']];
  return card('', `
    <div class="row between"><h3 style="margin:0">היסטוריית ביקורים</h3>${exportButton}</div>
    <div class="grid2">
      <div><label for="f_clinic">מרפאה</label><select id="f_clinic" data-chg="visitFilter" data-key="clinic">
        <option value="">הכול</option>${options(sorted.map(c => c.id), f.clinic, id => sorted.find(c => c.id === id).name)}</select></div>
      ${coordFilter}
      <div><label for="f_period">תקופה</label><select id="f_period" data-chg="visitFilter" data-key="period">
        ${periods.map(([v, t]) => `<option value="${v}"${f.period === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label for="f_status">סטטוס משימות</label><select id="f_status" data-chg="visitFilter" data-key="status">
        <option value="">הכול</option><option value="open"${f.status === 'open' ? ' selected' : ''}>עם משימות פתוחות</option></select></div>
    </div>
    ${visits.length
      ? `<div class="list" style="margin-top:8px">${visits.map(visitItem).join('')}</div>`
      : emptyNote(store.visits.length ? 'אין ביקורים שמתאימים לסינון.' : 'עדיין לא תועדו ביקורים.')}`);
}

export function render() {
  // טופס ביקור או צפייה בביקור (כל אחד מחזיר טקסט ריק אם הנתונים כבר לא זמינים)
  if (ui.visitClinic) { const html = visitForm.render(); if (html) return html; }
  if (ui.showVisit) { const html = visitDetail.render(); if (html) return html; }
  const clinics = clinicsInScope();
  const visits = filteredVisits(clinics);
  ui.visitsShown = visits;   // לייצוא לאקסל
  const top = canVisit() ? newVisitCard(clinics) : managerDashboard(visibleClinics().filter(c => !c.pool));
  return `<h2 style="margin-top:4px">ביקורים</h2>${top}${staleCard(staleClinics(clinics))}${historyCard(clinics, visits)}`;
}

export const handlers = {
  visitFilter(el) { ui.visitFilters[el.dataset.key] = el.value; requestRender(); },
  /** פתיחת טופס ביקור ממרפאה מסוימת (מדף מרפאה) */
  newVisit(el) {
    const clinic = getClinic(el.dataset.id);
    if (canVisit() && clinic && !clinic.pool) navigate('visits', { visitClinic: clinic.id });
  },
  /** פתיחת טופס ביקור מהמרפאה שנבחרה ברשימה */
  newVisitPick() {
    if (!canVisit()) return;
    const id = $('#v_pick').value;
    if (!id) { toast('בחרו יחידה'); return; }
    navigate('visits', { visitClinic: id });
  },
  showVisit(el) { navigate('visits', { showVisit: el.dataset.id }); },
  exportVisits() { if (isManagerView()) exportVisits(ui.visitsShown); },
};

