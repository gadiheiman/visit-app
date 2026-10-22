/**
 * ui/screens/home.js - מסך הבית.
 *
 * מבנה: homeModel() מחשב את כל המספרים, ופונקציות ה-view הקטנות מציירות כל חלק.
 *  1. כרטיסי דשבורד: מאזן (ימין) וביקורים במרפאות (שמאל)
 *  2. מאזן לפי קפיטציה
 *  3. "מה דורש תשומת לב": מרפאות מתחת ליעד, מאזן שלילי, ביקורים, משימות באיחור, חוסר דיווח
 */
import { ui, store } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { esc, addDays, todayIso, fmtDate, pctLabel, sign, signClass } from '../../utils/format.js';
import {
  BELOW_PREVIEW_COUNT, CAPS, TARGET_ALERT_PCT, VISIT_STALE_DAYS, MG_NAMES,
} from '../../config.js';
import {
  me, visibleClinics, coordinators, coordinatorOf, canVisit, clinicName,
  isManagerView, scopeTitle,
} from '../../domain/permissions.js';
import {
  aggregate, capSeries, lastReportedCap, clinicStats, isReported, openTasks, lastVisitDate,
  belowTargetClinics, targetTone, SIZE_LABELS, isOverdue,
} from '../../domain/metrics.js';
import { pill } from '../components/pill.js';
import { stackedStats, bigNumber } from '../components/statRows.js';
import { capTable } from '../components/capTable.js';
import { listItem } from '../components/listItem.js';
import { options } from '../components/formFields.js';
import { card, emptyNote } from '../components/card.js';

// ---------- חישוב ----------

/** כל הנתונים שהמסך צריך, מחושבים פעם אחת */
function homeModel() {
  const clinics = visibleClinics();
  const real = clinics.filter(c => !c.pool);
  const today = todayIso();
  const staleLimit = addDays(-VISIT_STALE_DAYS);
  const withoutRecentVisit = list => list.filter(c => {
    const last = lastVisitDate(c.id);
    return !last || last < staleLimit;
  });

  // כרטיס הביקורים: למנהל ולנופר אפשר לסנן לפי רכז
  const coordFilter = !canVisit() && ui.homeCoord;
  const visitScope = coordFilter
    ? real.filter(c => { const owner = coordinatorOf(c); return owner && owner.id === ui.homeCoord; })
    : real;
  const scopeIds = new Set(visitScope.map(c => c.id));
  const monthPrefix = today.slice(0, 7);
  const tasksInScope = openTasks(visitScope);

  const series = capSeries(clinics);
  const lastIdx = lastReportedCap(series);
  return {
    clinics, real, today,
    agg: aggregate(clinics),
    series, lastIdx, last: lastIdx >= 0 ? series[lastIdx] : null,
    visits: {
      scope: visitScope,
      visited: visitScope.length - withoutRecentVisit(visitScope).length,
      none: withoutRecentVisit(visitScope).length,
      month: store.visits.filter(v => scopeIds.has(v.clinicId) && v.date.indexOf(monthPrefix) === 0).length,
      tasks: tasksInScope.length,
      late: tasksInScope.filter(x => isOverdue(x.task, today)).length,
    },
    noVisitAll: withoutRecentVisit(real).length,
    below: belowTargetClinics(clinics, ui.belowIncludeSmall),
    negative: clinics.filter(c => clinicStats(c).bal < 0).sort((a, b) => clinicStats(a).bal - clinicStats(b).bal),
    lateTasks: openTasks(clinics).filter(x => isOverdue(x.task, today)),
    missing: lastIdx >= 0 ? clinics.filter(c => !isReported(c, lastIdx)) : [],
  };
}

// ---------- חלקי התצוגה ----------

function greetingHtml(model) {
  const user = me();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';
  return `<h2 style="margin-top:4px">${hello}, ${esc(user.name)}</h2>
    <div class="muted" style="margin-bottom:10px">${esc(user.title)} · ${esc(scopeTitle())} · ${model.clinics.length} יחידות</div>`;
}

