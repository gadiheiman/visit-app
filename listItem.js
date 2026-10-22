/**
 * ui/components/listItem.js - שורה לחיצה ברשימה: שם, שורת משנה ותגית בצד.
 */
import { esc } from '../../utils/format.js';

/**
 * @param {{action:string, id:string, title:string, subtitle?:string, badgeHtml?:string}} o
 */
export function listItem({ action, id, title, subtitle = '', badgeHtml = '' }) {
  return `<div class="item" data-act="${action}" data-id="${esc(id)}" tabindex="0" role="button">
    <div><div class="t">${esc(title)}</div><div class="muted">${esc(subtitle)}</div></div>
    ${badgeHtml}
  </div>`;
}
