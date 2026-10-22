/**
 * utils/format.js - פונקציות עזר טהורות לעיצוב טקסט ותאריכים.
 * אין כאן תלות במצב האפליקציה או ב-DOM.
 */

/** מנקה טקסט לפני הכנסה ל-HTML (הגנה מפני הזרקת קוד). חובה לכל טקסט שמגיע ממשתמש או מבסיס הנתונים. */
export function esc(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => map[ch]);
}

const pad2 = n => String(n).padStart(2, '0');

/** תאריך כ-YYYY-MM-DD לפי השעון המקומי */
export function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** התאריך של היום (מחושב בכל קריאה, כדי שלא יתיישן אם הדף נשאר פתוח עד למחרת) */
export function todayIso() {
  return isoDate(new Date());
}

/** תאריך יחסי להיום: addDays(-20) הוא לפני 20 יום */
export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** YYYY-MM-DD ל-DD/MM/YYYY */
export function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** תאריך ושעה מלאים (ISO) להצגה: 20/10/2026 14:30 */
export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** ערך לשדה datetime-local (YYYY-MM-DDTHH:MM) מתוך תאריך ISO */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${isoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** מספר עם סימן: 5 -> "+5", -3 -> "-3", 0 -> "0" */
export function sign(n) {
  return (n > 0 ? '+' : '') + n;
}

/** CSS class לפי סימן המספר: ירוק לחיובי, אדום לשלילי */
export function signClass(n) {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
}

/** ממיר ערך משדה טופס למספר שלם, או null אם ריק או לא תקין */
export function toInt(value) {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) return null;
  return Math.round(Number(value));
}

/** אחוז להצגה: 71.4 -> "71%". עבור null מחזיר את הטקסט החלופי */
export function pctLabel(p, fallback = 'לא דווח') {
  return p === null || p === undefined ? fallback : `${Math.round(p)}%`;
}

/** מסתיר את רוב ספרות ת.ז: 123456782 -> "•••••6782" */
export function maskId(id) {
  return id ? `•••••${String(id).slice(-4)}` : '—';
}

/** פונקציית מיון לפי סדר האלף-בית העברי: list.sort(localeSort) */
export function localeSort(a, b) {
  return a.localeCompare(b, 'he');
}
