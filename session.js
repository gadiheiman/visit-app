/**
 * core/session.js - תחילת וסיום "ישיבה" של משתמש: טעינת הנתונים אחרי כניסה וניקוי ביציאה.
 */
import { ui, resetUi, clearStore } from './state.js';
import { requestRender } from './bus.js';
import { $ } from './dom.js';
import { loadAll } from '../api/loaders.js';
import { signOut } from '../api/auth.js';
import { me } from '../domain/permissions.js';
import { errorText } from './dom.js';

/**
 * נקרא אחרי כניסה מוצלחת (או כשמתגלה כניסה קיימת בטעינת הדף).
 * @returns {Promise<{error?:string}>}
 */
export async function startSession(userId) {
  ui.userId = userId;
  $('#app').innerHTML = '<div class="empty">טוען נתונים…</div>';
  try {
    await loadAll();
  } catch (e) {
    ui.userId = null;
    return { error: 'שגיאה בטעינת הנתונים: ' + errorText(e) };
  }
  if (me().role === 'none') {
    await signOut();
    ui.userId = null;
    return { error: 'למשתמש הזה אין הרשאות במערכת' };
  }
  resetUi();
  requestRender();
  return {};
}

/** ניקוי כל מה שנטען, כדי שמשתמש הבא באותו דפדפן לא יראה שאריות */
export function endSession() {
  clearStore();
  resetUi();
  ui.userId = null;
}
