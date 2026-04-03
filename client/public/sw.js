// Sel Uyari Sistemi - Service Worker
// Push bildirimlerini yonetir ve gelen uyarilari gosterir

const CACHE_NAME = 'flood-alert-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Kurulum: statik dosyalari onbellekle
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Aktivasyon: eski onbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Risk seviyesine gore bildirim ikonu rengi
function getRiskIcon(riskLevel) {
  const icons = {
    low: '/icons/flood-low.png',
    medium: '/icons/flood-medium.png',
    high: '/icons/flood-high.png',
    critical: '/icons/flood-critical.png',
  };
  return icons[riskLevel] || '/icons/flood-high.png';
}

// Risk seviyesine gore bildirim rengi (badge)
function getRiskBadgeColor(riskLevel) {
  const colors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[riskLevel] || '#ef4444';
}

// Push bildirimi alinan event
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] Push event alindi ancak veri yok');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    console.error('[SW] Push payload parse hatasi:', err);
    return;
  }

  const {
    title = 'Sel Uyarisi',
    body = 'Bolgenizde sel riski yukeldi.',
    riskLevel = 'high',
    regionName = 'Bilinmeyen Bolge',
    regionId,
    waterLevel,
    url = '/',
    timestamp,
  } = payload;

  const notificationTitle =
    riskLevel === 'critical'
      ? `KRITIK SEL UYARISI: ${regionName}`
      : `Sel Uyarisi: ${regionName}`;

  const notificationBody = waterLevel
    ? `${body} Su seviyesi: ${waterLevel}m`
    : body;

  const options = {
    body: notificationBody,
    icon: getRiskIcon(riskLevel),
    badge: '/icons/badge.png',
    tag: `flood-alert-${regionId || 'default'}`,
    renotify: true,
    requireInteraction: riskLevel === 'critical' || riskLevel === 'high',
    silent: false,
    vibrate: riskLevel === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    data: {
      url,
      regionId,
      regionName,
      riskLevel,
      waterLevel,
      timestamp: timestamp || new Date().toISOString(),
    },
    actions: [
      {
        action: 'view',
        title: 'Haritada Goster',
        icon: '/icons/map-icon.png',
      },
      {
        action: 'dismiss',
        title: 'Kapat',
        icon: '/icons/close-icon.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, options)
  );
});

// Bildirime tiklandiginda
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Acik sekme varsa odaklan
        const existingClient = windowClients.find(
          (client) => client.url.includes(targetUrl) || client.url.includes('flood')
        );
        if (existingClient) {
          return existingClient.focus();
        }
        // Yoksa yeni sekme ac
        return clients.openWindow(targetUrl);
      })
  );
});

// Bildirim kapandiginda
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  console.log('[SW] Bildirim kapatildi:', data.regionName, data.riskLevel);
});

// Fetch: network-first stratejisi (API), cache-first (statik)
self.addEventListener('fetch', (event) => {
  const { url } = event.request;

  // API isteklerini her zaman networkten al
  if (url.includes('/api/') || url.includes('/trpc/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Statik dosyalar icin cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
