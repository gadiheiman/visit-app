/**
 * api/loaders.js - טעינת נתונים מהשרת אל ה-store.
 */
import { sb } from './client.js';
import { store } from '../core/state.js';
import { mapProfile, mapClinic, mapVisit, mapLead } from './mappers.js';

const PAGE = 1000; // השרת מחזיר עד 1000 שורות בקריאה

/** קורא את כל השורות של טבלה (בדפים), עם מיון אופציונלי */
async function fetchAll(table, orderBy) {
  let rows = [];
  for (let from = 0; ; from += PAGE) {
    const query = sb.from(table).select('*').range(from, from + PAGE - 1);
    const { data, error } = orderBy ? await query.order(orderBy) : await query;
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function loadVisits() {
  const rows = await fetchAll('visits', 'vdate');
  store.visits = rows.map(mapVisit).sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadLeads() {
  const rows = await fetchAll('leads', 'created_at');
  store.leads = rows.map(mapLead).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** יומן שינויים (קריאה מותרת למנהל בלבד, לכן למשתמשים אחרים התוצאה ריקה) */
export async function loadLog() {
  const { data } = await sb.from('change_log').select('*').order('ts', { ascending: false }).limit(15);
  store.log = (data || []).map(r => ({
    when: new Date(r.ts).toLocaleString('he-IL'), user: r.user_name, what: r.what,
  }));
}

/** טוען הגדרה שנשמרה בטבלת settings אל store.settings */
function applySetting(row) {
  if (row.key === 'checklist') store.settings.checklist = row.value;
  if (row.key === 'lead_sources') store.settings.leadSources = row.value;
  if (row.key === 'size_thresholds') store.settings.sizeThresholds = row.value;
}

/** טעינה מלאה אחרי כניסה */
export async function loadAll() {
  const [profiles, clinics, reasons, settings] = await Promise.all([
    fetchAll('profiles'), fetchAll('clinics'), fetchAll('reasons', 'idx'), fetchAll('settings'),
  ]);
  store.users = profiles.map(mapProfile);
  store.clinics = clinics.map(mapClinic);
  store.reasons = [];
  reasons.forEach(r => { store.reasons[r.idx] = r.name; });
  settings.forEach(applySetting);
  await Promise.all([loadVisits(), loadLeads()]);
}
