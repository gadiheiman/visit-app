/**
 * ui/screens/visitDetail.js - צפייה בביקור: פרטים, צ'ק ליסט, סיכום, משימות, והפעולות
 * עריכה, העתקת סיכום ומחיקה (מחיקה למנהל ולנופר בלבד, עם אישור בתוך הדף).
 */
import { ui, store } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { toast, errorText, scrollTop } from '../../core/dom.js';
import { esc, fmtDate, todayIso } from '../../utils/format.js';
import { clinicName, userName, getClinic, canVisit, canDeleteVisit } from '../../domain/permissions.js';
import { isOverdue } from '../../domain/metrics.js';
import { visitChecklist } from '../../domain/checklist.js';
import { updateVisitTasks, deleteVisit } from '../../api/visitsApi.js';
import { logChange } from '../../api/logApi.js';
import { backButton } from '../components/card.js';
import { copyText } from '../../utils/clipboard.js';

const findVisit = id => store.visits.find(v => v.id === id);

function checklistHtml(visit) {
  return visitChecklist(visit)
    .map((text, i) => `<div class="check"><span aria-hidden="true">${visit.checks[i] ? '✅' : '⬜'}</span><span>${esc(text)}</span></div>`)
    .join('');
}

function tasksHtml(visit) {
  if (!visit.tasks.length) return '<div class="muted">אין משימות.</div>';
  const today = todayIso();
  return visit.tasks.map((task, i) => `
    <div class="check">
      <input type="checkbox" data-chg="toggleTask" data-v="${esc(visit.id)}" data-i="${i}"${task.done ? ' checked' : ''}
        aria-label="בוצע"${canVisit() ? '' : ' disabled'}>
      <div><div>${esc(task.text)}</div>
        <div class="muted">${esc(task.owner || 'ללא אחראי')} · יעד ${fmtDate(task.due)}${isOverdue(task, today) ? ' · <b class="neg">באיחור</b>' : ''}</div></div>
    </div>`).join('');
}

/** כרטיס האישור שמופיע אחרי לחיצה על "מחיקת ביקור" */
function deleteConfirmHtml(visit) {
  if (ui.confirmDeleteVisit !== visit.id || !canDeleteVisit()) return '';
  return `<div class="card" style="margin:12px 0 0;border-color:var(--bad)" role="alert">
    <div><b>למחוק את הביקור?</b> הפעולה לא ניתנת לביטול.</div>
    <div class="row3">
      <button class="btn danger" data-act="deleteVisitYes" data-v="${esc(visit.id)}">כן, למחוק</button>
      <button class="btn ghost" data-act="deleteVisitNo">ביטול</button>
    </div></div>`;
}

export function render() {
  const visit = findVisit(ui.showVisit);
  if (!visit || !getClinic(visit.clinicId)) { ui.showVisit = null; return ''; }
  const deleteButton = canDeleteVisit()
    ? `<button class="btn danger" data-act="deleteVisit" data-v="${esc(visit.id)}">מחיקת ביקור</button>` : '';
  return `${backButton('backVisits', 'חזרה')}
    <div class="card">
      <h3>${esc(clinicName(visit.clinicId))} · ${fmtDate(visit.date)} ${esc(visit.time || '')}</h3>
      <div class="muted">${esc(userName(visit.coordId))}${visit.people ? ` · משתתפים: ${esc(visit.people)}` : ''}</div>
      <div class="muted">מטרה: ${esc(visit.purpose || '—')}</div>
      ${visit.edited ? `<div class="muted">נערך ב־${fmtDate(visit.edited)}</div>` : ''}
      <h3 style="margin-top:12px">צ׳ק ליסט</h3>${checklistHtml(visit)}
      <h3 style="margin-top:12px">סיכום</h3><div>${esc(visit.summary || '—').replace(/\n/g, '<br>')}</div>
      <h3 style="margin-top:12px">משימות להמשך</h3>${tasksHtml(visit)}
      <div class="row3">
        <button class="btn" data-act="editVisit" data-v="${esc(visit.id)}">עריכת ביקור</button>
        <button class="btn ghost" data-act="copyVisit" data-v="${esc(visit.id)}">העתקת סיכום</button>
        ${deleteButton}
      </div>
      ${deleteConfirmHtml(visit)}
    </div>`;
}

/** טקסט להעתקה (וואטסאפ, מייל) */
function visitAsText(visit) {
  const lines = [
    `סיכום ביקור – ${clinicName(visit.clinicId)} – ${fmtDate(visit.date)}`,
    `מתעד/ת: ${userName(visit.coordId)}`,
    `מטרה: ${visit.purpose || '—'}`, '', 'צ׳ק ליסט:',
  ];
  visitChecklist(visit).forEach((text, i) => lines.push(`${visit.checks[i] ? '✔' : '✘'} ${text}`));
  lines.push('', `סיכום: ${visit.summary || '—'}`, '', 'משימות:');
  if (visit.tasks.length) visit.tasks.forEach(t => lines.push(`- ${t.text} (${t.owner || ''}, עד ${fmtDate(t.due)})`));
  else lines.push('אין');
  return lines.join('\n');
}

// ---------- פעולות ----------

async function toggleTask(el) {
  const visit = findVisit(el.dataset.v);
  if (!visit || !getClinic(visit.clinicId) || !canVisit()) { requestRender(); return; }
  const index = Number(el.dataset.i);
  const tasks = visit.tasks.map((t, i) => (i === index ? { ...t, done: el.checked } : t));
  const { ok, error } = await updateVisitTasks(visit.id, tasks);
  if (!ok) { toast(error ? errorText(error) : 'אין הרשאה'); requestRender(); return; }
  logChange(`${el.checked ? 'סגירת' : 'פתיחת'} משימה: ${tasks[index].text}`);
  visit.tasks = tasks;
  requestRender();
}

async function deleteYes(el) {
  const visit = findVisit(el.dataset.v);
  if (!visit || !canDeleteVisit() || ui.busy) return;
  ui.busy = true;
  const { ok, error } = await deleteVisit(visit.id);
  ui.busy = false;
  if (!ok) { toast(error ? errorText(error) : 'אין הרשאה למחוק'); return; }
  store.visits = store.visits.filter(v => v.id !== visit.id);
  logChange(`מחיקת ביקור ב${clinicName(visit.clinicId)} מתאריך ${fmtDate(visit.date)}`);
  ui.showVisit = null;
  ui.confirmDeleteVisit = null;
  toast('הביקור נמחק');
  requestRender();
  scrollTop();
}

export const handlers = {
  /** חזרה: מעריכה לצפייה, ומצפייה לרשימה */
  backVisits() {
    if (ui.editVisit) { ui.showVisit = ui.editVisit; ui.editVisit = null; ui.visitClinic = null; }
    else { ui.visitClinic = null; ui.showVisit = null; }
    requestRender();
  },
  editVisit(el) {
    const visit = findVisit(el.dataset.v);
    if (!visit || !getClinic(visit.clinicId)) return;
    ui.editVisit = visit.id;
    ui.visitClinic = visit.clinicId;
    ui.showVisit = null;
    requestRender();
    scrollTop();
  },
  copyVisit(el) { const v = findVisit(el.dataset.v); if (v) copyText(visitAsText(v)); },
  deleteVisit(el) { if (canDeleteVisit()) { ui.confirmDeleteVisit = el.dataset.v; requestRender(); } },
  deleteVisitNo() { ui.confirmDeleteVisit = null; requestRender(); },
  deleteVisitYes: deleteYes,
  toggleTask,
};
