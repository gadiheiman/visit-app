/**
 * api/logApi.js - רישום פעולות ביומן השינויים.
 * הרישום נעשה "ברקע": כישלון ביומן לא מפריע למשתמש.
 * חשוב: לא רושמים ביומן מידע אישי (ת.ז, טלפון, שמות לידים).
 */
import { sb } from './client.js';
import { me } from '../domain/permissions.js';

export function logChange(what) {
  const user = me();
  sb.from('change_log').insert({ user_id: user.id, user_name: user.name, what }).then(() => {}, () => {});
}
