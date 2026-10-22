/**
 * api/leadsApi.js - כתיבה של לידים לשרת.
 * הערה: בעלות על ליד נקבעת בשרת לפי המשתמש המחובר, ולא ניתנת לשינוי אחרי היצירה.
 */
import { sb } from './client.js';
import { mapLead } from './mappers.js';

const DUPLICATE_ID_CODE = '23505'; // קוד שגיאה של Postgres: ערך כפול בשדה ייחודי

/** מתרגם שגיאת שרת להודעה בעברית */
export function leadErrorText(error) {
  if (!error) return '';
  if (error.code === DUPLICATE_ID_CODE) return 'ליד עם ת.ז זו כבר קיים במערכת (אצלך או אצל רכז אחר).';
  return error.message || 'השמירה נכשלה';
}

function toRow(lead) {
  return {
    id_number: lead.idNumber, first_name: lead.firstName, last_name: lead.lastName,
    phone: lead.phone, city: lead.city, source: lead.source, status: lead.status,
    followup_at: lead.followupAt,
  };
}

export async function insertLead(lead) {
  const { data, error } = await sb.from('leads').insert(toRow(lead)).select();
  return { lead: data && data[0] ? mapLead(data[0]) : null, error };
}

/** מעדכן סטטוס ומועד שיחה נוספת בלבד (שאר השדות קבועים אחרי היצירה) */
export async function updateLeadStatus(id, status, followupAt) {
  const { data, error } = await sb.from('leads').update({ status, followup_at: followupAt }).eq('id', id).select();
  return { lead: data && data[0] ? mapLead(data[0]) : null, error };
}

export async function deleteLead(id) {
  const { data, error } = await sb.from('leads').delete().eq('id', id).select();
  return { ok: !error && data && data.length > 0, error };
}
