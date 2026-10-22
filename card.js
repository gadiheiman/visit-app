/**
 * ui/components/card.js - כרטיס עם כותרת (עטיפה בסיסית שחוזרת בכל המסכים).
 */
import { esc } from '../../utils/format.js';

/** כרטיס: card('כותרת', '<p>תוכן</p>') */
export function card(title, bodyHtml, extraClass = '') {
  const heading = title ? `<h3>${esc(title)}</h3>` : '';
  return `<div class="card ${extraClass}">${heading}${bodyHtml}</div>`;
}

/** הודעת "אין נתונים" ממורכזת */
export function emptyNote(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

/** כפתור "חזרה" */
export function backButton(action, label) {
  return `<button class="back" data-act="${action}">‹ ${esc(label)}</button>`;
}
