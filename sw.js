// 트인길 서비스 워커: 앱 화면과 라이브러리는 저장해 두고, 지도·경로 데이터는 항상 인터넷에서 새로 받음
const VERSION = 'openroad-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 화면: 새 버전을 먼저 시도하고, 인터넷이 없으면 저장본 사용
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // 지도·폰트 라이브러리: 저장본 우선
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // 그 밖의 요청(지도 타일, 장소 검색, 경로 계산)은 그대로 인터넷으로
});
