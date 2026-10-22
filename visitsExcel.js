/**
 * exports/visitsExcel.js - ייצוא ביקורים לאקסל: לשונית "ביקורים" ולשונית "משימות".
 */
import { store } from '../core/state.js';
import { toast } from '../core/dom.js';
import { MG_NAMES } from '../config.js';
import { todayIso } from '../utils/format.js';
import { userName } from '../domain/permissions.js';
import { visitChecklist } from '../domain/checklist.js';
import { downloadWorkbook, excelAvailable } from './workbook.js';
import { logChange } from '../api/logApi.js';

const clinicOf = visit => store.clinics.find(c => c.id === visit.clinicId) || {};

/** שורה לכל ביקור, עם עמודה לכל סעיף צ'ק ליסט (איחוד הסעיפים של כל הביקורים) */
function visitRows(visits) {
  const allItems = [];
  visits.forEach(v => visitChecklist(v).forEach(t => { if (allItems.indexOf(t) < 0) allItems.push(t); }));
  return visits.map(v => {
    const clinic = clinicOf(v);
    const items = visitChecklist(v);
    const done = v.checks.filter(Boolean).length;
    const row = {
      'תאריך': v.date, 'שעה': v.time || '', 'מינהלת': MG_NAMES[clinic.mg] || '',
      'מרפאה': clinic.name || '', 'ישוב': clinic.town || '', 'מתעד/ת': userName(v.coordId),
      'מטרת הביקור': v.purpose || '', 'משתתפים': v.people || '',
      'השלמת צ׳ק ליסט': items.length ? Math.round(done / items.length * 100) + '%' : '',
    };
    allItems.forEach(t => {
      const k = items.indexOf(t);
      row['✓ ' + t] = k < 0 ? '' : (v.checks[k] ? '✔' : '✘');
    });
    row['סיכום'] = v.summary || '';
    row['משימות פתוחות'] = v.tasks.filter(t => !t.done).length;
    row['נערך ב־'] = v.edited || '';
    return row;
  });
}

/** שורה לכל משימה בכל הביקורים */
function taskRows(visits) {
  const today = todayIso();
  const rows = [];
  visits.forEach(v => v.tasks.forEach(t => rows.push({
    'תאריך ביקור': v.date, 'מרפאה': clinicOf(v).name || '', 'מתעד/ת': userName(v.coordId),
    'משימה': t.text, 'אחראי': t.owner || '', 'תאריך יעד': t.due || '',
    'בוצע': t.done ? 'כן' : 'לא', 'באיחור': (!t.done && t.due && t.due < today) ? 'כן' : '',
  })));
  return rows;
}

/** מייצא את רשימת הביקורים שמוצגת כרגע */
export function exportVisits(visits) {
  if (!excelAvailable()) return;
  if (!visits.length) { toast('אין ביקורים לייצוא'); return; }
  const sorted = visits.slice().sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));
  const rows = visitRows(sorted);
  const widths = Object.keys(rows[0]).map(k => (k === 'סיכום' ? 45 : Math.min(34, Math.max(11, k.length + 4))));
  const sheets = [{ name: 'ביקורים', rows, widths }];
  const tasks = taskRows(sorted);
  if (tasks.length) sheets.push({ name: 'משימות', rows: tasks, widths: [13, 24, 12, 40, 12, 12, 8, 9] });
  downloadWorkbook(`visits_${todayIso()}.xlsx`, sheets);
  logChange(`ייצוא ביקורים לאקסל (${sorted.length} ביקורים)`);
  toast('הקובץ הורד');
}
