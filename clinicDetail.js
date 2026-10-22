/**
 * ui/screens/clinicDetail.js - דף מרפאה: כותרת ופעולות, מאזן ונתוני מרפאה, מאזן לפי קפיטציה,
 * סיבות עזיבה והיסטוריית ביקורים.
 */
import { ui, store } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { $, toast, errorText } from '../../core/dom.js';
import { esc, fmtDate, sign, pctLabel, toInt } from '../../utils/format.js';
import { CAPS_2026, MG_NAMES, CAPS_PER_YEAR, FIRST_CAP_2026, CAP_COUNT } from '../../config.js';
import { getClinic, canEditClinic, canEditTargets, canVisit } from '../../domain/permissions.js';
import { clinicStats, reasonTotals, targetTone, sizeOf, SIZE_LABELS } from '../../domain/metrics.js';
import { saveClinicData } from '../../api/clinicsApi.js';
import { pill } from '../components/pill.js';
import { card, backButton, emptyNote } from '../components/card.js';
import { stackedStats, bigNumber, keyValue } from '../components/statRows.js';
import { clinicCapTable } from '../components/capTable.js';
import { visitItem } from '../components/visitItem.js';
import { editFormHtml } from './clinicEditForm.js';

/** כרטיס כותרת: שם, תגית אחוז מהיעד, מקור הנתונים וכפתורי פעולה */
function headerCard(clinic, stats, canEdit) {
  const badge = stats.pct === null ? '' : pill(`${pctLabel(stats.pct)} מהיעד`, targetTone(stats.pct));
  // מאגר מבוטחים אינו מרפאה פיזית, ולכן לא מתעדים בו ביקורים
  const visitButton = canVisit() && !clinic.pool ? `<button class="btn" data-act="newVisit" data-id="${esc(clinic.id)}">דיווח ביקור חדש</button>` : '';
  const editButton = canEdit ? `<button class="btn ghost" data-act="toggleClinicEdit">${ui.editClinic ? 'סגירת עדכון' : 'עדכון נתונים'}</button>` : '';
  return `<div class="card">
    <div class="row between">
      <div style="min-width:0"><div style="font-size:1.2rem;font-weight:800">${esc(clinic.name)}</div>
        <div class="muted">${esc([MG_NAMES[clinic.mg], clinic.kind].filter(Boolean).join(' · '))}</div></div>
      ${badge}
    </div>
    <div class="muted" style="margin-top:8px">עודכן ${fmtDate(clinic.updated)} · מקור: ${esc(clinic.source)}</div>
    <div class="row" style="margin-top:12px;flex-wrap:wrap">${visitButton}${editButton}</div>
  </div>`;
}

/** כרטיס המאזן: מצטרפים, עוזבים, יעד, ביצוע ושארית ליעד השנתי */
function balanceCard(clinic, s) {
  if (!s.n) {
    const text = clinic.hospital
      ? 'אין נתונים בקובץ עבור היחידה הזו. ניתן להזין אותם ידנית.'
      : 'אין נתוני קפיטציות ב־2026.';
    return card('מאזן', `<div class="muted">${text}</div>`);
  }
  const items = [{ label: 'מצטרפים', value: s.j }, { label: 'עוזבים', value: s.l }];
  if (s.yt) {
    items.push(
      { label: 'יעד לקפיטציה', value: s.tg },
      { label: 'ביצוע מול יעד', value: pctLabel(s.pct) },
      { label: 'יעד שנתי', value: s.ya },
      { label: 'נותרו ליעד', value: Math.max(0, s.ya - s.j) });
  } else {
    items.push({ label: 'יעד', value: 'לא הוגדר' });
  }
  return card('מאזן',
    `${bigNumber(sign(s.bal), s.bal >= 0 ? 'pos' : 'neg')}
     <div class="muted">מאזן 2026 (${s.n} מתוך ${CAPS_PER_YEAR} קפיטציות)</div>${stackedStats(items)}`);
}

