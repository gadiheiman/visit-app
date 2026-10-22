/**
 * ui/screens/leadTable.js - טבלת מעקב הלידים: סינון לפי סטטוס וחיפוש, ופאנל עדכון סטטוס.
 */
import { ui, store } from '../../core/state.js';
import { esc, fmtDateTime, maskId, isoDate, todayIso } from '../../utils/format.js';
import { LEAD_STATUSES, LEAD_STATUS_FOLLOWUP } from '../../config.js';
import { isManagerView, coordinators, userName, me } from '../../domain/permissions.js';
import { options } from '../components/formFields.js';
import { pill } from '../components/pill.js';
import { emptyNote } from '../components/card.js';

/** צבע תגית לכל סטטוס */
const STATUS_TONE = {
  'חדש': 'info', 'אין מענה': 'na', 'המשך טיפול': 'warn', 'לא מעוניין': 'bad', 'בוצע מעבר': 'good',
};

/** הלידים לפי הסינונים. מסודרים: שיחות מעקב קרובות קודם, ואז החדשים ביותר */
function filteredLeads() {
  const s = ui.leads;
  const q = s.search.trim();
  const list = store.leads.filter(l =>
    (!s.statusFilter || l.status === s.statusFilter)
    && (!s.coordFilter || l.ownerId === s.coordFilter)
    && (!q || [l.firstName, l.lastName, l.phone, l.idNumber, l.city].some(x => String(x).indexOf(q) >= 0)));
  const followupKey = l => (l.status === LEAD_STATUS_FOLLOWUP && l.followupAt ? l.followupAt : '9999');
  return list.sort((a, b) => followupKey(a).localeCompare(followupKey(b)) || b.createdAt.localeCompare(a.createdAt));
}

/** צ'יפים עם ספירה לכל סטטוס */
function statusChips() {
  const counts = {};
  store.leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
  const chip = (value, label, count) =>
    `<button class="chip" data-act="leadStatusFilter" data-value="${esc(value)}" aria-pressed="${ui.leads.statusFilter === value}">${esc(label)} (${count})</button>`;
  return `<div class="chips" role="group" aria-label="סינון לפי סטטוס">
    ${chip('', 'הכול', store.leads.length)}${LEAD_STATUSES.map(s => chip(s, s, counts[s] || 0)).join('')}</div>`;
}

/** שורת סיכום: שיחות מעקב להיום ובאיחור */
function followupBanner() {
  const now = new Date();
  const todayLocal = todayIso();
  const due = store.leads.filter(l => l.status === LEAD_STATUS_FOLLOWUP && l.followupAt);
  const overdue = due.filter(l => new Date(l.followupAt) < now).length;
  const today = due.filter(l => isoDate(new Date(l.followupAt)) === todayLocal && new Date(l.followupAt) >= now).length;
  if (!overdue && !today) return '';
  return `<div class="muted" style="margin:6px 0">שיחות מעקב: ${today ? `<b>${today}</b> להיום` : ''}${today && overdue ? ' · ' : ''}${overdue ? `<b class="neg">${overdue}</b> באיחור` : ''}</div>`;
}

function followupCell(lead) {
  if (lead.status !== LEAD_STATUS_FOLLOWUP || !lead.followupAt) return '—';
  const late = new Date(lead.followupAt) < new Date();
  return `<span class="${late ? 'neg' : ''}">${fmtDateTime(lead.followupAt)}</span>`;
}

function rowHtml(lead, showOwner) {
  return `<tr>
    <td>${fmtDateTime(lead.createdAt).slice(0, 10)}</td>
    <td>${esc(lead.firstName)} ${esc(lead.lastName)}</td>
    <td dir="ltr">${maskId(lead.idNumber)}</td>
    <td dir="ltr"><a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a></td>
    <td>${esc(lead.city)}</td>
    <td>${esc(lead.source)}</td>
    <td>${pill(lead.status, STATUS_TONE[lead.status] || 'na')}</td>
    <td>${followupCell(lead)}</td>
    ${showOwner ? `<td>${esc(userName(lead.ownerId))}</td>` : ''}
    <td><button class="btn ghost small" data-act="editLead" data-id="${esc(lead.id)}">עדכון</button></td>
  </tr>`;
}

