/**
 * utils/validate.js - בדיקות תקינות לשדות בטפסים.
 * כל הפונקציות טהורות ומחזירות ערך חזרה, בלי לגעת במסך.
 */

/**
 * בודק תעודת זהות ישראלית: עד 9 ספרות (משלים אפסים משמאל) ובדיקת ספרת ביקורת.
 * @returns {string|null} ת.ז בת 9 ספרות אם תקינה, אחרת null
 */
export function normalizeIsraeliId(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length < 5 || digits.length > 9) return null;
  const id = digits.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let step = Number(id[i]) * (i % 2 === 0 ? 1 : 2);
    if (step > 9) step -= 9;
    sum += step;
  }
  return sum % 10 === 0 ? id : null;
}

/**
 * מנרמל מספר טלפון ישראלי לצורה 0501234567 (ללא מקפים ורווחים, וקידומת 972+ מומרת ל-0).
 * @returns {string|null} המספר התקני, או null אם אינו תקין
 */
export function normalizePhone(input) {
  let digits = String(input || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+972')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('972')) digits = '0' + digits.slice(3);
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}
