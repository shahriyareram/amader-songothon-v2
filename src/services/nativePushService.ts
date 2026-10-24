import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

const LOCAL_STORAGE_NATIVE_FCM_TOKEN = 'amader_shongothon_fcm_token_native';
const STORAGE_DIAGNOSTIC_EVENTS = 'amader_push_diagnostic_events_v1';

export interface PushDiagnosticEvent {
  time: string;
  step: string;
  status: 'started' | 'success' | 'failed' | 'info';
  details?: string;
}

export function logPushDiagnostic(
  step: string,
  status: 'started' | 'success' | 'failed' | 'info',
  details?: string
): void {
  try {
    const raw = localStorage.getItem(STORAGE_DIAGNOSTIC_EVENTS);
    const list: PushDiagnosticEvent[] = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    list.push({
      time: timeStr,
      step,
      status,
      details: details ? String(details).slice(0, 200) : undefined,
    });
    if (list.length > 30) list.shift();
    localStorage.setItem(STORAGE_DIAGNOSTIC_EVENTS, JSON.stringify(list));
  } catch {
    // Non-fatal
  }
}

export function getPushDiagnostics(): PushDiagnosticEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_DIAGNOSTIC_EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearPushDiagnostics(): void {
  try {
    localStorage.removeItem(STORAGE_DIAGNOSTIC_EVENTS);
  } catch {}
}

let listenersRegistered = false;
let isRegisteringPush = false;
let lastRegisteredMemberId: string | null = null;
let currentActiveMemberId: string | null = null;
let activeRegisterTimer: any = null;
let registrationTimeoutTimer: any = null;

/**
 * Checks if running on a native platform (Android/iOS)
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initializes Native Android Push Notifications via Capacitor
 * Strictly runs on native Android APK; does not interfere with Web FCM.
 * Non-fatal & deferred: Under NO circumstances will permission denial,
 * missing Google Play Services, FCM token failure, or plugin rejection crash the app or halt navigation.
 */