/** פאנל עדכון סטטוס לליד שנבחר */
function editPanel() {
  const s = ui.leads;
  const lead = store.leads.find(l => l.id === s.editId);
  if (!lead) return '';
  const showFollowup = s.editDraft.status === LEAD_STATUS_FOLLOWUP;
  const deleteArea = me().role === 'admin' ? (s.confirmDelete === lead.id
    ? `<div class="row3"><button class="btn danger" data-act="deleteLeadYes" data-id="${esc(lead.id)}">כן, למחוק</button>
         <button class="btn ghost" data-act="deleteLeadNo">ביטול</button></div>`
    : `<button class="btn danger small" style="margin-top:10px" data-act="deleteLead" data-id="${esc(lead.id)}">מחיקת ליד</button>`) : '';
  return `<div class="card" style="border-color:var(--primary)">
    <h3>עדכון ליד: ${esc(lead.firstName)} ${esc(lead.lastName)}</h3>
    <label for="le_status">סטטוס</label>
    <select id="le_status" data-chg="leadEditStatus">${options(LEAD_STATUSES, s.editDraft.status)}</select>
    <div class="lead-fu" id="le_followup_wrap"${showFollowup ? '' : ' hidden'}>
      <label for="le_followup">מועד לשיחה נוספת (תאריך ושעה)</label>
      <input type="datetime-local" id="le_followup" data-inp="leadEditFollowup" data-chg="leadEditFollowup" value="${esc(s.editDraft.followup)}">
    </div>
    <div class="field-err" role="alert"${s.editError ? '' : ' hidden'}>${esc(s.editError)}</div>
    <div class="row" style="margin-top:12px">
      <button class="btn" data-act="saveLeadEdit" data-id="${esc(lead.id)}">שמירה</button>
      <button class="btn ghost" data-act="cancelLeadEdit">ביטול</button>
    </div>${deleteArea}</div>`;
}

export function leadTableHtml() {
  const s = ui.leads;
  const leads = filteredLeads();
  s.shown = leads;   // לייצוא לאקסל
  const managers = isManagerView();
  const coordFilter = managers ? `<div><label for="ld_coord">רכז/ת</label>
    <select id="ld_coord" data-chg="leadCoordFilter"><option value="">כל הרכזים</option>
      ${options(coordinators().map(u => u.id), s.coordFilter, userName)}</select></div>` : '';
  const head = `<tr><th>נפתח</th><th>שם</th><th>ת.ז</th><th>טלפון</th><th>עיר</th><th>מקור</th><th>סטטוס</th><th>שיחה נוספת</th>${managers ? '<th>רכז/ת</th>' : ''}<th></th></tr>`;
  const body = leads.length
    ? `<div class="scroll"><table class="lead-table"><thead>${head}</thead><tbody>${leads.map(l => rowHtml(l, managers)).join('')}</tbody></table></div>`
    : emptyNote(store.leads.length ? 'אין לידים שמתאימים לסינון.' : 'עדיין לא נוספו לידים.');
  return `${editPanel()}
    <div class="card">
      <div class="row between"><h3 style="margin:0">טבלת מעקב לידים (${leads.length})</h3>
        <button class="btn small" data-act="exportLeads">ייצוא לאקסל</button></div>
      ${followupBanner()}${statusChips()}
      <div class="grid2">
        <div><label for="ld_search">חיפוש (שם, טלפון, ת.ז, עיר)</label>
          <input id="ld_search" type="search" data-inp="leadSearch" value="${esc(s.search)}"></div>
        ${coordFilter}
      </div>
      ${body}
    </div>`;
}
