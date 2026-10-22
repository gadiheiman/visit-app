/**
 * ui/screens/leads.js - מסך "מעקב לידים": טופס הוספה (leadForm.js) וטבלת מעקב (leadTable.js).
 * כאן נמצאות הפעולות שמחברות בין שני החלקים לבין השרת.
 *
 * מידע אישי: ת.ז וטלפון. הגישה מוגבלת בשרת (כל משתמש רואה את הלידים שפתח, מנהל ונופר רואים הכול).
 */
import { ui, store, emptyLeadsUi } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { toast, rerenderKeepingFocus } from '../../core/dom.js';
import { toLocalInput } from '../../utils/format.js';
import { LEAD_STATUS_FOLLOWUP } from '../../config.js';
import { me } from '../../domain/permissions.js';
import { insertLead, updateLeadStatus, deleteLead, leadErrorText } from '../../api/leadsApi.js';
import { logChange } from '../../api/logApi.js';
import { exportLeads } from '../../exports/leadsExcel.js';
import { leadFormHtml, validateDraft } from './leadForm.js';
import { leadTableHtml } from './leadTable.js';

export function render() {
  return `<h2 style="margin-top:4px">מעקב לידים</h2>${leadFormHtml()}${leadTableHtml()}`;
}

/** מראה או מסתיר את אזור "מועד לשיחה נוספת" לפי הסטטוס, בלי לצייר את המסך מחדש */
function toggleFollowupField(wrapId, status) {
  const wrap = document.getElementById(wrapId);
  if (wrap) wrap.hidden = status !== LEAD_STATUS_FOLLOWUP;
}

// ---------- הוספת ליד ----------

async function saveLead() {
  if (ui.busy) return;
  const state = ui.leads;
  const { lead, error } = validateDraft(state.draft);
  if (error) { state.error = error; requestRender(); return; }
  ui.busy = true;
  const result = await insertLead(lead);
  ui.busy = false;
  if (result.error || !result.lead) {
    state.error = leadErrorText(result.error);
    requestRender();
    return;
  }
  store.leads.unshift(result.lead);
  logChange('הוספת ליד');            // בכוונה בלי פרטים אישיים
  state.draft = emptyLeadsUi().draft;
  state.error = '';
  toast('הליד נשמר');
  requestRender();
}

// ---------- עדכון ליד קיים ----------

async function saveLeadEdit(el) {
  if (ui.busy) return;
  const state = ui.leads;
  const lead = store.leads.find(l => l.id === el.dataset.id);
  if (!lead) return;
  const { status, followup } = state.editDraft;
  if (status === LEAD_STATUS_FOLLOWUP && !followup) {
    state.editError = 'בסטטוס "המשך טיפול" יש לבחור תאריך ושעה לשיחה נוספת.';
    requestRender();
    return;
  }
  const followupAt = status === LEAD_STATUS_FOLLOWUP ? new Date(followup).toISOString() : null;
  ui.busy = true;
  const result = await updateLeadStatus(lead.id, status, followupAt);
  ui.busy = false;
  if (result.error || !result.lead) { state.editError = leadErrorText(result.error) || 'אין הרשאה לעדכן'; requestRender(); return; }
  Object.assign(lead, result.lead);
  logChange('עדכון סטטוס ליד');
  state.editId = null; state.editError = '';
  toast('הליד עודכן');
  requestRender();
}

async function deleteLeadYes(el) {
  if (ui.busy || me().role !== 'admin') return;
  ui.busy = true;
  const { ok, error } = await deleteLead(el.dataset.id);
  ui.busy = false;
  if (!ok) { toast(leadErrorText(error) || 'אין הרשאה למחוק'); return; }
  store.leads = store.leads.filter(l => l.id !== el.dataset.id);
  logChange('מחיקת ליד');
  ui.leads.editId = null; ui.leads.confirmDelete = null;
  toast('הליד נמחק');
  requestRender();
}

// ---------- פעולות ----------

export const handlers = {
  /** עדכון טיוטת הטופס בכל הקלדה או בחירה */
  leadDraft(el) { ui.leads.draft[el.dataset.key] = el.value; },
  /** שינוי סטטוס בטופס: מעדכן את הטיוטה ומציג/מסתיר את שדה מועד השיחה */
  leadDraftStatus(el) {
    ui.leads.draft.status = el.value;
    toggleFollowupField('ld_followup_wrap', el.value);
  },
  saveLead,
  // טבלה
  leadStatusFilter(el) { ui.leads.statusFilter = el.dataset.value; requestRender(); },
  leadCoordFilter(el) { ui.leads.coordFilter = el.value; requestRender(); },
  leadSearch(el) { ui.leads.search = el.value; rerenderKeepingFocus('ld_search', requestRender); },
  exportLeads() { exportLeads(ui.leads.shown); },
  // פאנל עדכון
  editLead(el) {
    const lead = store.leads.find(l => l.id === el.dataset.id);
    if (!lead) return;
    ui.leads.editId = lead.id;
    ui.leads.editDraft = { status: lead.status, followup: toLocalInput(lead.followupAt) };
    ui.leads.editError = '';
    ui.leads.confirmDelete = null;
    requestRender();
    window.scrollTo(0, 0);
  },
  leadEditStatus(el) {
    ui.leads.editDraft.status = el.value;
    toggleFollowupField('le_followup_wrap', el.value);
  },
  leadEditFollowup(el) { ui.leads.editDraft.followup = el.value; },
  saveLeadEdit,
  cancelLeadEdit() { ui.leads.editId = null; ui.leads.editError = ''; requestRender(); },
  deleteLead(el) { ui.leads.confirmDelete = el.dataset.id; requestRender(); },
  deleteLeadNo() { ui.leads.confirmDelete = null; requestRender(); },
  deleteLeadYes,
};

