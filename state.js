/**
 * core/state.js - מקום אחד לכל מצב האפליקציה.
 *
 *  store - הנתונים שנטענו מהשרת (מרפאות, ביקורים, לידים, משתמשים והגדרות).
 *  ui    - מצב התצוגה (איזה מסך פתוח, מה מסונן, מה בעריכה).
 *
 * שני האובייקטים משותפים לכל המודולים, ולכן משנים את התכונות שלהם ולא מחליפים את האובייקט עצמו.
 */
import {
  DEFAULT_CHECKLIST, DEFAULT_LEAD_SOURCES, DEFAULT_SIZE_THRESHOLDS, LIST_PAGE_SIZE,
} from '../config.js';

/** נתונים מהשרת */
export const store = {
  users: [],          // פרופילים של כל המשתמשים (שם, תפקיד, מינהלת)
  clinics: [],        // רק המרפאות שמותר למשתמש הנוכחי לראות (הסינון נעשה בשרת)
  reasons: [],        // שמות סיבות העזיבה לפי אינדקס
  visits: [],         // ביקורים
  leads: [],          // לידים (רק של המשתמש, או כולם למנהל)
  log: [],            // יומן שינויים (למנהל בלבד)
  settings: {
    checklist: DEFAULT_CHECKLIST.slice(),
    leadSources: DEFAULT_LEAD_SOURCES.slice(),
    sizeThresholds: { ...DEFAULT_SIZE_THRESHOLDS },
  },
};

/** מצב התחלתי של מסך הלידים */
export function emptyLeadsUi() {
  return {
    draft: { idNumber: '', firstName: '', lastName: '', phone: '', city: '', source: '', status: 'חדש', followup: '' },
    error: '',
    statusFilter: '',
    search: '',
    coordFilter: '',
    editId: null,
    editDraft: { status: '', followup: '' },
    editError: '',
    confirmDelete: null,
    shown: [],        // הלידים שמוצגים כרגע בטבלה (לייצוא לאקסל)
  };
}

/** מצב תצוגה */
export const ui = {
  userId: null,             // מזהה המשתמש המחובר
  tab: 'home',              // המסך הפעיל
  busy: false,              // true בזמן שמירה, למניעת לחיצה כפולה
  // מרפאות
  clinicId: null,           // מרפאה פתוחה (דף מרפאה)
  editClinic: false,        // טופס עריכת נתוני מרפאה פתוח
  search: '',
  limit: LIST_PAGE_SIZE,
  filters: { mg: '', sector: '', kind: '', sort: 'bal' },
  // ביקורים
  visitClinic: null,        // מרפאה שבה ממלאים טופס ביקור
  showVisit: null,          // ביקור פתוח לצפייה
  editVisit: null,          // ביקור בעריכה
  confirmDeleteVisit: null,
  visitFilters: { clinic: '', coord: '', rc: '', status: '', period: '' },
  visitsShown: [],          // הביקורים שמוצגים כרגע (לייצוא לאקסל)
  // בית
  homeCoord: '',            // סינון לפי רכז בכרטיס הביקורים
  showAllBelow: false,      // הרשימה המלאה של מרפאות מתחת ליעד
  belowIncludeSmall: false, // כולל מרפאות קטנות ברשימה המלאה
  // לידים
  leads: emptyLeadsUi(),
};

/** מאפס את מצב התצוגה (בכניסה ובצאת מהמערכת) */
export function resetUi() {
  const fresh = {
    tab: 'home', busy: false, clinicId: null, editClinic: false, search: '', limit: LIST_PAGE_SIZE,
    filters: { mg: '', sector: '', kind: '', sort: 'bal' },
    visitClinic: null, showVisit: null, editVisit: null, confirmDeleteVisit: null,
    visitFilters: { clinic: '', coord: '', rc: '', status: '', period: '' }, visitsShown: [],
    homeCoord: '', showAllBelow: false, belowIncludeSmall: false, leads: emptyLeadsUi(),
  };
  Object.assign(ui, fresh);
}

/** מנקה את כל הנתונים שנטענו (ביציאה מהמערכת) */
export function clearStore() {
  store.users = []; store.clinics = []; store.reasons = []; store.visits = [];
  store.leads = []; store.log = [];
}
