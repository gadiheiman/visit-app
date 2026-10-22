/**
 * api/clinicsApi.js - עדכון נתוני מרפאה.
 * הכתיבה עוברת דרך פונקציית שרת (save_clinic_data) שאוכפת את הכללים:
 * מנהל משנה הכול, ורכז רק משלים ערכים חסרים ביחידות שלו.
 */
import { sb } from './client.js';
import { mapClinic } from './mappers.js';

/** שומר מצטרפים ועוזבים (מערכים של כל הקפיטציות) ויעד, ומחזיר את המרפאה המעודכנת */
export async function saveClinicData(clinicId, joiners, leavers, target) {
  const { error } = await sb.rpc('save_clinic_data', { p_id: clinicId, p_j: joiners, p_l: leavers, p_target: target });
  if (error) return { error };
  const { data } = await sb.from('clinics').select('*').eq('id', clinicId);
  return { clinic: data && data[0] ? mapClinic(data[0]) : null };
}
