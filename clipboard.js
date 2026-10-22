/**
 * utils/clipboard.js - העתקת טקסט ללוח.
 */
import { toast } from '../core/dom.js';

/** העתקה בדרך המודרנית, ואם הדפדפן לא תומך, בדרך הישנה דרך שדה זמני */
export function copyText(text) {
  const done = () => toast('הועתק');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}

function legacyCopy(text, done) {
  const field = document.createElement('textarea');
  field.value = text;
  document.body.appendChild(field);
  field.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('ההעתקה לא נתמכת בדפדפן'); }
  field.remove();
}
