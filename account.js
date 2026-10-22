/**
 * ui/screens/account.js - "החשבון שלי": פרטי המשתמש, החלפת סיסמה ויציאה.
 */
import { $, toast, errorText } from '../../core/dom.js';
import { esc } from '../../utils/format.js';
import { MG_NAMES, ROLE_NAMES } from '../../config.js';
import { me } from '../../domain/permissions.js';
import { changePassword, signOut } from '../../api/auth.js';

const MIN_PASSWORD_LENGTH = 8;

export function render() {
  const user = me();
  return `<h2 style="margin-top:4px">החשבון שלי</h2>
    <div class="card">
      <div style="font-weight:800">${esc(user.name)}</div>
      <div class="muted">${esc(user.title)} · ${esc(ROLE_NAMES[user.role])}${user.mg ? ` (${esc(MG_NAMES[user.mg])})` : ''}</div>
      <div class="muted">שם משתמש: ${esc(user.username)}</div>
    </div>
    <div class="card">
      <h3>החלפת סיסמה</h3>
      <label for="pw1">סיסמה חדשה (לפחות ${MIN_PASSWORD_LENGTH} תווים)</label>
      <input id="pw1" type="password" autocomplete="new-password" dir="ltr">
      <label for="pw2">אימות סיסמה</label>
      <input id="pw2" type="password" autocomplete="new-password" dir="ltr">
      <button class="btn" style="margin-top:12px" data-act="changePassword">שמירת סיסמה</button>
    </div>
    <div class="card"><button class="btn ghost" data-act="logout">יציאה מהמערכת</button></div>`;
}

async function doChangePassword() {
  const first = $('#pw1').value || '';
  const second = $('#pw2').value || '';
  if (first.length < MIN_PASSWORD_LENGTH) { toast(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`); return; }
  if (first !== second) { toast('הסיסמאות לא זהות'); return; }
  const { error } = await changePassword(first);
  if (error) { toast(errorText(error)); return; }
  toast('הסיסמה הוחלפה');
  $('#pw1').value = '';
  $('#pw2').value = '';
}

export const handlers = {
  changePassword: doChangePassword,
  logout() { signOut(); },
};