export async function initNativePushNotifications(memberId?: string): Promise<string | null> {
  if (!isNativeApp()) {
    // Pure Web browser: do nothing, web notificationService handles this
    return null;
  }

  // Ensure PushNotifications plugin is available before calling any native methods
  if (!Capacitor.isPluginAvailable('PushNotifications')) {
    console.warn('[NativePush] PushNotifications plugin is not available on this platform/build.');
    return null;
  }

  // Deduplication & concurrency guard:
  // If an active registration is already in progress, avoid redundant concurrent native calls.
  if (isRegisteringPush) {
    logPushDiagnostic('init_native_push', 'info', `Skipped concurrent init; registration already in progress for member: ${memberId || 'unknown'}`);
    return localStorage.getItem(LOCAL_STORAGE_NATIVE_FCM_TOKEN);
  }

  // If already registered for this exact member and token is present, avoid repetitive calls.
  const existingToken = localStorage.getItem(LOCAL_STORAGE_NATIVE_FCM_TOKEN);
  if (existingToken && lastRegisteredMemberId === (memberId || null) && listenersRegistered) {
    logPushDiagnostic('init_native_push', 'info', `Already registered for member: ${memberId || 'unknown'}`);
    return existingToken;
  }

  isRegisteringPush = true;
  currentActiveMemberId = memberId || null;

  logPushDiagnostic('init_native_push', 'started', `member_provided: ${!!memberId}`);

  try {
    // 1. Attach listeners ONCE before register, safely guarded
    if (!listenersRegistered) {
      logPushDiagnostic('attach_listeners', 'started');
      try {
        await PushNotifications.addListener('registration', async (token: Token) => {
          logPushDiagnostic('listener_registration', 'success', `token_len: ${token?.value?.length || 0}`);
          console.log('[NativePush] Device registered for push notifications. Token received.');
          if (registrationTimeoutTimer) {
            clearTimeout(registrationTimeoutTimer);
            registrationTimeoutTimer = null;
          }
          try {
            if (token && token.value) {
              localStorage.setItem(LOCAL_STORAGE_NATIVE_FCM_TOKEN, token.value);
              localStorage.setItem('amader_shongothon_fcm_token', token.value);
              lastRegisteredMemberId = currentActiveMemberId;

              // Register token with backend server
              await fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: token.value,
                  memberId: currentActiveMemberId || 'unknown',
                  platform: 'android',
                }),
              }).catch((err) => {
                console.warn('[NativePush] Failed to register token with server:', err);
              });
            }
          } catch (e) {
            console.warn('[NativePush] Token storage error:', e);
          } finally {
            isRegisteringPush = false;
          }
        });

        await PushNotifications.addListener('registrationError', (error: any) => {
          if (registrationTimeoutTimer) {
            clearTimeout(registrationTimeoutTimer);
            registrationTimeoutTimer = null;
          }
          const errMsg = String(error?.error || error?.message || error || 'registration_error');
          logPushDiagnostic('listener_registration_error', 'failed', errMsg);
          console.warn('[NativePush] Non-fatal notification registration notice:', error);
          isRegisteringPush = false;
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          logPushDiagnostic('listener_push_received', 'info', `has_title: ${!!notification?.title}`);
          console.log('[NativePush] Notification received in foreground:', notification);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          logPushDiagnostic('listener_action_performed', 'info', `action_id: ${action?.actionId || 'tap'}`);
          console.log('[NativePush] Action performed on notification:', action);
        });

        listenersRegistered = true;
        logPushDiagnostic('attach_listeners', 'success');
      } catch (listenerError: any) {
        logPushDiagnostic('attach_listeners', 'failed', String(listenerError?.message || listenerError));
        console.warn('[NativePush] Non-fatal notice when attaching push notification listeners:', listenerError);
      }
    }

    // 2. Safely check notification permissions
    logPushDiagnostic('check_permissions', 'started');
    let permStatus: any = null;
    try {
      permStatus = await PushNotifications.checkPermissions();
      logPushDiagnostic('check_permissions', 'success', `receive: ${permStatus?.receive || 'unknown'}`);
    } catch (checkErr: any) {
      logPushDiagnostic('check_permissions', 'failed', String(checkErr?.message || checkErr));
      console.warn('[NativePush] Non-fatal error while checking permissions:', checkErr);
      isRegisteringPush = false;
      return null;
    }

    // 3. Safely request notification permissions if needed
    if (permStatus?.receive === 'prompt' || permStatus?.receive === 'prompt-with-rationale') {
      logPushDiagnostic('request_permissions', 'started', `prior_receive: ${permStatus?.receive}`);
      try {
        permStatus = await PushNotifications.requestPermissions();
        logPushDiagnostic('request_permissions', 'success', `new_receive: ${permStatus?.receive || 'unknown'}`);
      } catch (reqErr: any) {
        logPushDiagnostic('request_permissions', 'failed', String(reqErr?.message || reqErr));
        console.warn('[NativePush] Non-fatal error while requesting permissions:', reqErr);
        isRegisteringPush = false;
        return null;
      }
    }

    if (permStatus?.receive !== 'granted') {
      logPushDiagnostic('permission_not_granted', 'info', `receive: ${permStatus?.receive}`);
      console.warn('[NativePush] Notification permission not granted on Android:', permStatus?.receive);
      isRegisteringPush = false;
      return null;
    }

    logPushDiagnostic('permission_granted', 'info', 'User granted notification permission');

    // 4. Create dedicated Android Notification Channel (Android 8.0+)
    // ID: org_payment_alerts | Importance: HIGH (4) | Lock-screen visibility: PUBLIC (1)
    logPushDiagnostic('create_channel', 'started', 'id: org_payment_alerts, importance: 4');
    try {
      await PushNotifications.createChannel({
        id: 'org_payment_alerts',
        name: 'আমাদের সংগঠন নোটিফিকেশন',
        description: 'সাপ্তাহিক জমা ও পেমেন্ট সংক্রান্ত জরুরি নোটিফিকেশন',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#059669',
      });
      logPushDiagnostic('create_channel', 'success', 'Notification channel created');
      console.log('[NativePush] Notification channel org_payment_alerts created/configured.');
    } catch (channelError: any) {
      logPushDiagnostic('create_channel', 'failed', String(channelError?.message || channelError));
      console.warn('[NativePush] Non-fatal notification channel creation notice:', channelError);
    }

    // 5. Register with FCM in a single debounced and deferred manner
    // Clear any pending timer to avoid overlapping register calls
    if (activeRegisterTimer) {
      clearTimeout(activeRegisterTimer);
      activeRegisterTimer = null;
    }

    logPushDiagnostic('fcm_register', 'started', 'Scheduled in 2500ms');
    activeRegisterTimer = setTimeout(() => {
      activeRegisterTimer = null;
      try {
        if (Capacitor.isPluginAvailable('PushNotifications')) {
          logPushDiagnostic('fcm_register', 'started', 'Calling PushNotifications.register()');

          // Fallback safety timeout: If native FCM takes longer than 12s or neither listener fires,
          // release the registration lock so subsequent attempts/retries are not blocked.
          if (registrationTimeoutTimer) clearTimeout(registrationTimeoutTimer);
          registrationTimeoutTimer = setTimeout(() => {
            registrationTimeoutTimer = null;
            if (isRegisteringPush) {
              isRegisteringPush = false;
              logPushDiagnostic('fcm_register', 'info', 'Registration lock auto-released after timeout');
            }
          }, 12000);

          PushNotifications.register()
            .then(() => {
              logPushDiagnostic('fcm_register', 'success', 'PushNotifications.register() promise resolved');
            })
            .catch((regError: any) => {
              if (registrationTimeoutTimer) {
                clearTimeout(registrationTimeoutTimer);
                registrationTimeoutTimer = null;
              }
              isRegisteringPush = false;
              logPushDiagnostic('fcm_register', 'failed', String(regError?.message || regError));
              console.warn('[NativePush] Handled non-fatal error during PushNotifications.register():', regError);
            });
        } else {
          isRegisteringPush = false;
        }
      } catch (regError: any) {
        if (registrationTimeoutTimer) {
          clearTimeout(registrationTimeoutTimer);
          registrationTimeoutTimer = null;
        }
        isRegisteringPush = false;
        logPushDiagnostic('fcm_register', 'failed', String(regError?.message || regError));
        console.warn('[NativePush] Non-fatal exception during PushNotifications.register():', regError);
      }
    }, 2500);

    return localStorage.getItem(LOCAL_STORAGE_NATIVE_FCM_TOKEN);
  } catch (error: any) {
    isRegisteringPush = false;
    logPushDiagnostic('init_native_push', 'failed', String(error?.message || error));
    console.warn('[NativePush] Non-fatal error initializing native push notifications:', error);
    return null;
  }
}

