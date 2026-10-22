/**
 * domain/metrics.js - כל החישובים של המערכת. פונקציות טהורות: מקבלות נתונים ומחזירות מספרים,
 * בלי לצייר דבר. כך קל לבדוק אותן ולשנות כללי חישוב במקום אחד.
 *
 * מושגים:
 *  - יעד: מספר מצטרפים לקפיטציה (נקבע מראש לכל קפיטציות 2026).
 *  - אחוז מהיעד: מצטרפים בפועל חלקי (יעד x מספר הקפיטציות שדווחו).
 *  - מאזן: מצטרפים פחות עוזבים.
 */
import { store } from '../core/state.js';
import {
  CAPS_2026, CAPS_PER_YEAR, CAP_COUNT, FIRST_CAP_2026, TARGET_ALERT_PCT,
} from '../config.js';

/** האם נתוני קפיטציה דווחו (גם מצטרפים וגם עוזבים) */
export function isReported(clinic, capIndex) {
  return clinic.j[capIndex] !== null && clinic.l[capIndex] !== null;
}

/**
 * סטטיסטיקה של מרפאה אחת ל-2026.
 * @returns {{j,l,bal,n,tg,yt,ya,pct}} n = קפיטציות שדווחו, tg = יעד לקפיטציה,
 *   yt = יעד יחסי (tg x n), ya = יעד שנתי, pct = אחוז מהיעד היחסי (או null אם אין יעד)
 */
export function clinicStats(clinic) {
  let joiners = 0, leavers = 0, reported = 0;
  CAPS_2026.forEach(i => {
    if (isReported(clinic, i)) {
      joiners += clinic.j[i];
      leavers += clinic.l[i];
      reported++;
    }
  });
  const perCap = clinic.target > 0 ? clinic.target : null;
  const relative = perCap ? perCap * reported : null;
  return {
    j: joiners, l: leavers, bal: joiners - leavers, n: reported,
    tg: perCap, yt: relative, ya: perCap ? perCap * CAPS_PER_YEAR : null,
    pct: relative ? (joiners / relative) * 100 : null,
  };
}

/** סיכום של קבוצת מרפאות (מינהלת, כל היחידות וכו') */
export function aggregate(clinics) {
  let J = 0, L = 0, withTargetJ = 0, relTarget = 0, annualTarget = 0, maxReported = 0, reportingClinics = 0;
  clinics.forEach(c => {
    const s = clinicStats(c);
    J += s.j;
    L += s.l;
    if (s.n > maxReported) maxReported = s.n;
    if (s.n) reportingClinics++;
    if (s.yt) { withTargetJ += s.j; relTarget += s.yt; annualTarget += s.ya; }
  });
  return {
    J, L, bal: J - L,
    jt: withTargetJ, tt: relTarget, ta: annualTarget,
    nmax: maxReported, reporting: reportingClinics,
    targetPct: relTarget ? (withTargetJ / relTarget) * 100 : null,
  };
}

/**
 * סיכום לפי קפיטציה לקבוצת מרפאות: מצטרפים, עוזבים, מאזן ויעד (רק 2026).
 * איבר null = אף יחידה לא דיווחה על הקפיטציה.
 */
export function capSeries(clinics) {
  const series = [];
  for (let i = 0; i < CAP_COUNT; i++) {
    let j = 0, l = 0, any = false, targetOfReporters = 0;
    clinics.forEach(c => {
      if (!isReported(c, i)) return;
      j += c.j[i];
      l += c.l[i];
      any = true;
      if (c.target > 0 && i >= FIRST_CAP_2026) targetOfReporters += c.target;
    });
    series.push(any ? { j, l, bal: j - l, tt: targetOfReporters } : null);
  }
  return series;
}

/** האינדקס של הקפיטציה האחרונה שדווחה בקבוצה, או -1 */
export function lastReportedCap(series) {
  for (let i = series.length - 1; i >= 0; i--) if (series[i]) return i;
  return -1;
}

/** סכום סיבות עזיבה לפי סיבה, בטווח קפיטציות. מחזיר { אינדקס סיבה: סכום } */
export function reasonTotals(clinics, capIndexes) {
  const totals = {};
  clinics.forEach(c => {
    Object.keys(c.rs).forEach(reason => {
      const perCap = c.rs[reason];
      const sum = capIndexes.reduce((s, i) => s + (perCap[i] || 0), 0);
      if (sum) totals[reason] = (totals[reason] || 0) + sum;
    });
  });
  return totals;
}

/** כל המשימות הפתוחות בביקורים של קבוצת מרפאות */
export function openTasks(clinics) {
  const ids = new Set(clinics.map(c => c.id));
  const result = [];
  store.visits.forEach(visit => {
    if (!ids.has(visit.clinicId)) return;
    visit.tasks.forEach((task, index) => {
      if (!task.done) result.push({ visit, task, index });
    });
  });
  return result;
}

/** תאריך הביקור האחרון במרפאה, או null */
export function lastVisitDate(clinicId) {
  let last = null;
  store.visits.forEach(v => {
    if (v.clinicId === clinicId && (!last || v.date > last)) last = v.date;
  });
  return last;
}

/** האם יעד המשימה עבר (ולא בוצעה) */
export function isOverdue(task, today) {
  return !task.done && task.due && task.due < today;
}

// ---------- גודל מרפאה ----------

/** גודל לפי מספר מבוטחים: 'large' | 'medium' | 'small', או null למאגרים, בתי חולים ויחידות ללא נתון */
export function sizeOf(clinic) {
  if (clinic.pool || clinic.hospital || clinic.ins === null || clinic.ins === undefined) return null;
  const { medium, large } = store.settings.sizeThresholds;
  if (clinic.ins >= large) return 'large';
  if (clinic.ins >= medium) return 'medium';
  return 'small';
}

export const SIZE_LABELS = { large: 'גדולה', medium: 'בינונית', small: 'קטנה' };

// ---------- מרפאות בפיגור ----------

/**
 * מרפאות שמתחת לאחוז היעד, מהנמוכה לגבוהה.
 * @param {boolean} includeSmall האם לכלול גם מרפאות קטנות (ברירת מחדל: רק בינוניות וגדולות)
 * @returns {{clinic, stats, size}[]}
 */
export function belowTargetClinics(clinics, includeSmall = false) {
  return clinics
    .filter(c => !c.pool && !c.hospital)
    .map(clinic => ({ clinic, stats: clinicStats(clinic), size: sizeOf(clinic) }))
    .filter(x => x.stats.pct !== null && x.stats.pct < TARGET_ALERT_PCT)
    .filter(x => includeSmall || x.size === 'medium' || x.size === 'large')
    .sort((a, b) => a.stats.pct - b.stats.pct);
}

/** צבע תגית לפי אחוז מהיעד: מתחת לסף = אדום, עד 100% = כתום, מעל = ירוק */
export function targetTone(pct) {
  if (pct === null || pct === undefined) return 'na';
  if (pct >= 100) return 'good';
  if (pct >= TARGET_ALERT_PCT) return 'warn';
  return 'bad';
}

/** צבע תגית לפי אחוז השלמה (צ'ק ליסט) */
export function completionTone(pct) {
  return pct >= 85 ? 'good' : pct >= 60 ? 'warn' : 'bad';
}
