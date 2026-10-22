/**
 * api/auth.js - כניסה, יציאה והחלפת סיסמה.
 * שם המשתמש הוא שם קצר (igal, daniel...); מאחורי הקלעים הוא מומר לכתובת דוא"ל פנימית.
 */
import { sb } from './client.js';
import { MAIL_DOMAIN } from '../config.js';

/** כניסה. מחזיר { userId } או { error } */
export async function signIn(username, password) {
  const email = username.trim().toLowerCase() + MAIL_DOMAIN;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data || !data.user) return { error: error || new Error('כניסה נכשלה') };
  return { userId: data.user.id };
}

/** יציאה מהמערכת */
export function signOut() {
  return sb.auth.signOut();
}

/** מזהה המשתמש אם קיימת כניסה פעילה (למשל אחרי רענון הדף), אחרת null */
export async function currentUserId() {
  const { data } = await sb.auth.getSession();
  return data && data.session ? data.session.user.id : null;
}

/** מאזין ליציאה מהמערכת (גם כשהחיבור פג תוקף) */
export function onSignedOut(callback) {
  sb.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') callback();
  });
}

/** החלפת הסיסמה של המשתמש המחובר */
export async function changePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return { error };
}
