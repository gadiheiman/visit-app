/**
 * api/visitsApi.js - כתיבה של ביקורים לשרת.
 * כל פונקציה מחזירה { data, error }. כשהרשאה נדחתה השרת מחזיר 0 שורות, ולכן בודקים גם data.length.
 */
import { sb } from './client.js';
import { mapVisit } from './mappers.js';

/** שדות הביקור כפי שהם נשמרים בטבלה */
function toRow(v) {
  return {
    vdate: v.date, vtime: v.time, purpose: v.purpose, people: v.people,
    checks: v.checks, checklist: v.checklist, summary: v.summary, tasks: v.tasks,
  };
}

export async function insertVisit(clinicId, coordId, visit) {
  const { data, error } = await sb.from('visits').insert({ clinic_id: clinicId, coord_id: coordId, ...toRow(visit) }).select();
  return { visit: data && data[0] ? mapVisit(data[0]) : null, error };
}

export async function updateVisit(id, visit, editedOn) {
  const { data, error } = await sb.from('visits').update({ ...toRow(visit), edited: editedOn }).eq('id', id).select();
  return { ok: !error && data && data.length > 0, error };
}

export async function updateVisitTasks(id, tasks) {
  const { data, error } = await sb.from('visits').update({ tasks }).eq('id', id).select();
  return { ok: !error && data && data.length > 0, error };
}

export async function deleteVisit(id) {
  const { data, error } = await sb.from('visits').delete().eq('id', id).select();
  return { ok: !error && data && data.length > 0, error };
}
