/*
 * sw.js - service worker של קומנדו שו״ש.
 * מטרה: טעינה מהירה והתקנה כאפליקציה. האפליקציה עצמה עדיין צריכה אינטרנט (הנתונים בבסיס הנתונים).
 * אסטרטגיה: "רשת קודם". תמיד מנסים להביא את הגרסה העדכנית מהשרת, ורק אם אין רשת משתמשים בעותק השמור.
 * כך עדכון של האפליקציה מגיע מיד אחרי העלאה, בלי צורך לנקות מטמון.
 * בקשות לשרתים אחרים (Supabase, ספריות) לא נשמרות כאן.
 */
const CACHE = 'komando-shosh-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // רק קבצי האתר עצמו
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
});
