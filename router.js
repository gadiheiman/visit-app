/**
 * ui/router.js - הנתב: מחליט איזה מסך לצייר, ומטפל במעבר בין מסכים.
 *
 * כדי להוסיף מסך: ליצור קובץ ב-ui/screens שמייצא render() ו-handlers,
 * להוסיף אותו ל-SCREENS כאן, ולהוסיף לשונית ב-ui/components/tabs.js.
 */
import { ui } from '../core/state.js';
import { $, scrollTop } from '../core/dom.js';
import { setRenderer, setNavigator } from '../core/bus.js';
import { loadVisits, loadLeads, loadLog } from '../api/loaders.js';
import { renderTabs, renderWho } from './components/tabs.js';
import { showLogin } from './screens/login.js';
import * as home from './screens/home.js';
import * as clinics from './screens/clinics.js';
import * as clinicDetail from './screens/clinicDetail.js';
import * as visits from './screens/visits.js';
import * as leads from './screens/leads.js';
import * as admin from './screens/admin.js';
import * as account from './screens/account.js';

/** מסך לכל לשונית. בלשונית "יחידות" הנתב בוחר בין הרשימה לדף המרפאה */
const SCREENS = {
  home,
  clinics: { render: () => (ui.clinicId ? clinicDetail.render() || clinics.render() : clinics.render()) },
  visits,
  leads,
  admin,
  account,
};

/** מצייר את המסך הנוכחי (או את מסך הכניסה אם אין משתמש מחובר) */
export function render() {
  if (!ui.userId) { showLogin(); return; }
  renderTabs(ui.tab);
  renderWho();
  const screen = SCREENS[ui.tab] || home;
  $('#app').innerHTML = screen.render();
}

/** מסכים שכדאי לרענן מהשרת בכל כניסה אליהם (כדי לראות מה שאחרים עדכנו) */
const REFRESH_ON_ENTER = {
  home: [loadVisits],
  visits: [loadVisits],
  leads: [loadLeads],
  admin: [loadLog],
};

/** האם המשתמש באמצע מילוי טופס (כדי לא לצייר מחדש ולמחוק את מה שהקליד) */
const isEditingForm = () => ui.visitClinic || ui.editVisit || ui.editClinic;

/** עובר ללשונית. extra = מצב תצוגה נוסף, למשל { clinicId } */
export function navigate(tab, extra) {
  ui.tab = tab;
  ui.clinicId = null;
  ui.editClinic = false;
  ui.visitClinic = null;
  ui.showVisit = null;
  ui.editVisit = null;
  ui.confirmDeleteVisit = null;
  Object.assign(ui, extra || {});
  render();
  scrollTop();

  // רענון ברקע אחרי הציור הראשון
  (REFRESH_ON_ENTER[tab] || []).forEach(loader => {
    loader().then(() => { if (ui.tab === tab && !isEditingForm()) render(); }).catch(() => {});
  });
}

/** חיבור הנתב למתווך, כדי שמסכים יוכלו לבקש ציור וניווט בלי להכיר אותו */
export function initRouter() {
  setRenderer(render);
  setNavigator(navigate);
}

/** פעולת הלשוניות בסרגל התחתון */
export const handlers = {
  goTab(el) { navigate(el.dataset.tab); },
};
