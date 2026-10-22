/**
 * api/client.js - יצירת לקוח Supabase יחיד לכל האפליקציה.
 * ספריית Supabase נטענת כסקריפט רגיל ב-index.html ומוגדרת כ-window.supabase.
 */
import { SB_URL, SB_KEY } from '../config.js';

export const sb = window.supabase.createClient(SB_URL, SB_KEY);
