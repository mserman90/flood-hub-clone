/**
 * notificationService.ts
 * Web Push (VAPID) abonelik islemlerini yoneten servis.
 * Service Worker kaydi, izin isteme ve backend'e abonelik gonderme.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PushSubscriptionPayload {
  subscription: PushSubscriptionJSON;
  regionId: string;
  regionName: string;
  userId?: string;
}

export interface NotificationPreferences {
  minRiskLevel: RiskLevel;
  regions: string[];
}

// VAPID public key (env'den al, yoksa placeholder)
const VAPID_PUBLIC_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta as Record<string, unknown>).env &&
    ((import.meta as Record<string, unknown>).env as Record<string, string>)
      .VITE_VAPID_PUBLIC_KEY) ||
  'VAPID_PUBLIC_KEY_PLACEHOLDER';

/**
 * Base64 VAPID key'i Uint8Array'e donustur
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Tarayicinin Web Push destekleyip desteklemedigini kontrol et
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Mevcut bildirim iznini dondur
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Service Worker'i kaydet
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker bu tarayicida desteklenmiyor.');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
  return registration;
}

/**
 * Bildirim izni iste
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Kullaniciyi Push'a abone et
 */
export async function subscribeUserToPush(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;

  // Mevcut abonelik varsa dondur
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return subscription;
}

/**
 * Mevcut aboneligi getir (yoksa null)
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Aboneligi iptal et
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return true;
  return await subscription.unsubscribe();
}

/**
 * Aboneligi backend'e kaydet (belirli bir bolge icin)
 */
export async function sendSubscriptionToServer(
  payload: PushSubscriptionPayload
): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Abonelik kaydedilemedi' }));
    throw new Error(err.message || 'Abonelik kaydedilemedi');
  }
}

/**
 * Aboneligi backend'den sil (belirli bir bolge icin)
 */
export async function removeSubscriptionFromServer(
  regionId: string,
  endpoint: string
): Promise<void> {
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regionId, endpoint }),
  });
}

/**
 * Bir bolgeye tam abone olma akisi:
 * 1. SW kaydet
 * 2. Izin iste
 * 3. Push subscribe
 * 4. Backend'e gonder
 */
export async function subscribeToRegionAlerts(
  regionId: string,
  regionName: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isPushSupported()) {
      return { success: false, message: 'Bu tarayici anlık bildirimleri desteklemiyor.' };
    }

    await registerServiceWorker();

    const granted = await requestNotificationPermission();
    if (!granted) {
      return { success: false, message: 'Bildirim izni verilmedi. Tarayici ayarlarindan izin verin.' };
    }

    const subscription = await subscribeUserToPush();

    await sendSubscriptionToServer({
      subscription: subscription.toJSON(),
      regionId,
      regionName,
      userId,
    });

    return { success: true, message: `${regionName} icin sel uyarilari aktiflestirildi.` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return { success: false, message: msg };
  }
}

/**
 * Bir bolgeden aboneligi tamamen kaldir
 */
export async function unsubscribeFromRegionAlerts(
  regionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await getCurrentSubscription();
    if (subscription) {
      await removeSubscriptionFromServer(regionId, subscription.endpoint);
    }
    return { success: true, message: 'Uyari aboneligi iptal edildi.' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return { success: false, message: msg };
  }
}

/**
 * Tarayici bildirim durumu ozeti
 */
export function getNotificationStatus(): {
  isSupported: boolean;
  permission: NotificationPermission;
  isBlocked: boolean;
} {
  const isSupported = isPushSupported();
  const permission = isSupported ? getNotificationPermission() : 'denied';
  return {
    isSupported,
    permission,
    isBlocked: permission === 'denied',
  };
}
