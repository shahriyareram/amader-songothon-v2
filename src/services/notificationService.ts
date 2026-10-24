import { doc, setDoc, updateDoc } from 'firebase/firestore';
import app, { db } from '../lib/firebase';
import { UserSession } from '../types';
import { isNativeApp, initNativePushNotifications } from './nativePushService';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ForegroundMessagePayload {
  title?: string;
  body?: string;
  icon?: string;
  data?: Record<string, any>;
}

const LOCAL_STORAGE_FCM_TOKEN = 'amader_shongothon_fcm_token';
const LOCAL_STORAGE_FCM_MEMBER = 'amader_shongothon_fcm_member_id';

/**
 * Checks if Push Notifications and Service Workers are supported in the current environment
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Gets the current notification permission status safely
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    return Notification.permission as NotificationPermissionState;
  } catch {
    return 'unsupported';
  }
}

/**
 * Requests notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    console.warn('[NotificationService] Push notifications are not supported in this browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('[NotificationService] Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Registers the Firebase Messaging Service Worker
 */
export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    // Wait for the service worker to become ready
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Lazily loads Firebase Messaging and retrieves an FCM registration token
 */
export async function getFcmToken(): Promise<string | null> {
  if (!isNotificationSupported()) {
    return null;
  }

  try {
    const swReg = await registerMessagingServiceWorker();
    if (!swReg) {
      console.warn('[NotificationService] Service Worker not registered.');
      return null;
    }

    const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      console.warn('[NotificationService] Firebase Messaging isSupported returned false.');
      return null;
    }

    const messaging = getMessaging(app);

    // Read optional public VAPID Key from environment if defined
    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || undefined;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: swReg,
      vapidKey: vapidKey || undefined,
    });

    return token || null;
  } catch (err: any) {
    console.warn('[NotificationService] Could not retrieve FCM token:', err?.message || err);
    return null;
  }
}

/**
 * Generates a stable, safe Firestore document ID for a token
 */
function generateTokenDocId(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  const cleanSuffix = token.slice(-16).replace(/[^a-zA-Z0-9_-]/g, '');
  return `tok_${Math.abs(hash).toString(36)}_${cleanSuffix}`;
}

/**
 * Registers and persists the FCM token for a specific Member Profile
 * CRITICAL MULTI-PROFILE RULE:
 * Tokens are strictly linked to memberId. If multiple profiles share the same phone,
 * switching to a new profile updates the active token mapping to that specific memberId,
 * preventing cross-profile notification leaks.
 */
export async function saveFcmTokenForMember(
  token: string,
  member: {
    id: string;
    name?: string;
    phone?: string;
    role?: string;
  }
): Promise<boolean> {
  if (!token || !member?.id) {
    return false;
  }

  const tokenDocId = generateTokenDocId(token);
  const now = new Date().toISOString();

  // 1. Direct Firestore write: Save in dedicated fcmTokens collection
  try {
    const tokenRef = doc(db, 'fcmTokens', tokenDocId);
    await setDoc(
      tokenRef,
      {
        token,
        memberId: member.id,
        memberName: member.name || '',
        phone: member.phone || '',
        role: member.role || 'member',
        platform: 'web',
        updatedAt: now,
        lastActiveAt: Date.now(),
      },
      { merge: true }
    );
  } catch (dbErr) {
    console.warn('[NotificationService] Direct Firestore token save notice:', dbErr);
  }

  // 2. Direct Firestore write: Update the member's profile document with the active token
  // Note: We do NOT force notificationsEnabled to true here to respect Admin's setting
  try {
    const memberRef = doc(db, 'members', member.id);
    await updateDoc(memberRef, {
      fcmToken: token,
      fcmUpdatedAt: now,
    });
  } catch (mErr) {
    console.warn('[NotificationService] Member document token update notice:', mErr);
  }

  // 3. Fallback server sync: ensures token is recorded via server-side logic
  try {
    await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        memberId: member.id,
        memberName: member.name || '',
        phone: member.phone || '',
        role: member.role || 'member',
      }),
    });
  } catch {
    // Non-blocking
  }

  // Record in localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_FCM_TOKEN, token);
    localStorage.setItem(LOCAL_STORAGE_FCM_MEMBER, member.id);
  } catch {}

  return true;
}

/**
 * Synchronizes the FCM token for the currently active member session.
 * Called when a member logs in, when they switch profile, or on initial mount.
 */
export async function syncFcmTokenForActiveMember(
  userSession: UserSession | null
): Promise<string | null> {
  if (!userSession || !userSession.memberId) {
    return null;
  }

  // If running inside Native Android APK, delegate to Capacitor Push Notifications (non-fatal)
  if (isNativeApp()) {
    try {
      return await initNativePushNotifications(userSession.memberId);
    } catch (nativeErr) {
      console.warn('[NotificationService] Non-fatal native push notification sync warning:', nativeErr);
      return null;
    }
  }

  if (getNotificationPermission() !== 'granted') {
    return null;
  }

  try {
    const token = await getFcmToken();
    if (!token) return null;

    const savedToken = localStorage.getItem(LOCAL_STORAGE_FCM_TOKEN);
    const savedMemberId = localStorage.getItem(LOCAL_STORAGE_FCM_MEMBER);

    // Update if token is new OR if member profile switched
    if (token !== savedToken || userSession.memberId !== savedMemberId) {
      await saveFcmTokenForMember(token, {
        id: userSession.memberId,
        name: userSession.name,
        phone: userSession.phone,
        role: userSession.role,
      });
      console.log(`[NotificationService] Token synced for active member profile: ${userSession.memberId}`);
    }

    return token;
  } catch (err) {
    console.warn('[NotificationService] Token synchronization warning:', err);
    return null;
  }
}

/**
 * Sets up foreground notification listener when the app tab is active
 */
export function setupForegroundNotificationListener(
  onMessageReceived?: (payload: ForegroundMessagePayload) => void
): () => void {
  if (!isNotificationSupported()) {
    return () => {};
  }

  let unsubscribe: (() => void) | null = null;

  (async () => {
    try {
      const { isSupported, getMessaging, onMessage } = await import('firebase/messaging');
      const supported = await isSupported().catch(() => false);
      if (!supported) return;

      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('[NotificationService] Foreground message received:', payload);

        const extracted: ForegroundMessagePayload = {
          title: payload.notification?.title || payload.data?.title || 'আমাদের সংগঠন',
          body: payload.notification?.body || payload.data?.body || '',
          icon: payload.notification?.icon || '/icon.svg',
          data: payload.data || {},
        };

        // Trigger custom window event for app-wide reactivity
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('amader_shongothon_fcm_message', { detail: extracted })
          );
        }

        if (onMessageReceived) {
          onMessageReceived(extracted);
        }
      });
    } catch (err) {
      console.warn('[NotificationService] Error setting up onMessage listener:', err);
    }
  })();

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}
