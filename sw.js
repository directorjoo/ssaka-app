/* 싸바 서비스워커 — 새 파일을 먼저 받고(network-first), 인터넷이 약하면 저장해 둔 화면을 보여줌 */
var CACHE = 'sava-v38';
var SHELL = ['./', './app/', './eodiya/', './lucky/', './shoot/', './fly/', './pool/', './emo/', './make/', './c/', './css/brand.css', './css/sk.css', './css/sk-world.css',
  './js/codec.js', './js/store.js', './js/designs.js', './js/render.js', './js/share.js', './js/msgimg.js', './js/install.js', './js/sound.js',
  './img/icon-192.png?v=2', './img/cherry.svg', './img/cherry-dance-anim.svg', './manifest.webmanifest'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // 휴대폰에 4시간 묵혀 둔 파일 대신 늘 서버에 새것이 있는지 확인 (없으면 304로 빨리 끝남)
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (hit) {
      return hit || new Response('<meta charset=utf-8><meta name=viewport content="width=device-width"><p style="font:17px sans-serif;padding:28px">인터넷 연결을 확인해 주세요 🍒</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    });
  }));
});
