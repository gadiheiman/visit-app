/**
 * core/dom.js - עזרים קטנים לעבודה עם הדף.
 */

/** קיצור ל-querySelector */
export const $ = selector => document.querySelector(selector);

/** הודעה קצרה בתחתית המסך שנעלמת מעצמה */
export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  el.setAttribute('role', 'status');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/** טקסט שגיאה קריא מתוך שגיאה של שרת */
export function errorText(error) {
  return error && error.message ? error.message : 'שגיאה לא צפויה';
}

/**
 * מצייר מחדש ומחזיר את הפוקוס (ואת מיקום הסמן) לשדה שהמשתמש הקליד בו.
 * נדרש בחיפוש חי, כי ציור מחדש מוחק את השדה ויוצר אותו מחדש.
 */
export function rerenderKeepingFocus(fieldId, rerender) {
  const old = document.getElementById(fieldId);
  const caret = old ? old.selectionStart : 0;
  rerender();
  const fresh = document.getElementById(fieldId);
  if (fresh) {
    fresh.focus();
    fresh.setSelectionRange(caret, caret);
  }
}

/** גולל לראש הדף */
export function scrollTop() {
  window.scrollTo(0, 0);
}
