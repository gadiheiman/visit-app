/**
 * config.js - קבועי המערכת במקום אחד.
 * כאן משנים מספרים, שמות ורשימות ברירת מחדל. אין כאן לוגיקה.
 */

// ---------- חיבור ל-Supabase ----------
// המפתח הוא "anon" ציבורי בכוונה: ההגנה האמיתית היא כללי ההרשאה (RLS) בבסיס הנתונים.
export const SB_URL = 'https://afdiyssnlugstzrecxqq.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZGl5c3NubHVnc3R6cmVjeHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTI0OTMsImV4cCI6MjEwODA4ODQ5M30.tJl5G5O-QF1ABdku94uEJL0RFYBt2irIxn80ExfepAY';
// שם המשתמש שמוקלד במסך הכניסה מומר לכתובת דוא"ל פנימית בעזרת הסיומת הזו
export const MAIL_DOMAIN = '@visitapp.example.com';

// ---------- קפיטציות ----------
// הסדר חשוב: המיקום ברשימה הוא האינדקס במערכי j ו-l בבסיס הנתונים.
export const CAPS = [
  'מרץ 2025', 'מאי 2025', 'יולי 2025', 'ספט׳ 2025', 'נוב׳ 2025',
  'ינו׳ 2026', 'מרץ 2026', 'מאי 2026', 'יולי 2026', 'ספט׳ 2026', 'נוב׳ 2026',
];
export const CAP_COUNT = CAPS.length;
export const FIRST_CAP_2026 = 5;                       // אינדקס הקפיטציה הראשונה של 2026
export const CAPS_2026 = [5, 6, 7, 8, 9, 10];          // אינדקסי קפיטציות 2026
export const CAPS_PER_YEAR = 6;

// ---------- שמות להצגה ----------
export const MG_NAMES = {
  'חפר': 'מנהלת חפר',
  'שרון': 'מנהלת שרון',
  'שומרון': 'מנהלת שומרון',
  'בתי חולים': 'בתי חולים',
};
export const ROLE_NAMES = {
  admin: 'מנהל – גישה מלאה',
  viewall: 'צפייה בכל המינהלות',
  coord: 'המינהלת שלו/ה בלבד',
  hosp: 'בתי החולים שלה בלבד',
};

// ---------- ספי תצוגה ----------
export const TARGET_ALERT_PCT = 70;      // מתחת לאחוז הזה מהיעד מרפאה נחשבת "בפיגור"
export const BELOW_PREVIEW_COUNT = 8;    // כמה מרפאות מוצגות לפני לחיצה על "הצגת הכל"
export const VISIT_STALE_DAYS = 20;      // מרפאה ללא ביקור מעל מספר הימים הזה מסומנת
export const LIST_PAGE_SIZE = 40;        // גודל "עמוד" ברשימת היחידות

// ---------- ברירות מחדל להגדרות שנשמרות בבסיס הנתונים (טבלת settings) ----------
export const DEFAULT_CHECKLIST = [
  'מעבר על יעד המצטרפים והביצוע בפועל',
  'שיחה על מאזן המצטרפים והעוזבים',
  'מעבר על סיבות העזיבה המובילות',
  'מעבר על מקורות גיוס ותרומת עובדים',
  'מעבר על יעד הלידים והטיפול בהם',
  'קביעת תאריך למרתון גיוס',
  'הגדרת משימות להמשך מול המרפאה',
];
export const DEFAULT_LEAD_SOURCES = [
  'פנייה ישירה', 'תרומת עובדים', 'אתר / דיגיטל', 'המלצה', 'פעילות שטח / מרתון גיוס', 'אחר',
];
// גודל מרפאה לפי מספר מבוטחים: בינונית מ-medium, גדולה מ-large, מתחת לזה קטנה
export const DEFAULT_SIZE_THRESHOLDS = { medium: 3000, large: 8000 };

// ---------- לידים ----------
export const LEAD_STATUSES = ['חדש', 'אין מענה', 'המשך טיפול', 'לא מעוניין', 'בוצע מעבר'];
export const LEAD_STATUS_FOLLOWUP = 'המשך טיפול';   // הסטטוס שמחייב מועד לשיחה נוספת
