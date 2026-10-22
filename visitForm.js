/**
 * ui/screens/visitForm.js - טופס דיווח ביקור חדש ועריכת ביקור קיים.
 *
 * הטופס נשמר עם עותק של סעיפי הצ'ק ליסט של אותו רגע, כדי ששינוי עתידי ברשימה לא יעוות ביקורים ישנים.
 * משימות נקראות מה-DOM בעת שמירה (שורות שאפשר להוסיף ולהסיר בלי לצייר מחדש).
 */
import { ui, store } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { $, toast, errorText, scrollTop } from '../../core/dom.js';
import { esc, addDays, todayIso, sign, pctLabel } from '../../utils/format.js';
import { MG_NAMES } from '../../config.js';
import { me, getClinic, canVisit } from '../../domain/permissions.js';
import { clinicStats } from '../../domain/metrics.js';
import { visitChecklist } from '../../domain/checklist.js';
import { insertVisit, updateVisit } from '../../api/visitsApi.js';
import { logChange } from '../../api/logApi.js';
import { backButton } from '../components/card.js';

const pad2 = n => String(n).padStart(2, '0');

/** שורת משימה בטופס. task = ערכים קיימים (בעריכה), או ריק (משימה חדשה) */
function taskRowHtml(task = {}) {
  return `<div class="card" data-done="${task.done ? 1 : 0}" style="background:var(--bg)">
    <label style="margin-top:0">משימה</label>
    <input class="t_text" value="${esc(task.text || '')}">
    <div class="grid2">
      <div><label>אחראי</label><input class="t_owner" value="${esc(task.owner != null ? task.owner : me().name)}"></div>
      <div><label>תאריך יעד</label><input type="date" class="t_due" value="${esc(task.due || addDays(7))}"></div>
    </div>
    <button class="btn danger small" data-act="removeTaskRow" style="margin-top:10px">הסרת משימה</button>
  </div>`;
}

/** שורת נתוני פתיחה של המרפאה, מעל הטופס */
function openingStats(clinic) {
  const s = clinicStats(clinic);
  if (!s.n) return '';
  const target = s.pct !== null ? `, ${pctLabel(s.pct)} מהיעד` : '';
  return `<div class="muted" style="margin-top:6px">נתוני פתיחה: מצטרפים ${s.j}, עוזבים ${s.l}, מאזן ${sign(s.bal)}${target}</div>`;
}

export function render() {
  const clinic = getClinic(ui.visitClinic);
  if (!clinic) { ui.visitClinic = null; ui.editVisit = null; return ''; }
  const editing = ui.editVisit ? store.visits.find(v => v.id === ui.editVisit) : null;
  const checklist = editing ? visitChecklist(editing) : store.settings.checklist;
  const now = new Date();
  const checkboxes = checklist.map((text, i) => `
    <label class="check" style="margin:0;color:var(--ink);font-size:1rem">
      <input type="checkbox" class="vchk" data-i="${i}" data-chg="visitCheckCount"${editing && editing.checks[i] ? ' checked' : ''}>
      <span>${esc(text)}</span></label>`).join('');
  const tasks = editing ? editing.tasks.map(taskRowHtml).join('') : '';
  const checkedCount = editing ? editing.checks.filter(Boolean).length : 0;
  return `${backButton('backVisits', 'ביטול')}
    <div class="card">
      <h3>${editing ? 'עריכת ביקור' : 'דיווח ביקור'} – ${esc(clinic.name)}</h3>
      <div class="muted">${esc([clinic.town, MG_NAMES[clinic.mg]].filter(Boolean).join(' · '))}</div>
      ${openingStats(clinic)}
      <div class="grid2">
        <div><label for="v_date">תאריך</label><input type="date" id="v_date" value="${esc(editing ? editing.date : todayIso())}"></div>
        <div><label for="v_time">שעה</label><input type="time" id="v_time" value="${esc(editing ? editing.time || '' : `${pad2(now.getHours())}:${pad2(now.getMinutes())}`)}"></div>
      </div>
      <label for="v_people">אנשי קשר / משתתפים</label><input id="v_people" placeholder="לא חובה" value="${esc(editing ? editing.people : '')}">
      <label for="v_purpose">מטרת הביקור</label><input id="v_purpose" placeholder="למשל: מעקב יעדים" value="${esc(editing ? editing.purpose : '')}">
      <h3 style="margin-top:14px">צ׳ק ליסט <span class="muted" id="chkCount">${checkedCount} מתוך ${checklist.length}</span></h3>
      ${checkboxes}
      <label for="v_sum">סיכום חופשי</label><textarea id="v_sum">${esc(editing ? editing.summary : '')}</textarea>
      <h3 style="margin-top:14px">משימות להמשך</h3>
      <div id="taskRows">${tasks}</div>
      <button class="btn ghost small" data-act="addTaskRow" style="margin-top:8px">הוספת משימה</button>
      <div class="row" style="margin-top:16px">
        <button class="btn" data-act="saveVisit" data-id="${esc(clinic.id)}">${editing ? 'שמירת שינויים' : 'שמירת ביקור'}</button>
      </div>
    </div>`;
}

