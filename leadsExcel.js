/**
 * exports/leadsExcel.js - ייצוא טבלת מעקב הלידים לאקסל.
 * הקובץ כולל ת.ז מלאה וטלפון (מידע אישי): יש לשמור אותו בזהירות ולמחוק כשאין בו צורך.
 */
import { toast } from '../core/dom.js';
import { fmtDateTime, todayIso } from '../utils/format.js';
import { userName } from '../domain/permissions.js';
import { downloadWorkbook, excelAvailable } from './workbook.js';
import { logChange } from '../api/logApi.js';

/** שורה לכל ליד. ת.ז וטלפון נשמרים כטקסט כדי שאפסים בהתחלה לא ייעלמו. */
function leadRows(leads) {
  return leads.map(l => ({
    'תאריך פתיחה': fmtDateTime(l.createdAt),
    'ת.ז': l.idNumber,
    'שם פרטי': l.firstName,
    'שם משפחה': l.lastName,
    'טלפון': l.phone,
    'עיר מגורים': l.city,
    'מקור הליד': l.source,
    'סטטוס': l.status,
    'מועד שיחה נוספת': l.followupAt ? fmtDateTime(l.followupAt) : '',
    'רכז/ת': userName(l.ownerId),
  }));
}

/** מייצא את הלידים שמוצגים כרגע בטבלה (אחרי סינון) */
export function exportLeads(leads) {
  if (!excelAvailable()) return;
  if (!leads.length) { toast('אין לידים לייצוא'); return; }
  downloadWorkbook(`leads_${todayIso()}.xlsx`, [{
    name: 'מעקב לידים',
    rows: leadRows(leads),
    widths: [18, 12, 14, 14, 13, 16, 22, 13, 18, 12],
  }]);
  logChange(`ייצוא לידים לאקסל (${leads.length} רשומות)`);
  toast('הקובץ הורד');
}