/** כרטיס מאזן (ימין): מאזן 2026, מצטרפים, עוזבים, והקפיטציה האחרונה */
function balanceCard(model) {
  if (!model.agg.reporting) {
    return card('מאזן', '<div class="muted">עדיין לא הוזנו נתוני קפיטציות. אפשר להזין אותם במסך היחידה.</div>');
  }
  const a = model.agg;
  const items = [
    { label: 'מצטרפים', value: a.J },
    { label: 'עוזבים', value: a.L },
  ];
  if (model.last) {
    items.push({ label: CAPS[model.lastIdx], value: sign(model.last.bal), cls: signClass(model.last.bal) });
  }
  if (a.targetPct !== null) items.push({ label: 'ביצוע מול יעד', value: pctLabel(a.targetPct) });
  return card('מאזן',
    `${bigNumber(sign(a.bal), a.bal >= 0 ? 'pos' : 'neg')}
     <div class="muted">מאזן 2026 (${a.nmax} מתוך 6 קפיטציות)</div>${stackedStats(items)}`);
}

/** כרטיס ביקורים (שמאל), עם סינון לפי רכז למנהל ולנופר */
function visitsCard(model) {
  const v = model.visits;
  const filter = canVisit() ? '' : `
    <select data-chg="homeCoord" aria-label="סינון לפי רכז" style="min-height:36px;padding:4px 8px;font-size:.85rem;margin-bottom:4px">
      <option value="">כל הרכזים</option>
      ${options(coordinators().map(u => u.id), ui.homeCoord, id => coordinators().find(u => u.id === id).name)}
    </select>`;
  const items = [
    { label: 'ביקורים החודש', value: v.month },
    { label: 'ללא ביקור', value: v.none, cls: v.none ? 'neg' : 'pos' },
    { label: 'משימות פתוחות', value: v.tasks },
  ];
  if (v.late) items.push({ label: 'באיחור', value: v.late, cls: 'neg' });
  return card('ביקורים במרפאות',
    `${filter}${bigNumber(`${v.visited} / ${v.scope.length}`)}
     <div class="muted">יחידות שבוקרו ב־${VISIT_STALE_DAYS} הימים האחרונים</div>${stackedStats(items)}`);
}

/** כותרת משנה לשורת מרפאה: גודל, מבוטחים, ישוב ומינהלת */
function clinicSubtitle(clinic, size) {
  const parts = [];
  if (size) parts.push(SIZE_LABELS[size]);
  if (clinic.ins) parts.push(`${clinic.ins.toLocaleString('he-IL')} מבוטחים`);
  if (clinic.town) parts.push(clinic.town);
  if (isManagerView()) parts.push(MG_NAMES[clinic.mg]);
  return parts.join(' · ');
}

/** מרפאות מתחת ליעד: מציג את הנמוכות ביותר, וכפתור שפותח את כל הרשימה */
function belowTargetCard(model) {
  const all = model.below;
  const rows = (ui.showAllBelow ? all : all.slice(0, BELOW_PREVIEW_COUNT)).map(x => listItem({
    action: 'openClinic',
    id: x.clinic.id,
    title: x.clinic.name,
    subtitle: clinicSubtitle(x.clinic, x.size),
    badgeHtml: pill(pctLabel(x.stats.pct), targetTone(x.stats.pct)),
  })).join('');

  const scopeNote = ui.belowIncludeSmall ? '' : 'בינוניות וגדולות ';
  const title = `מרפאות ${scopeNote}מתחת ל־${TARGET_ALERT_PCT}% מהיעד (${all.length})`;

  const sizeChips = ui.showAllBelow ? `
    <div class="chips" role="group" aria-label="גודל מרפאה">
      <button class="chip" data-act="belowSmall" data-value="0" aria-pressed="${!ui.belowIncludeSmall}">בינוניות וגדולות</button>
      <button class="chip" data-act="belowSmall" data-value="1" aria-pressed="${ui.belowIncludeSmall}">כולל קטנות</button>
    </div>` : '';

  const toggle = (all.length > BELOW_PREVIEW_COUNT || ui.showAllBelow)
    ? `<button class="btn ghost small" style="margin-top:10px" data-act="toggleBelowAll">${ui.showAllBelow ? 'הצגת פחות' : `הצגת כל הרשימה (${all.length})`}</button>`
    : '';

  const body = all.length
    ? `${sizeChips}<div class="list">${rows}</div>${toggle}`
    : `${sizeChips}${emptyNote(`אין מרפאות מתחת ל־${TARGET_ALERT_PCT}% מהיעד.`)}${toggle}`;
  return card(title, body);
}