/** קורא את כל ערכי הטופס מה-DOM */
function readForm(checklist) {
  const checks = checklist.map((_, i) => {
    const box = document.querySelector(`.vchk[data-i="${i}"]`);
    return box && box.checked ? 1 : 0;
  });
  const tasks = [...document.querySelectorAll('#taskRows > .card')].map(row => ({
    text: row.querySelector('.t_text').value.trim(),
    owner: row.querySelector('.t_owner').value.trim(),
    due: row.querySelector('.t_due').value,
    done: row.dataset.done === '1',
  })).filter(t => t.text);
  return {
    date: $('#v_date').value || todayIso(), time: $('#v_time').value,
    purpose: $('#v_purpose').value.trim(), people: $('#v_people').value.trim(),
    summary: $('#v_sum').value.trim(), checks, checklist: checklist.slice(), tasks,
  };
}

async function saveVisit(el) {
  const clinic = getClinic(el.dataset.id);
  if (!clinic || ui.busy) return;
  const editing = ui.editVisit ? store.visits.find(v => v.id === ui.editVisit) : null;
  if (!editing && !canVisit()) return;
  const form = readForm(editing ? visitChecklist(editing) : store.settings.checklist);

  ui.busy = true;
  if (editing) {
    const { ok, error } = await updateVisit(editing.id, form, todayIso());
    ui.busy = false;
    if (!ok) { toast(error ? errorText(error) : 'אין הרשאה לעדכן את הביקור'); return; }
    Object.assign(editing, form, { edited: todayIso() });
    logChange(`עריכת ביקור ב${clinic.name}`);
    ui.editVisit = null; ui.visitClinic = null; ui.showVisit = editing.id;
    toast('הביקור עודכן');
  } else {
    const { visit, error } = await insertVisit(clinic.id, me().id, form);
    ui.busy = false;
    if (error || !visit) { toast(error ? errorText(error) : 'השמירה נכשלה'); return; }
    store.visits.unshift(visit);
    logChange(`תיעוד ביקור ב${clinic.name}`);
    ui.visitClinic = null; ui.showVisit = visit.id;
    toast('הביקור נשמר');
  }
  requestRender();
  scrollTop();
}

export const handlers = {
  addTaskRow() {
    const holder = document.createElement('div');
    holder.innerHTML = taskRowHtml({});
    $('#taskRows').appendChild(holder.firstElementChild);
  },
  removeTaskRow(el) { const row = el.closest('#taskRows > .card'); if (row) row.remove(); },
  /** מעדכן את מונה הסעיפים שסומנו, בלי לצייר מחדש */
  visitCheckCount() {
    const total = document.querySelectorAll('.vchk').length;
    $('#chkCount').textContent = `${document.querySelectorAll('.vchk:checked').length} מתוך ${total}`;
  },
  saveVisit,
};
