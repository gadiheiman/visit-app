/**
 * ui/components/tabs.js - סרגל הניווט התחתון והכפתור בכותרת העליונה.
 * כדי להוסיף מסך חדש לתפריט: מוסיפים שורה ל-TAB_DEFS ורושמים את המסך ב-ui/router.js.
 */
import { $ } from '../../core/dom.js';
import { esc } from '../../utils/format.js';
import { me } from '../../domain/permissions.js';

/** adminOnly = מוצג למנהל בלבד */
const TAB_DEFS = [
  { id: 'home', icon: '🏠', label: 'בית' },
  { id: 'clinics', icon: '🏥', label: 'יחידות' },
  { id: 'visits', icon: '📝', label: 'ביקורים' },
  { id: 'leads', icon: '📞', label: 'מעקב לידים' },
  { id: 'admin', icon: '⚙️', label: 'ניהול', adminOnly: true },
];

export function renderTabs(activeTab) {
  const isAdmin = me().role === 'admin';
  const html = TAB_DEFS
    .filter(t => !t.adminOnly || isAdmin)
    .map(t => `<button data-act="goTab" data-tab="${t.id}"${activeTab === t.id ? ' aria-current="page"' : ''}>
      <span class="ic" aria-hidden="true">${t.icon}</span>${esc(t.label)}</button>`)
    .join('');
  $('#tabs').innerHTML = html;
}

/** הכותרת העליונה: תאריך היום, וכפתור עם שם המשתמש (פותח את מסך "החשבון שלי") */
export function renderWho() {
  $('#hdate').textContent = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#who').innerHTML = `<button class="btn small" style="background:rgba(255,255,255,.15);color:#fff;min-height:36px" data-act="goTab" data-tab="account">${esc(me().name)} ▾</button>`;
}

export function clearChrome() {
  $('#tabs').innerHTML = '';
  $('#who').innerHTML = '';
}
