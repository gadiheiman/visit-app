/**
 * domain/permissions.js - מי המשתמש הנוכחי ומה מותר לו.
 *
 * חשוב: אלה בדיקות לנוחות המסך בלבד (להסתיר כפתורים). האכיפה האמיתית נעשית
 * בבסיס הנתונים (RLS), כך שגם עקיפה של הדף לא תחשוף נתונים.
 *
 * תפקידים: admin (מנהל), viewall (צפייה בכל המינהלות), coord (רכז/ת מינהלת), hosp (רכז/ת בתי חולים)
 */
import { store, ui } from '../core/state.js';
import { MG_NAMES } from '../config.js';

/** המשתמש המחובר (אובייקט ריק עם תפקיד "none" אם עדיין לא נטען) */
export function me() {
  return store.users.find(u => u.id === ui.userId) || { id: null, name: '', title: '', role: 'none', units: [] };
}

export function userName(id) {
  const user = store.users.find(u => u.id === id);
  return user ? user.name : '—';
}

/** משתמש ברמת ניהול: רואה את כל המינהלות */
export function isManagerView() {
  const role = me().role;
  return role === 'admin' || role === 'viewall';
}

/** רכז/ת שמתעדים ביקורים (מנהל ונופר לא מתעדים) */
export function canVisit() {
  const role = me().role;
  return role === 'coord' || role === 'hosp';
}

export function canDeleteVisit() {
  return isManagerView();
}

export function canEditTargets() {
  return me().role === 'admin';
}

/** האם מותר לערוך נתוני קפיטציה של מרפאה */
export function canEditClinic(clinic) {
  const user = me();
  return user.role === 'admin'
    || (user.role === 'coord' && clinic.mg === user.mg)
    || (user.role === 'hosp' && user.units.indexOf(clinic.id) >= 0);
}

/** המרפאות שהמשתמש רואה. השרת כבר מסנן, וכאן מוסיפים בדיקה כפולה למקרה של שינוי תפקיד בזמן ריצה */
export function visibleClinics() {
  const user = me();
  return store.clinics.filter(c =>
    isManagerView()
    || (user.role === 'coord' && c.mg === user.mg)
    || (user.role === 'hosp' && user.units.indexOf(c.id) >= 0));
}

export function getClinic(id) {
  return visibleClinics().find(c => c.id === id) || null;
}

export function clinicName(id) {
  const clinic = store.clinics.find(c => c.id === id);
  return clinic ? clinic.name : '—';
}

export function visibleVisits() {
  const ids = new Set(visibleClinics().map(c => c.id));
  return store.visits.filter(v => ids.has(v.clinicId));
}

/** הרכז/ת האחראי/ת על מרפאה (לפי מינהלת, או בית חולים) */
export function coordinatorOf(clinic) {
  return store.users.find(u =>
    (u.role === 'coord' && u.mg === clinic.mg)
    || (u.role === 'hosp' && u.units.indexOf(clinic.id) >= 0)) || null;
}

/** כל הרכזים (לתפריטי סינון) */
export function coordinators() {
  return store.users.filter(u => u.role === 'coord' || u.role === 'hosp');
}

/** שם התחום שהמשתמש רואה, לכותרות */
export function scopeTitle() {
  const user = me();
  if (user.role === 'coord') return MG_NAMES[user.mg];
  if (user.role === 'hosp') return 'בתי החולים שלך';
  return 'כל המינהלות';
}
