/**
 * ui/screens/admin.js - ניהול מערכת (למנהל בלבד): ספי גודל מרפאה, צ'ק ליסט ביקור,
 * מקורות ליד, רשימת משתמשים והרשאות, ויומן שינויים.
 */
import { store } from '../../core/state.js';
import { requestRender } from '../../core/bus.js';
import { $, toast, errorText } from '../../core/dom.js';
import { esc, toInt } from '../../utils/format.js';
import { MG_NAMES, ROLE_NAMES } from '../../config.js';
import { me } from '../../domain/permissions.js';
import { saveSetting } from '../../api/settingsApi.js';
import { logChange } from '../../api/logApi.js';
import { card, emptyNote } from '../components/card.js';
import { editableList } from '../components/formFields.js';

/** מפתח ב-store.settings לכל רשימה ניתנת לעריכה, ושם ההגדרה בבסיס הנתונים */
const LISTS = {
  checklist: { settingsKey: 'checklist', dbKey: 'checklist', label: 'סעיף', logText: 'עדכון צ׳ק ליסט הביקור' },
  leadSources: { settingsKey: 'leadSources', dbKey: 'lead_sources', label: 'מקור', logText: 'עדכון מקורות ליד' },
};

function sizeThresholdsCard() {
  const t = store.settings.sizeThresholds;
  return card('גודל מרפאה (לפי מספר מבוטחים)', `
    <div class="muted">משפיע על רשימת "מרפאות מתחת ליעד" במסך הבית, שמציגה מרפאות בינוניות וגדולות.</div>
    <label for="sz_medium">בינונית: מ־ (מבוטחים)</label>
    <input type="number" id="sz_medium" inputmode="numeric" value="${t.medium}">
    <label for="sz_large">גדולה: מ־ (מבוטחים)</label>
    <input type="number" id="sz_large" inputmode="numeric" value="${t.large}">
    <button class="btn" style="margin-top:10px" data-act="saveSizes">שמירה</button>`);
}

function usersCard() {
  const rows = store.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.title)}</td>
    <td>${esc(ROLE_NAMES[u.role])}${u.mg ? ` (${esc(MG_NAMES[u.mg])})` : ''}${u.units && u.units.length ? ' (בי״ח מאיר, בי״ח לוינשטיין)' : ''}</td></tr>`).join('');
  return card('משתמשים והרשאות',
    `<div class="scroll"><table><thead><tr><th>שם</th><th>תפקיד</th><th>גישה</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

function logCard() {
  const rows = store.log.map(l => `<div class="check"><div><div>${esc(l.what)}</div>
    <div class="muted">${esc(l.user)} · ${esc(l.when)}</div></div></div>`).join('');
  return card('יומן שינויים', rows || emptyNote('אין שינויים עדיין.'));
}

export function render() {
  if (me().role !== 'admin') return '<div class="card empty">מסך זה זמין למנהל בלבד.</div>';
  return `<h2 style="margin-top:4px">ניהול מערכת</h2>
    ${sizeThresholdsCard()}
    ${card('צ׳ק ליסט הביקור', editableList('checklist', store.settings.checklist, LISTS.checklist.label))}
    ${card('מקורות ליד', editableList('leadSources', store.settings.leadSources, LISTS.leadSources.label))}
    ${usersCard()}${logCard()}`;
}

// ---------- פעולות ----------

/** מעתיק את מה שהוקלד בשדות הרשימה אל ההגדרות (לפני הוספה, מחיקה או שמירה) */
function syncListFromDom(listId) {
  const list = store.settings[LISTS[listId].settingsKey];
  document.querySelectorAll(`.list-input[data-list="${listId}"]`).forEach(input => {
    list[Number(input.dataset.i)] = input.value;
  });
}

async function saveList(el) {
  const meta = LISTS[el.dataset.list];
  if (!meta || me().role !== 'admin') return;
  syncListFromDom(el.dataset.list);
  const items = store.settings[meta.settingsKey].map(t => t.trim()).filter(Boolean);
  store.settings[meta.settingsKey] = items;
  const { error } = await saveSetting(meta.dbKey, items);
  if (error) { toast(errorText(error)); return; }
  logChange(meta.logText);
  toast('נשמר');
  requestRender();
}

async function saveSizes() {
  if (me().role !== 'admin') return;
  const medium = toInt($('#sz_medium').value);
  const large = toInt($('#sz_large').value);
  if (!medium || !large || medium >= large) { toast('הסף של גדולה חייב להיות גבוה מהסף של בינונית'); return; }
  const value = { medium, large };
  const { error } = await saveSetting('size_thresholds', value);
  if (error) { toast(errorText(error)); return; }
  store.settings.sizeThresholds = value;
  logChange('עדכון ספי גודל מרפאה');
  toast('נשמר');
  requestRender();
}

export const handlers = {
  listAdd(el) {
    syncListFromDom(el.dataset.list);
    store.settings[LISTS[el.dataset.list].settingsKey].push('');
    requestRender();
  },
  listDel(el) {
    syncListFromDom(el.dataset.list);
    store.settings[LISTS[el.dataset.list].settingsKey].splice(Number(el.dataset.i), 1);
    requestRender();
  },
  listSave: saveList,
  saveSizes,
};

