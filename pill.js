/**
 * ui/components/pill.js - תגית צבעונית קטנה.
 * tone: good (ירוק) | warn (כתום) | bad (אדום) | info (כחול-ירוק) | na (אפור)
 */
import { esc } from '../../utils/format.js';

export function pill(text, tone = 'na') {
  return `<span class="pill ${tone}">${esc(text)}</span>`;
}
