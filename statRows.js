/**
 * ui/components/statRows.js - שורות נתונים קטנות.
 */
import { esc } from '../../utils/format.js';

/**
 * שורה אחת של נתונים קצרים: "מצטרפים 12 · עוזבים 20 · מאזן -8".
 * @param {{label:string, value:string|number, cls?:string}[]} items
 */
export function inlineStats(items) {
  const cells = items
    .map(i => `<span>${esc(i.label)} <b class="${i.cls || ''}">${esc(i.value)}</b></span>`)
    .join('');
  return `<div class="s1">${cells}</div>`;
}

/** רשימה אנכית של שורות "שם  ערך" (בתוך כרטיס דשבורד) */
export function stackedStats(items) {
  const rows = items
    .map(i => `<span>${esc(i.label)} <b class="${i.cls || ''}">${esc(i.value)}</b></span>`)
    .join('');
  return `<div class="s2">${rows}</div>`;
}

/** מספר גדול עם צבע לפי סימן (למאזן) */
export function bigNumber(text, cls = '') {
  return `<div class="big ${cls}">${esc(text)}</div>`;
}

/** פריט "תווית + ערך" לפרטי מרפאה (כרטיס נתוני מרפאה) */
export function keyValue(label, value) {
  return `<div class="kv"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}

