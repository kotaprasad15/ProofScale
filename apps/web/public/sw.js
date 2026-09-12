// RateCap Web Push Service Worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'RateCap Notification',
      body: event.data.text(),
      data: { url: '/' }
    };
  }

  const title = payload.title || 'RateCap Alert';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'ratecap-notification',
    data: {
      url: payload.linkUrl || (payload.data && payload.data.url) || '/'
    },
    renotify: true,
    requireInteraction: payload.severity === 'critical'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Or navigate an existing window
      if (windowClients.length > 0 && 'navigate' in windowClients[0]) {
        return windowClients[0].navigate(targetUrl).then((c) => c.focus());
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
