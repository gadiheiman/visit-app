/**
 * core/bus.js - "מתווך" קטן שמונע תלויות מעגליות בין מסכים לבין הניווט.
 *
 * מסכים צריכים לבקש "צייר מחדש" או "עבור למסך אחר", אבל הם לא צריכים להכיר את הנתב.
 * הנתב רושם את הפונקציות האמיתיות פעם אחת באתחול (ב-main.js).
 */
let renderer = () => {};
let navigator = () => {};

export const setRenderer = fn => { renderer = fn; };
export const setNavigator = fn => { navigator = fn; };

/** מצייר מחדש את המסך הנוכחי */
export const requestRender = () => renderer();

/** עובר למסך אחר: navigate('clinics', { clinicId: 'חפר-5182' }) */
export const navigate = (tab, extraUiState) => navigator(tab, extraUiState);
