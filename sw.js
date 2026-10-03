// Bewaart de site op de gsm, zodat ze ook zonder internet opent.
// Altijd eerst het netwerk (dus altijd de nieuwste versie), de bewaarde kopie alleen als er geen verbinding is.
const CACHE = "dus-2026-v2";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const assets = /(^|\.)cdn\.jsdelivr\.net$|^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !assets) return; // kaarttegels e.d.: gewoon via het netwerk

  // Eigen pagina's: altijd bij GitHub navragen of er een nieuwere versie is (geen verouderde browserkopie).
  const live = sameOrigin ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  e.respondWith(
    live
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
