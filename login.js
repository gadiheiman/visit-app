/**
 * ui/screens/login.js - מסך כניסה.
 */
import { $ } from '../../core/dom.js';
import { ui } from '../../core/state.js';
import { esc } from '../../utils/format.js';
import { signIn } from '../../api/auth.js';
import { startSession } from '../../core/session.js';
import { clearChrome } from '../components/tabs.js';

/** מצייר את מסך הכניסה (message = הודעת שגיאה אופציונלית) */
export function showLogin(message = '') {
  clearChrome();
  $('#app').innerHTML = `
    <div class="card" style="max-width:380px;margin:30px auto">
      <h2 style="margin-top:0">כניסה למערכת</h2>
      <label for="lg_u">שם משתמש</label>
      <input id="lg_u" autocomplete="username" autocapitalize="none" dir="ltr">
      <label for="lg_p">סיסמה</label>
      <input id="lg_p" type="password" autocomplete="current-password" dir="ltr" data-enter="login">
      ${message ? `<div class="field-err" role="alert">${esc(message)}</div>` : ''}
      <button class="btn" style="width:100%;margin-top:14px" data-act="login">כניסה</button>
    </div>`;
}

async function login() {
  if (ui.busy) return;
  const username = ($('#lg_u').value || '').trim();
  const password = $('#lg_p').value || '';
  if (!username || !password) { showLogin('יש להזין שם משתמש וסיסמה'); return; }
  ui.busy = true;
  const result = await signIn(username, password);
  ui.busy = false;
  if (result.error) { showLogin('שם המשתמש או הסיסמה שגויים'); return; }
  const started = await startSession(result.userId);
  if (started.error) showLogin(started.error);
}

export const handlers = { login };
