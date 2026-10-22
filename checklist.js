/**
 * domain/checklist.js - צ'ק ליסט של ביקור.
 * כל ביקור שומר עותק של הסעיפים שהיו בזמן הביקור, כדי ששינוי הרשימה בהמשך
 * לא יעוות סימונים של ביקורים ישנים.
 */
import { store } from '../core/state.js';

/** הסעיפים של ביקור מסוים (העותק השמור, ואם אין, הרשימה הנוכחית) */
export function visitChecklist(visit) {
  return visit && visit.checklist && visit.checklist.length ? visit.checklist : store.settings.checklist;
}

/** אחוז הסעיפים שסומנו בביקור */
export function completionPct(visit) {
  const items = visitChecklist(visit);
  if (!items.length) return 0;
  return Math.round(visit.checks.filter(Boolean).length / items.length * 100);
}