function negativeBalanceCard(model) {
  const list = model.negative;
  const rows = list.slice(0, 6).map(c => listItem({
    action: 'openClinic', id: c.id, title: c.name,
    subtitle: clinicSubtitle(c, null),
    badgeHtml: pill(sign(clinicStats(c).bal), 'bad'),
  })).join('');
  return card(`מאזן שלילי מתחילת השנה (${list.length})`,
    list.length ? `<div class="list">${rows}</div>` : emptyNote('אין מרפאות עם מאזן שלילי.'));
}

function visitsSummaryCard(model) {
  const text = model.real.length
    ? `${model.noVisitAll} מתוך ${model.real.length} יחידות ללא ביקור מתועד ב־${VISIT_STALE_DAYS} הימים האחרונים.`
    : 'אין יחידות.';
  const button = model.real.length
    ? '<button class="btn small" style="margin-top:10px" data-act="goTab" data-tab="visits">למסך הביקורים</button>' : '';
  return card('ביקורים', `<div>${text}</div>${button}`);
}

function lateTasksCard(model) {
  if (!model.lateTasks.length) return '';
  const rows = model.lateTasks.slice(0, 6).map(x => `
    <div class="item"><div><div class="t">${esc(x.task.text)}</div>
      <div class="muted">${esc(clinicName(x.visit.clinicId))} · יעד ${fmtDate(x.task.due)}</div></div>
      ${pill('באיחור', 'bad')}</div>`).join('');
  return card(`משימות באיחור (${model.lateTasks.length})`, `<div class="list">${rows}</div>`);
}

function missingDataCard(model) {
  if (!model.missing.length) return '';
  const chips = model.missing.slice(0, 12)
    .map(c => `<span class="chip" data-act="openClinic" data-id="${esc(c.id)}" role="button" tabindex="0">${esc(c.name)}</span>`).join('');
  const more = model.missing.length > 12 ? `<span class="muted">ועוד ${model.missing.length - 12}</span>` : '';
  return card('חסר דיווח בקפיטציה האחרונה',
    `<div class="muted">ביחידות הבאות אין נתוני ${esc(CAPS[model.lastIdx])}:</div><div class="chips">${chips}${more}</div>`);
}

// ---------- הרכבת המסך ----------

export function render() {
  const model = homeModel();
  const hasData = model.agg.reporting > 0;
  const capCard = hasData
    ? card('מאזן לפי קפיטציה', capTable(model.series, futureTarget(model), { target: model.agg.tt, j: model.agg.J, l: model.agg.L }))
    : '';
  const attention = hasData ? belowTargetCard(model) + negativeBalanceCard(model) : '';
  return `${greetingHtml(model)}
    <div class="grid2 dash">${balanceCard(model)}${visitsCard(model)}</div>
    ${capCard}
    <h2>מה דורש תשומת לב?</h2>
    ${attention}${visitsSummaryCard(model)}${lateTasksCard(model)}${missingDataCard(model)}`;
}

/** יעד כולל לקפיטציה שעוד לא דווחה: סכום היעדים של כל המרפאות */
function futureTarget(model) {
  return model.clinics.reduce((sum, c) => sum + (c.target > 0 ? c.target : 0), 0);
}

// ---------- פעולות ----------

export const handlers = {
  homeCoord(el) { ui.homeCoord = el.value; requestRender(); },
  toggleBelowAll() {
    ui.showAllBelow = !ui.showAllBelow;
    if (!ui.showAllBelow) ui.belowIncludeSmall = false;
    requestRender();
  },
  belowSmall(el) { ui.belowIncludeSmall = el.dataset.value === '1'; requestRender(); },
};
