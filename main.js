/**
 * main.js - נקודת הכניסה: מחבר את כל החלקים ומפעיל את האפליקציה.
 * אין כאן לוגיקה עסקית. רק חיווט: פעולות, נתב, אירועים וכניסה.
 */
import { initEvents, registerHandlers } from './core/events.js';
import { startSession, endSession } from './core/session.js';
import { currentUserId, onSignedOut } from './api/auth.js';
import { initRouter, handlers as routerHandlers } from './ui/router.js';
import { showLogin, handlers as loginHandlers } from './ui/screens/login.js';
import { handlers as homeHandlers } from './ui/screens/home.js';
import { handlers as clinicsHandlers } from './ui/screens/clinics.js';
import { handlers as clinicDetailHandlers } from './ui/screens/clinicDetail.js';
import { handlers as visitsHandlers } from './ui/screens/visits.js';
import { handlers as visitDetailHandlers } from './ui/screens/visitDetail.js';
import { handlers as visitFormHandlers } from './ui/screens/visitForm.js';
import { handlers as leadsHandlers } from './ui/screens/leads.js';
import { handlers as adminHandlers } from './ui/screens/admin.js';
import { handlers as accountHandlers } from './ui/screens/account.js';

/** רושם את הפעולות של כל המסכים. שם פעולה כפול בין מסכים יגרום לשגיאה מיד באתחול */
function registerAllHandlers() {
  [
    routerHandlers, loginHandlers, homeHandlers, clinicsHandlers, clinicDetailHandlers,
    visitsHandlers, visitDetailHandlers, visitFormHandlers, leadsHandlers, adminHandlers, accountHandlers,
  ].forEach(registerHandlers);
}

/** אם כבר יש כניסה פעילה (אחרי רענון הדף), ממשיכים ממנה. אחרת מציגים מסך כניסה. */
async function boot() {
  const userId = await currentUserId();
  if (!userId) { showLogin(); return; }
  const result = await startSession(userId);
  if (result.error) showLogin(result.error);
}

export function startApp() {
  initRouter();
  registerAllHandlers();
  initEvents();
  onSignedOut(() => { endSession(); showLogin(); });
  return boot();
}

startApp();
