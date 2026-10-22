/**
 * ui/screens/leadForm.js - טופס הוספת ליד: תצוגה וולידציה.
 *
 * הטופס שומר "טיוטה" ב-ui.leads.draft בכל הקלדה, כדי שציור מחדש של המסך
 * (למשל בעת סינון הטבלה) לא ימחק מה שהוקלד.
 * שדה "מועד לשיחה נוספת" מוצג רק כשהסטטוס הוא "המשך טיפול".
 */
import { ui, store } from '../../core/state.js';
import { esc } from '../../utils/format.js';
import { normalizeIsraeliId, normalizePhone } from '../../utils/validate.js';
import { LEAD_STATUSES, LEAD_STATUS_FOLLOWUP } from '../../config.js';
import { options } from '../components/formFields.js';

/** שדה טקסט בטופס שמעדכן את הטיוטה בכל הקלדה */
function textField({ key, label, attrs = '' }) {
  const value = ui.leads.draft[key];
  return `<div><label for="ld_${key}">${esc(label)}</label>
    <input id="ld_${key}" data-inp="leadDraft" data-key="${key}" value="${esc(value)}" ${attrs}></div>`;
}

export function leadFormHtml() {
  const d = ui.leads.draft;
  const showFollowup = d.status === LEAD_STATUS_FOLLOWUP;
  return `<div class="card">
    <h3>טופס הוספת ליד</h3>
    ${textField({ key: 'idNumber', label: 'ת.ז', attrs: 'inputmode="numeric" maxlength="9" autocomplete="off" dir="ltr"' })}
    <div class="grid2">
      ${textField({ key: 'firstName', label: 'שם פרטי' })}
      ${textField({ key: 'lastName', label: 'שם משפחה' })}
    </div>
    ${textField({ key: 'phone', label: 'טלפון', attrs: 'type="tel" inputmode="tel" dir="ltr"' })}
    ${textField({ key: 'city', label: 'עיר מגורים' })}
    <label for="ld_source">מקור הליד</label>
    <select id="ld_source" data-chg="leadDraft" data-key="source">
      <option value="">בחרו מקור</option>${options(store.settings.leadSources, d.source)}
    </select>
    <label for="ld_status">סטטוס הליד</label>
    <select id="ld_status" data-chg="leadDraftStatus" data-key="status">${options(LEAD_STATUSES, d.status)}</select>
    <div class="lead-fu" id="ld_followup_wrap"${showFollowup ? '' : ' hidden'}>
      <label for="ld_followup">מועד לשיחה נוספת (תאריך ושעה)</label>
      <input type="datetime-local" id="ld_followup" data-inp="leadDraft" data-chg="leadDraft" data-key="followup" value="${esc(d.followup)}">
    </div>
    <div class="field-err" id="ld_error" role="alert"${ui.leads.error ? '' : ' hidden'}>${esc(ui.leads.error)}</div>
    <button class="btn" style="width:100%;margin-top:14px" data-act="saveLead">שמירת ליד</button>
  </div>`;
}

/**
 * בודק את הטיוטה ומחזיר ליד מוכן לשמירה, או הודעת שגיאה.
 * @returns {{lead?:object, error?:string}}
 */
export function validateDraft(draft) {
  const idNumber = normalizeIsraeliId(draft.idNumber);
  if (!idNumber) return { error: 'מספר תעודת הזהות אינו תקין.' };
  if (!draft.firstName.trim() || !draft.lastName.trim()) return { error: 'יש להזין שם פרטי ושם משפחה.' };
  const phone = normalizePhone(draft.phone);
  if (!phone) return { error: 'מספר הטלפון אינו תקין (למשל 0501234567).' };
  if (!draft.city.trim()) return { error: 'יש להזין עיר מגורים.' };
  if (!draft.source) return { error: 'יש לבחור מקור ליד.' };
  let followupAt = null;
  if (draft.status === LEAD_STATUS_FOLLOWUP) {
    if (!draft.followup) return { error: 'בסטטוס "המשך טיפול" יש לבחור תאריך ושעה לשיחה נוספת.' };
    followupAt = new Date(draft.followup).toISOString();
  }
  return {
    lead: {
      idNumber, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), phone,
      city: draft.city.trim(), source: draft.source, status: draft.status, followupAt,
    },
  };
}
