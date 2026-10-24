/* eslint-disable no-undef */
// Service Worker for Firebase Cloud Messaging in "আমাদের সংগঠন"
// Handles background push notifications when the app is minimized or closed.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase App in the service worker with the project credentials
firebase.initializeApp({
  apiKey: "AIzaSyBp44F4ZRkTaWo0ksB629IOuuwW3l22pyg",
  authDomain: "gen-lang-client-0126045378.firebaseapp.com",
  projectId: "gen-lang-client-0126045378",
  storageBucket: "gen-lang-client-0126045378.firebasestorage.app",
  messagingSenderId: "809247917961",
  appId: "1:809247917961:web:62a9846dfb82aac4464358"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'আমাদের সংগঠন';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || '/icon.png',
    badge: payload.notification?.badge || '/badge.png',
    tag: payload.data?.tag || 'org-push-notification',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to focus or open the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
