/**
 * core/events.js - ניהול אירועים מרוכז ("האזנה אחת לכל הדף").
 *
 * במקום להצמיד מאזין לכל כפתור, כל אלמנט ב-HTML מצהיר מה הוא עושה באמצעות מאפיין data:
 *   data-act="saveVisit"  - פעולה בלחיצה
 *   data-chg="leadStatus" - פעולה בשינוי ערך (select, checkbox, תאריך)
 *   data-inp="searchLeads"- פעולה בכל הקלדה
 *   data-enter="login"    - פעולה בלחיצה על Enter בתוך השדה
 *
 * כל מסך מייצא אובייקט handlers עם פונקציות בשמות האלה, ו-main.js רושם אותן כאן.
 * פונקציית פעולה מקבלת (element, event) ויכולה לקרוא מאפייני data נוספים דרך element.dataset.
 */
const handlers = new Map();

/** רושם פעולות של מסך. שם כפול בין מסכים הוא שגיאה ולכן נזרקת חריגה. */
export function registerHandlers(map) {
  Object.keys(map).forEach(name => {
    if (handlers.has(name)) throw new Error(`שם פעולה כפול: ${name}`);
    handlers.set(name, map[name]);
  });
}

function run(name, el, event) {
  const fn = handlers.get(name);
  if (fn) fn(el, event);
}

/** מחבר את מאזיני הדף. נקרא פעם אחת באתחול. */
export function initEvents() {
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-act]');
    if (el) run(el.dataset.act, el, event);
  });

  document.addEventListener('change', event => {
    const el = event.target.closest('[data-chg]');
    if (el) run(el.dataset.chg, el, event);
  });

  document.addEventListener('input', event => {
    const el = event.target.closest('[data-inp]');
    if (el) run(el.dataset.inp, el, event);
  });

  document.addEventListener('keydown', event => {
    // Enter או רווח על אלמנט שמתנהג ככפתור (נגישות מקלדת)
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches && event.target.matches('[role="button"][data-act]')) {
      event.preventDefault();
      event.target.click();
      return;
    }
    // Enter בתוך שדה שמוגדר data-enter
    if (event.key === 'Enter' && event.target.dataset && event.target.dataset.enter) {
      run(event.target.dataset.enter, event.target, event);
    }
  });
}
