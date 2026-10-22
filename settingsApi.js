/**
 * api/settingsApi.js - שמירת הגדרות מערכת (למנהל בלבד, נאכף בשרת).
 * מפתחות: checklist, lead_sources, size_thresholds
 */
import { sb } from './client.js';

export async function saveSetting(key, value) {
  const { error } = await sb.from('settings').upsert({ key, value });
  return { error };
}
