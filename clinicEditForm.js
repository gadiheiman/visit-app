/**
 * ui/screens/clinicEditForm.js - טופס עדכון נתוני קפיטציה של מרפאה (2026 בלבד).
 * ערך שכבר קיים (נטען מהקובץ) נעול לרכזים, ורק מנהל יכול לשנות אותו.
 * שדה ריק נשמר כ"לא דווח" ולא כאפס.
 */
import { CAPS, CAPS_2026 } from '../../config.js';
import { esc } from '../../utils/format.js';
import { me, canEditTargets } from '../../domain/permissions.js';

/** שדה מספר אחד בטבלה; locked = נעול לעריכה */
function numberCell(id, value, locked) {
  return `<td><input type="number" inputmode="numeric" id="${id}" value="${value === null ? '' : value}"${locked ? ' disabled' : ''}></td>`;
}

export function editFormHtml(clinic) {
  const isAdmin = me().role === 'admin';
  const rows = CAPS_2026.map(i => `<tr>
    <td>${esc(CAPS[i])}</td>
    ${numberCell('cj' + i, clinic.j[i], !isAdmin && clinic.j0[i] !== null)}
    ${numberCell('cl' + i, clinic.l[i], !isAdmin && clinic.l0[i] !== null)}
  </tr>`).join('');
  const targetField = canEditTargets() && !clinic.pool
    ? `<label for="e_t">יעד מצטרפים לקפיטציה</label>
       <input type="number" inputmode="numeric" id="e_t" value="${clinic.target > 0 ? clinic.target : ''}">` : '';
  return `<div class="card" id="editBox">
    <h3>עדכון נתונים</h3>
    <div class="muted">נתונים שיובאו מהקובץ ננעלים לעריכה, וניתן לתקן אותם רק על ידי מנהל. שדה ריק נשמר כ״לא דווח״ ולא כאפס. כל שינוי נרשם ביומן.</div>
    <div class="scroll"><table><thead><tr><th>קפיטציה</th><th>מצטרפים</th><th>עוזבים</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${targetField}
    <div class="row" style="margin-top:14px">
      <button class="btn" data-act="saveClinicEdit" data-id="${esc(clinic.id)}">שמירת שינויים</button>
      <button class="btn ghost" data-act="toggleClinicEdit">ביטול</button>
    </div></div>`;
}
