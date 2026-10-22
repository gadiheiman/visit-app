/**
 * exports/workbook.js - יצירת קובץ אקסל להורדה.
 * ספריית SheetJS נטענת כסקריפט רגיל ב-index.html ומוגדרת כ-XLSX.
 */
import { toast } from '../core/dom.js';

/** האם הספרייה נטענה (אם הרשת חסמה אותה, מציגים הודעה) */
export function excelAvailable() {
  if (typeof XLSX === 'undefined') {
    toast('רכיב הייצוא לא נטען. נסו לרענן את הדף');
    return false;
  }
  return true;
}

/**
 * מוריד קובץ אקסל בכיוון מימין לשמאל.
 * @param {string} filename שם הקובץ
 * @param {{name:string, rows:object[], widths?:number[]}[]} sheets לשונית לכל איבר; rows = מערך אובייקטים (כותרת = שם המפתח)
 */
export function downloadWorkbook(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    if (sheet.widths) ws['!cols'] = sheet.widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, filename);
}
