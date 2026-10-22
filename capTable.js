/**
 * ui/components/capTable.js - טבלת "מאזן לפי קפיטציה" (2026 בלבד):
 * יעד מצטרפים, מצטרפים בפועל, עוזבים ומאזן. משמשת במסך הבית ובדף מרפאה.
 */
import { CAPS, CAPS_2026 } from '../../config.js';
import { esc, sign, signClass } from '../../utils/format.js';

const HEADER = `<thead><tr><th>קפיטציה</th><th>יעד מצטרפים</th><th>מצטרפים בפועל</th><th>עוזבים</th><th>מאזן</th></tr></thead>`;

/** שורה בטבלה. values: { target, j, l } כאשר null/undefined = לא דווח */
function row(label, target, j, l, boldTotal = false) {
  const cell = boldTotal ? 'th' : 'td';
  const reported = j !== null && l !== null && j !== undefined && l !== undefined;
  const balance = reported ? j - l : null;
  return `<tr>
    <${cell}>${esc(label)}</${cell}>
    <${cell}>${target ? esc(target) : '—'}</${cell}>
    <${cell}>${reported ? j : '—'}</${cell}>
    <${cell}>${reported ? l : '—'}</${cell}>
    <${cell} class="${reported ? signClass(balance) : ''}">${reported ? sign(balance) : '—'}</${cell}>
  </tr>`;
}

/**
 * טבלה לקבוצת מרפאות.
 * @param series  תוצאת capSeries
 * @param futureTarget יעד כולל לקפיטציה שעוד לא דווחה (מוצג בשורה ריקה)
 * @param total   { target, j, l } לשורת סיכום, או null
 */
export function capTable(series, futureTarget, total) {
  const rows = CAPS_2026.map(i => {
    const s = series[i];
    return row(CAPS[i], s ? s.tt : futureTarget, s ? s.j : null, s ? s.l : null);
  }).join('');
  const totalRow = total ? row('סה״כ 2026', Math.round(total.target), total.j, total.l, true) : '';
  return `<div class="scroll"><table>${HEADER}<tbody>${rows}${totalRow}</tbody></table></div>
    <div class="muted" style="margin-top:6px">היעד כולל רק יחידות שהוגדר להן יעד. שורת הסיכום כוללת קפיטציות שדווחו בלבד.</div>`;
}

/** טבלה למרפאה אחת: היעד הוא של המרפאה עצמה */
export function clinicCapTable(clinic, stats) {
  const rows = CAPS_2026.map(i => {
    const j = clinic.j[i];
    const l = clinic.l[i];
    return row(CAPS[i], clinic.target > 0 ? clinic.target : null, j, l);
  }).join('');
  const total = stats.n ? row('סה״כ 2026', stats.yt ? Math.round(stats.yt) : null, stats.j, stats.l, true) : '';
  return `<div class="scroll"><table>${HEADER}<tbody>${rows}${total}</tbody></table></div>`;
}
