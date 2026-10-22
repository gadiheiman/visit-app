/**
 * ui/components/formFields.js - רכיבי טופס קטנים.
 */
import { esc } from '../../utils/format.js';

/** אפשרויות ל-select. selected = הערך שנבחר, labelOf = המרת ערך לטקסט להצגה */
export function options(values, selected, labelOf = v => v) {
  return values
    .map(v => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(labelOf(v))}</option>`)
    .join('');
}

/** select עם אפשרות ראשונה "הכול" (לסינונים) */
export function filterSelect({ id, label, chg, key, values, selected, labelOf }) {
  return `<div><label for="${id}">${esc(label)}</label>
    <select id="${id}" data-chg="${chg}" data-key="${key}">
      <option value="">הכול</option>${options(values, selected, labelOf)}
    </select></div>`;
}

/**
 * עורך רשימת טקסטים (צ'ק ליסט, מקורות ליד): שדה לכל פריט, מחיקה, הוספה ושמירה.
 * listId מזהה את הרשימה בפעולות: listAdd / listDel / listSave
 */
export function editableList(listId, items, labelPrefix) {
  const rows = items.map((text, i) => `
    <div class="row" style="margin-bottom:8px">
      <input class="list-input" data-list="${listId}" data-i="${i}" value="${esc(text)}" aria-label="${esc(labelPrefix)} ${i + 1}">
      <button class="btn danger small" data-act="listDel" data-list="${listId}" data-i="${i}" aria-label="מחיקה">✕</button>
    </div>`).join('');
  return `${rows}
    <div class="row">
      <button class="btn ghost small" data-act="listAdd" data-list="${listId}">הוספת פריט</button>
      <button class="btn small" data-act="listSave" data-list="${listId}">שמירה</button>
    </div>`;
}