/** כרטיס נתוני המרפאה (ישוב, כתובת, מנהלים, מבוטחים...) */
function infoCard(clinic) {
  const size = sizeOf(clinic);
  const fields = [
    ['ישוב', clinic.town], ['כתובת', clinic.addr], ['מגזר', clinic.sector], ['סוג יחידה', clinic.kind],
    ['גודל מרפאה', size ? SIZE_LABELS[size] : null],
    ['מנהל רפואי', clinic.dr], ['מנהל אדמיניסטרטיבי', clinic.adm], ['מנהל סיעוד', clinic.nur],
    ['מספר מבוטחים', clinic.ins != null ? clinic.ins.toLocaleString('he-IL') : null],
    ['קוד מרפאה', clinic.code],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  return card('נתוני מרפאה', fields.map(([label, value]) => keyValue(label, value)).join(''));
}

/** סיבות עזיבה ב-2026 (ינואר עד ספטמבר) */
function reasonsCard(clinic) {
  const totals = reasonTotals([clinic], CAPS_2026.slice(0, 5));
  const keys = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  if (!keys.length) return '';
  const sum = keys.reduce((s, k) => s + totals[k], 0);
  const rows = keys.map(k => `<tr><td>${esc(store.reasons[k])}</td>
    <td><b>${totals[k]}</b> <span class="muted">(${Math.round(totals[k] / sum * 100)}%)</span></td></tr>`).join('');
  return card('סיבות עזיבה',
    `<div class="scroll"><table><thead><tr><th>סיבה</th><th>ינו׳–ספט׳ 2026</th></tr></thead><tbody>${rows}</tbody></table></div>
     <div class="muted" style="margin-top:6px">סיבות העזיבה מדווחות בקובץ בנפרד, וסכומן לא תמיד זהה למספר העוזבים בגיליון המאזן.</div>`);
}

function historyCard(clinic) {
  const visits = store.visits.filter(v => v.clinicId === clinic.id).sort((a, b) => b.date.localeCompare(a.date));
  return card('היסטוריית ביקורים',
    visits.length ? `<div class="list">${visits.map(visitItem).join('')}</div>` : emptyNote('עדיין לא תועדו ביקורים ביחידה זו.'));
}

export function render() {
  const clinic = getClinic(ui.clinicId);
  if (!clinic) { ui.clinicId = null; return ''; }
  const stats = clinicStats(clinic);
  const canEdit = canEditClinic(clinic);
  return `${backButton('backToClinics', 'חזרה לרשימה')}
    ${headerCard(clinic, stats, canEdit)}
    ${ui.editClinic && canEdit ? editFormHtml(clinic) : ''}
    <div class="grid2 dash">${balanceCard(clinic, stats)}${infoCard(clinic)}</div>
    ${card('מאזן לפי קפיטציה', clinicCapTable(clinic, stats))}
    ${reasonsCard(clinic)}
    ${historyCard(clinic)}`;
}

// ---------- שמירת עדכון נתונים ----------

/** קורא את הערכים מהטופס. שדה נעול (disabled) נשאר כמו שהוא */
function readFormValues(clinic) {
  const joiners = clinic.j.slice();
  const leavers = clinic.l.slice();
  for (let i = FIRST_CAP_2026; i < CAP_COUNT; i++) {
    const jField = $('#cj' + i);
    const lField = $('#cl' + i);
    if (jField && !jField.disabled) { const v = toInt(jField.value); joiners[i] = v !== null && v < 0 ? null : v; }
    if (lField && !lField.disabled) { const v = toInt(lField.value); leavers[i] = v !== null && v < 0 ? null : v; }
  }
  let target = clinic.target;
  if (canEditTargets() && $('#e_t')) {
    const t = toInt($('#e_t').value);
    target = t && t > 0 ? t : null;
  }
  return { joiners, leavers, target };
}

async function saveEdit(el) {
  const clinic = getClinic(el.dataset.id);
  if (!clinic || !canEditClinic(clinic) || ui.busy) return;
  const { joiners, leavers, target } = readFormValues(clinic);
  ui.busy = true;
  const result = await saveClinicData(clinic.id, joiners, leavers, target);
  ui.busy = false;
  if (result.error) { toast(errorText(result.error)); return; }
  if (result.clinic) Object.assign(clinic, result.clinic);
  ui.editClinic = false;
  toast('הנתונים נשמרו');
  requestRender();
}

export const handlers = {
  backToClinics() { ui.clinicId = null; ui.editClinic = false; requestRender(); },
  toggleClinicEdit() { ui.editClinic = !ui.editClinic; requestRender(); },
  saveClinicEdit: saveEdit,
};

