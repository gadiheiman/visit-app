/**
 * tests/run.mjs - בדיקות אוטומטיות מקצה לקצה על כל המסכים, מול שרת Supabase מדומה.
 * הרצה: node tests/run.mjs  (דורש Node 18 ומעלה, ללא התקנות)
 * הבדיקות לא נוגעות בשרת האמיתי ולא בנתונים אמיתיים.
 */
// נתונים סינתטיים דטרמיניסטיים: 30 מרפאות (10 בחפר, 8 בשרון, 12 בשומרון), בגדלים ויעדים שונים
let seed = 7;
const rnd = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
const MGS = [['חפר', 10], ['שרון', 8], ['שומרון', 12]];
const data = { reasons: ['תורים', 'יחס', 'מעבר דירה'], clinics: [] };
MGS.forEach(([mg, count]) => {
  for (let i = 0; i < count; i++) {
    const pool = i === 0;
    data.clinics.push({
      id: `${mg}-${i}`, mg, name: pool ? `מאגר מבוטחים מנהלת ${mg}` : `מרפאת בדיקה ${mg} ${i}`, code: i, town: 'עיר', addr: 'רחוב 1',
      sector: i % 3 ? 'כללי' : 'ערבי', kind: 'מרפאה ראשונית', target: pool ? null : 5 + rnd(25), dr: 'ד״ר א', adm: 'גב׳ ב', nur: 'גב׳ ג',
      ins: pool ? null : [800, 2500, 4000, 6000, 8500, 12000][i % 6],
      j: Array.from({ length: 10 }, () => rnd(15)), l: Array.from({ length: 10 }, () => rnd(15)),
      rs: { 0: Array.from({ length: 10 }, () => rnd(4)) },
    });
  }
});
// ---------- Supabase מדומה ----------
const U = {
  gadi: { id: 'U1', username: 'gadi', name: 'גדי', title: 'מנהל', role: 'admin', mg: null, units: [] },
  nofar: { id: 'U2', username: 'nofar', name: 'נופר', title: 'מנהלת קשרי לקוחות', role: 'viewall', mg: null, units: [] },
  igal: { id: 'U3', username: 'igal', name: 'יגאל', title: 'רכז', role: 'coord', mg: 'חפר', units: [] },
  daniel: { id: 'U4', username: 'daniel', name: 'דניאל', title: 'רכזת', role: 'coord', mg: 'שרון', units: [] },
  dikla: { id: 'U5', username: 'dikla', name: 'דיקלה', title: 'רכזת', role: 'coord', mg: 'שומרון', units: [] },
  rona: { id: 'U6', username: 'rona', name: 'רונה', title: 'רכזת', role: 'hosp', mg: null, units: ['h-meir', 'h-lev'] },
};
let nov = 0;
const clinicsAll = data.clinics.map(c => ({
  id: c.id, mg: c.mg, name: c.name, code: c.code, town: c.town, addr: c.addr, sector: c.sector, kind: c.kind, target: c.target,
  dr: c.dr, adm: c.adm, nur: c.nur, ins: c.ins, hospital: false, pool: c.name.startsWith('מאגר מבוטחים'),
  j: c.j.concat([nov++ % 7]), l: c.l.concat([(nov * 3) % 11]), rs: c.rs, updated: '2026-10-21', source: 'קובץ',
}));
['h-meir', 'h-lev'].forEach(id => clinicsAll.push({ id, mg: 'בתי חולים', name: id, kind: 'בית חולים', hospital: true, pool: false, j: Array(11).fill(null), l: Array(11).fill(null), rs: {}, updated: null, source: '-' }));
let cur = null;
const T = {
  profiles: Object.values(U), reasons: data.reasons.map((n, i) => ({ idx: i, name: n })), visits: [], leads: [], change_log: [],
  settings: [{ key: 'lead_sources', value: ['פנייה ישירה', 'אחר'] }, { key: 'size_thresholds', value: { medium: 3000, large: 8000 } }],
};
const manager = () => cur.role === 'admin' || cur.role === 'viewall';
const canSee = c => manager() || (cur.role === 'coord' && c.mg === cur.mg) || (cur.role === 'hosp' && cur.units.includes(c.id));
function rows(n) {
  if (n === 'clinics') return clinicsAll.filter(canSee);
  if (n === 'visits') return T.visits.filter(v => canSee(clinicsAll.find(c => c.id === v.clinic_id)));
  if (n === 'leads') return T.leads.filter(l => manager() || l.owner_id === cur.id);
  if (n === 'change_log') return cur.role === 'admin' ? T.change_log : [];
  return T[n];
}
function builder(n) {
  const q = { f: [], op: 'select' };
  q.select = () => q; q.range = () => q; q.order = () => q; q.limit = () => q;
  q.eq = (c, v) => { q.f.push([c, v]); return q; };
  q.insert = r => { q.op = 'insert'; q.row = r; return q; };
  q.update = r => { q.op = 'update'; q.row = r; return q; };
  q.delete = () => { q.op = 'delete'; return q; };
  q.upsert = r => { q.op = 'upsert'; q.row = r; return q; };
  q.then = (res, rej) => { try { res(run(q, n)); } catch (e) { rej && rej(e); } };
  return q;
}
function run(q, n) {
  let list = rows(n).filter(r => q.f.every(([c, v]) => r[c] === v));
  if (q.op === 'insert') {
    if (n === 'visits') {
      if (!(cur.role === 'coord' || cur.role === 'hosp')) return { data: null, error: { message: 'RLS' } };
      const r = { id: 'V' + (T.visits.length + 1), ...q.row }; T.visits.push(r); return { data: [r], error: null };
    }
    if (n === 'leads') {
      if (T.leads.some(l => l.id_number === q.row.id_number)) return { data: null, error: { code: '23505', message: 'dup' } };
      const r = { id: 'L' + (T.leads.length + 1), owner_id: cur.id, created_at: new Date().toISOString(), ...q.row }; T.leads.push(r); return { data: [r], error: null };
    }
    if (n === 'change_log') { T.change_log.push(q.row); return { data: null, error: null }; }
  }
  if (q.op === 'update') {
    if (n === 'leads') { list = list.filter(l => l.owner_id === cur.id || cur.role === 'admin'); list.forEach(r => Object.assign(r, q.row)); return { data: list, error: null }; }
    list.forEach(r => Object.assign(r, q.row)); return { data: list, error: null };
  }
  if (q.op === 'delete') {
    if (n === 'visits') { if (!manager()) return { data: [], error: null }; T.visits = T.visits.filter(v => !list.includes(v)); return { data: list, error: null }; }
    if (n === 'leads') { if (cur.role !== 'admin') return { data: [], error: null }; T.leads = T.leads.filter(v => !list.includes(v)); return { data: list, error: null }; }
  }
  if (q.op === 'upsert') {
    const i = T.settings.findIndex(s => s.key === q.row.key); if (i >= 0) T.settings[i] = q.row; else T.settings.push(q.row); return { data: null, error: null };
  }
  return { data: list, error: null };
}
const sb = {
  from: builder,
  rpc: async (fn, a) => {
    const c = clinicsAll.find(x => x.id === a.p_id);
    if (!c || !canSee(c) || cur.role === 'viewall') return { error: { message: 'אין הרשאה' } };
    for (let i = 0; i < 11; i++) { if (cur.role === 'admin' || c.j[i] === null) c.j[i] = a.p_j[i]; if (cur.role === 'admin' || c.l[i] === null) c.l[i] = a.p_l[i]; }
    if (cur.role === 'admin') c.target = a.p_target; return { error: null };
  },
  auth: {
    signInWithPassword: async ({ email, password }) => { const u = U[email.split('@')[0]]; if (!u || password !== 'pw') return { error: { message: 'bad' } }; cur = u; return { data: { user: { id: u.id } }, error: null }; },
    signOut: async () => { cur = null; signedOut && signedOut(); return {}; },
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange(f) { signedOut = () => f('SIGNED_OUT'); },
    updateUser: async () => ({ error: null }),
  },
};
let signedOut = null;
// ---------- DOM מדומה ----------
const els = {};
const mk = () => ({ innerHTML: '', textContent: '', value: '', hidden: false, appendChild() {}, focus() {}, setSelectionRange() {}, remove() {}, setAttribute() {}, children: [] });
const L = {};
global.document = {
  querySelector: s => els[s] || (els[s] = mk()), getElementById: id => els['#' + id] || (els['#' + id] = mk()),
  querySelectorAll: () => [], addEventListener(t, f) { (L[t] = L[t] || []).push(f); }, createElement: () => mk(), body: { appendChild() {} },
};
global.window = global; global.scrollTo = () => {}; Object.defineProperty(global,'navigator',{value:{},configurable:true});
global.supabase = { createClient: () => sb };
const sheets = {};
global.XLSX = { utils: { book_new: () => ({}), json_to_sheet: r => ({ rows: r }), book_append_sheet: (wb, ws, n) => { sheets[n] = ws.rows; } }, writeFile: (wb, n) => { sheets.__file = n; } };
// ---------- טעינת האפליקציה ----------
await import('../js/main.js');
const { ui, store } = await import('../js/core/state.js');
const { render } = await import('../js/ui/router.js');
const app = () => els['#app'].innerHTML;
const tick = () => new Promise(r => setTimeout(r, 5));
const target = (kind, attrs, extra = {}) => ({ dataset: attrs, tagName: 'X', closest(sel) { const k = sel.match(/data-(\w+)/)[1]; return this.dataset[k] !== undefined ? this : null; }, matches: () => false, ...extra });
const fire = async (type, attrs, extra) => { const el = target(type, attrs, extra); for (const f of L[type] || []) await f({ target: el, key: extra && extra.key, preventDefault() {} }); await tick(); return el; };
const click = (act, data = {}) => fire('click', { act, ...data });
const chg = (name, data = {}, value) => fire('change', { chg: name, ...data }, { value, checked: value });
const inp = (name, data = {}, value) => fire('input', { inp: name, ...data }, { value });
const login = async u => { els['#lg_u'] = { value: u }; els['#lg_p'] = { value: 'pw' }; await click('login'); };
const bad = (label, h) => { const m = h.match(/.{25}(undefined|NaN|\bnull\b|\[object).{25}/); if (m) console.log('BAD', label, m[0]); return !!m; };
let fails = 0; const ok = (name, cond) => { if (!cond) { fails++; console.log('FAIL:', name); } else console.log('ok  :', name); };

await tick();
ok('login screen on start', app().includes('כניסה למערכת'));
els['#lg_u'] = { value: 'igal' }; els['#lg_p'] = { value: 'bad' }; await click('login');
ok('bad password message', app().includes('שגויים'));

// כל המשתמשים: כל הלשוניות מתרנדרות בלי שגיאות
const counts = {};
for (const u of Object.keys(U)) {
  await login(u);
  for (const tab of ['home', 'clinics', 'visits', 'leads', 'admin', 'account']) {
    ui.tab = tab; ui.clinicId = null; render(); bad(`${u}/${tab}`, app());
  }
  ui.tab = 'clinics'; render(); counts[u] = (app().match(/\((\d+)\)/) || [])[1];
  if (counts[u] > 0) { ui.clinicId = store.clinics[0].id; ui.editClinic = true; render(); bad(`${u}/clinicDetail`, app()); ui.clinicId = null; ui.editClinic = false; }
  await click('logout'); await tick();
}
console.log('visible units', JSON.stringify(counts));
ok('coord sees own mg only', counts.igal === '10' && counts.daniel === '8' && counts.dikla === '12' && counts.rona === '2' && counts.gadi === '32' && counts.nofar === '32');

// בית ומסכים שהוסרו
await login('gadi');
ui.tab = 'home'; render();
const home = app();
ok('no score card', !home.includes('ציון לפי רכיב') && !home.includes('ציון מתחילת'));
ok('tabs: no reports/summary', !els['#tabs'].innerHTML.includes('ביצועים') && !els['#tabs'].innerHTML.includes('סיכום') && els['#tabs'].innerHTML.includes('מעקב לידים'));
ok('below-70 card (medium+large)', home.includes('בינוניות וגדולות מתחת ל־70% מהיעד'));
ok('home visits filter for manager', home.includes('data-chg="homeCoord"'));
ok('Nov 2026 column present', home.includes('נוב׳ 2026'));
const before = (home.match(/data-act="openClinic"/g) || []).length;
await click('toggleBelowAll'); const expanded = (app().match(/data-act="openClinic"/g) || []).length;
ok('expand shows more rows', expanded > before);
ok('small toggle appears', app().includes('כולל קטנות'));
await click('belowSmall', { value: '1' }); ok('include small changes title', !app().includes('בינוניות וגדולות מתחת') && app().includes('מרפאות מתחת ל־70%'));
await click('toggleBelowAll'); ok('collapse resets', ui.belowIncludeSmall === false && ui.showAllBelow === false);

// לידים כרכז
await click('logout'); await login('igal'); ui.tab = 'leads'; render();
ok('lead form fields', ['ת.ז', 'שם פרטי', 'שם משפחה', 'טלפון', 'עיר מגורים', 'מקור הליד', 'סטטוס הליד'].every(t => app().includes(t)));
ok('followup hidden by default', app().includes('id="ld_followup_wrap" hidden'));
const setDraft = async (k, v) => inp('leadDraft', { key: k }, v);
await setDraft('idNumber', '123456789'); await click('saveLead'); ok('invalid ID rejected', app().includes('מספר תעודת הזהות אינו תקין') && store.leads.length === 0);
await setDraft('idNumber', '123456782'); await setDraft('firstName', 'דנה'); await setDraft('lastName', 'כהן'); await setDraft('phone', '050-123-4567'); await setDraft('city', 'נתניה');
await click('saveLead'); ok('source required', app().includes('יש לבחור מקור ליד'));
await chg('leadDraft', { key: 'source' }, 'פנייה ישירה');
await chg('leadDraftStatus', { key: 'status' }, 'המשך טיפול'); ok('followup field shown on המשך טיפול', els['#ld_followup_wrap'].hidden === false);
await click('saveLead'); ok('followup required', app().includes('יש לבחור תאריך ושעה'));
await chg('leadDraft', { key: 'followup' }, '2026-11-02T10:30');
await click('saveLead'); ok('lead saved', store.leads.length === 1 && T.leads[0].phone === '0501234567' && T.leads[0].status === 'המשך טיפול' && T.leads[0].followup_at);
ok('table shows masked id + status', app().includes('•••••6782') && app().includes('המשך טיפול') && !app().includes('123456782'));
ok('form cleared after save', ui.leads.draft.idNumber === '');
// כפילות
await setDraft('idNumber', '123456782'); await setDraft('firstName', 'א'); await setDraft('lastName', 'ב'); await setDraft('phone', '0521234567'); await setDraft('city', 'ג'); await chg('leadDraft', { key: 'source' }, 'אחר'); await chg('leadDraftStatus', { key: 'status' }, 'חדש');
await click('saveLead'); ok('duplicate id message', app().includes('כבר קיים במערכת'));
// עדכון סטטוס וייצוא
await click('editLead', { id: store.leads[0].id }); ok('edit panel opens', app().includes('עדכון ליד'));
await chg('leadEditStatus', {}, 'בוצע מעבר'); await click('saveLeadEdit', { id: store.leads[0].id }); ok('status updated', store.leads[0].status === 'בוצע מעבר' && T.leads[0].followup_at === null);
await click('exportLeads'); ok('leads export', sheets.__file && sheets.__file.startsWith('leads_') && sheets['מעקב לידים'][0]['ת.ז'] === '123456782');
// פרטיות: רכז אחר לא רואה
await click('logout'); await login('daniel'); ui.tab = 'leads'; render(); ok('other coord sees no leads', store.leads.length === 0 && !app().includes('•••••6782'));
await click('logout'); await login('nofar'); ui.tab = 'leads'; render(); ok('nofar sees all leads, with owner column', store.leads.length === 1 && app().includes('רכז/ת'));
await click('logout'); await login('gadi'); ui.tab = 'leads'; render();
await click('editLead', { id: store.leads[0].id }); ok('admin sees delete', app().includes('data-act="deleteLead"'));
await click('deleteLead', { id: store.leads[0].id }); await click('deleteLeadYes', { id: store.leads[0].id }); ok('admin deleted lead', store.leads.length === 0 && T.leads.length === 0);

// ביקורים
await click('logout'); await login('igal'); ui.tab = 'clinics'; render();
const cid = store.clinics.find(c => !c.pool).id;
await click('newVisit', { id: cid }); ok('visit form opens', app().includes('דיווח ביקור'));
els['#v_purpose'] = { value: 'בדיקה' }; els['#v_date'] = { value: '2026-10-21' }; els['#v_time'] = { value: '10:00' }; els['#v_people'] = { value: '' }; els['#v_sum'] = { value: 'ס' };
await click('saveVisit', { id: cid }); ok('visit saved', T.visits.length === 1 && Array.isArray(T.visits[0].checklist));
const vid = ui.showVisit;
await click('editVisit', { v: vid }); els['#v_purpose'] = { value: 'עודכן' }; await click('saveVisit', { id: cid }); ok('visit edited', T.visits[0].purpose === 'עודכן');
await click('deleteVisit', { v: vid }); ok('coord has no delete', T.visits.length === 1 && !app().includes('data-act="deleteVisit"'));
await click('logout'); await login('nofar'); ui.tab = 'visits'; ui.showVisit = null; render();
ok('manager: no new-visit card, has rc filter + dashboard', !app().includes('דיווח ביקור חדש') && app().includes('data-key="rc"') && app().includes('דשבורד ביקורים לפי רכז'));
await click('exportVisits'); ok('visits export', sheets.__file.startsWith('visits_'));
ui.showVisit = vid; render(); ok('manager can delete', app().includes('data-act="deleteVisit"'));
await click('deleteVisit', { v: vid }); ok('confirm shown', app().includes('כן, למחוק'));
await click('deleteVisitYes', { v: vid }); ok('visit deleted', T.visits.length === 0);

// ניהול
await click('logout'); await login('gadi'); ui.tab = 'admin'; render();
ok('admin has size + lists', app().includes('גודל מרפאה') && app().includes('מקורות ליד') && app().includes('צ׳ק ליסט הביקור'));
els['#sz_medium'] = { value: '4000' }; els['#sz_large'] = { value: '9000' }; await click('saveSizes'); ok('sizes saved', store.settings.sizeThresholds.large === 9000);
await click('listAdd', { list: 'leadSources' }); ok('list add', store.settings.leadSources.length === 3);
// רכז עריכת נתונים
await click('logout'); await login('rona'); ui.tab = 'clinics'; ui.clinicId = 'h-meir'; ui.editClinic = true; render(); ok('hospital edit form (2026 only)', app().includes('id="cj10"') && !app().includes('id="cj0"'));
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
