/**
 * api/mappers.js - המרת שורות מבסיס הנתונים (שמות שדות באנגלית עם קו תחתון)
 * לאובייקטים שהאפליקציה עובדת איתם. מקום אחד שמכיר את מבנה הטבלאות.
 */
import { CAP_COUNT } from '../config.js';

/** משלים מערך קפיטציות לאורך המלא (ערכים חסרים הם null = "לא דווח") */
function padCaps(arr) {
  const out = (arr || []).slice();
  while (out.length < CAP_COUNT) out.push(null);
  return out;
}

export function mapProfile(r) {
  return { id: r.id, username: r.username, name: r.name, title: r.title, role: r.role, mg: r.mg, units: r.units || [] };
}

/** j0 ו-l0 הם עותק של הערכים כפי שנטענו: ערך שכבר קיים ננעל לעריכה עבור רכזים */
export function mapClinic(r) {
  const j = padCaps(r.j);
  const l = padCaps(r.l);
  return {
    id: r.id, mg: r.mg, name: r.name, code: r.code, town: r.town, addr: r.addr,
    sector: r.sector, kind: r.kind, target: r.target, dr: r.dr, adm: r.adm, nur: r.nur,
    ins: r.ins, hospital: r.hospital, pool: r.pool,
    j, l, j0: j.slice(), l0: l.slice(), rs: r.rs || {},
    updated: r.updated, source: r.source,
  };
}

export function mapVisit(r) {
  return {
    id: r.id, clinicId: r.clinic_id, coordId: r.coord_id, date: r.vdate, time: r.vtime,
    purpose: r.purpose, people: r.people, checks: r.checks || [], checklist: r.checklist || null,
    summary: r.summary, tasks: r.tasks || [], edited: r.edited,
  };
}

export function mapLead(r) {
  return {
    id: r.id, ownerId: r.owner_id, idNumber: r.id_number, firstName: r.first_name, lastName: r.last_name,
    phone: r.phone, city: r.city, source: r.source, status: r.status,
    followupAt: r.followup_at, createdAt: r.created_at,
  };
}
