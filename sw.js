'use strict';

// TXT-ED 完全オフライン版: 必要なファイルはすべて配布ZIPに同梱。
const CACHE_NAME = 'txt-ed-pwa-offline-v7';
const APP_ASSETS = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './libs/pdf.min.js', './libs/pdf.worker.min.js', './libs/pdf-lib.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 必須ファイルが欠けている場合は不完全なキャッシュを作らない。
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      if (request.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      return new Response('オフラインです。このファイルは配布ZIPに含まれていません。', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
