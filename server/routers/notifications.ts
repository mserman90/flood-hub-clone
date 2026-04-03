/**
 * notifications.ts - tRPC Router
 * Sel uyarisi push aboneliklerini yoneten backend router.
 * VAPID/web-push ile anlık bildirim gonderiminı saglar.
 *
 * Kurulum icin: pnpm add web-push @types/web-push
 * VAPID key uretime: npx web-push generate-vapid-keys
 */

import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';

// -----------------------------------------------------------
// Tip tanimlari
// -----------------------------------------------------------

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface StoredSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  regionId: string;
  regionName: string;
  userId?: string;
  createdAt: string;
  minRiskLevel: RiskLevel;
}

// -----------------------------------------------------------
// In-memory store (production'da PostgreSQL/Redis kullanin)
// -----------------------------------------------------------

const subscriptionStore = new Map<string, StoredSubscription>();

function getSubscriptionKey(endpoint: string, regionId: string): string {
  return `${regionId}::${Buffer.from(endpoint).toString('base64').slice(0, 32)}`;
}

function getSubscriptionsForRegion(regionId: string): StoredSubscription[] {
  return Array.from(subscriptionStore.values()).filter((s) => s.regionId === regionId);
}

function getAllSubscriptions(): StoredSubscription[] {
  return Array.from(subscriptionStore.values());
}

// -----------------------------------------------------------
// Web Push gonderici (web-push paketi yukluyse aktif olur)
// -----------------------------------------------------------

interface PushPayload {
  title: string;
  body: string;
  riskLevel: RiskLevel;
  regionId: string;
  regionName: string;
  waterLevel?: number;
  url: string;
  timestamp: string;
}

async function sendWebPushNotification(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // web-push paketi yukluyse dinamik import ile kullan
    const webpush = await import('web-push').catch(() => null);

    if (!webpush) {
      // Gelistirme ortami: konsola yaz
      console.log('[PUSH-SIM]', JSON.stringify({ subscription: subscription.endpoint, payload }));
      return { success: true };
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@floodhub.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[PUSH] VAPID anahtarlari eksik. .env dosyasina VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY ekleyin.');
      return { success: false, error: 'VAPID keys missing' };
    }

    webpush.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    await webpush.default.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    // 404/410: abonelik gecersiz, kaldir
    if (error.statusCode === 404 || error.statusCode === 410) {
      subscriptionStore.delete(getSubscriptionKey(subscription.endpoint, subscription.regionId));
      return { success: false, error: 'Subscription expired' };
    }
    return { success: false, error: error.message || 'Unknown push error' };
  }
}

// -----------------------------------------------------------
// tRPC Router
// -----------------------------------------------------------

export const notificationsRouter = router({
  /**
   * VAPID public key'i istemciye dondur
   * Istemci bu key ile push subscription olusturur
   */
  getVapidPublicKey: publicProcedure.query(() => {
    return {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
    };
  }),

  /**
   * Kullanicinin push aboneligini kaydet
   */
  subscribe: publicProcedure
    .input(
      z.object({
        subscription: z.object({
          endpoint: z.string().url(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
          expirationTime: z.number().nullable().optional(),
        }),
        regionId: z.string().min(1),
        regionName: z.string().min(1),
        userId: z.string().optional(),
        minRiskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('high'),
      })
    )
    .mutation(({ input }) => {
      const key = getSubscriptionKey(input.subscription.endpoint, input.regionId);

      const stored: StoredSubscription = {
        endpoint: input.subscription.endpoint,
        keys: input.subscription.keys,
        regionId: input.regionId,
        regionName: input.regionName,
        userId: input.userId,
        createdAt: new Date().toISOString(),
        minRiskLevel: input.minRiskLevel,
      };

      subscriptionStore.set(key, stored);

      console.log(
        `[NOTIF] Abonelik kaydedildi: bolge=${input.regionName}, toplam=${subscriptionStore.size}`
      );

      return {
        success: true,
        message: `${input.regionName} bolgesi icin uyari aboneligi aktiflestirildi.`,
      };
    }),

  /**
   * Kullanicinin push aboneligini iptal et
   */
  unsubscribe: publicProcedure
    .input(
      z.object({
        regionId: z.string().min(1),
        endpoint: z.string(),
      })
    )
    .mutation(({ input }) => {
      const key = getSubscriptionKey(input.endpoint, input.regionId);
      const deleted = subscriptionStore.delete(key);

      return {
        success: true,
        deleted,
        message: deleted ? 'Abonelik iptal edildi.' : 'Abonelik bulunamadi.',
      };
    }),

  /**
   * Belirli bir bolge icin tum aboneliklere bildirim gonder
   * (Flood risk job veya manuel test icin)
   */
  sendFloodAlert: publicProcedure
    .input(
      z.object({
        regionId: z.string().min(1),
        regionName: z.string().min(1),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
        waterLevel: z.number().optional(),
        title: z.string().optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { regionId, regionName, riskLevel, waterLevel } = input;

      const riskLabels: Record<RiskLevel, string> = {
        low: 'Dusuk',
        medium: 'Orta',
        high: 'Yuksek',
        critical: 'KRITIK',
      };

      const defaultTitle =
        riskLevel === 'critical'
          ? `KRITIK SEL UYARISI: ${regionName}`
          : `Sel Risk Uyarisi: ${regionName}`;

      const defaultBody = waterLevel
        ? `${regionName} bolgesinde ${riskLabels[riskLevel]} sel riski tespit edildi. Su seviyesi: ${waterLevel.toFixed(2)}m`
        : `${regionName} bolgesinde ${riskLabels[riskLevel]} sel riski tespit edildi.`;

      const payload: PushPayload = {
        title: input.title || defaultTitle,
        body: input.body || defaultBody,
        riskLevel,
        regionId,
        regionName,
        waterLevel,
        url: `/?region=${regionId}`,
        timestamp: new Date().toISOString(),
      };

      // Yalnizca yeterli risk seviyesine abone olanlara gonder
      const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      const targets = getSubscriptionsForRegion(regionId).filter(
        (s) => riskOrder.indexOf(riskLevel) >= riskOrder.indexOf(s.minRiskLevel)
      );

      let sentCount = 0;
      let failCount = 0;

      for (const sub of targets) {
        const result = await sendWebPushNotification(sub, payload);
        if (result.success) sentCount++;
        else failCount++;
      }

      console.log(
        `[NOTIF] Alert gonderildi: bolge=${regionName}, risk=${riskLevel}, gonderilen=${sentCount}, basarisiz=${failCount}`
      );

      return {
        success: true,
        regionId,
        riskLevel,
        targetCount: targets.length,
        sentCount,
        failCount,
      };
    }),

  /**
   * Abonelik istatistiklerini dondur
   */
  getStats: publicProcedure.query(() => {
    const all = getAllSubscriptions();
    const byRegion: Record<string, number> = {};
    for (const sub of all) {
      byRegion[sub.regionId] = (byRegion[sub.regionId] || 0) + 1;
    }
    return {
      totalSubscriptions: all.length,
      byRegion,
    };
  }),

  /**
   * Tum aboneliklere toplu flood risk kontrolu gonder
   * (floodRiskJob.ts tarafindan cagirilir)
   */
  broadcastFloodAlerts: publicProcedure
    .input(
      z.object({
        alerts: z.array(
          z.object({
            regionId: z.string(),
            regionName: z.string(),
            riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
            waterLevel: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const alert of input.alerts) {
        if (alert.riskLevel === 'low' || alert.riskLevel === 'medium') {
          continue; // Dusuk ve orta risk icin push gonderme
        }

        const riskLabels: Record<RiskLevel, string> = {
          low: 'Dusuk',
          medium: 'Orta',
          high: 'Yuksek',
          critical: 'KRITIK',
        };

        const payload: PushPayload = {
          title:
            alert.riskLevel === 'critical'
              ? `KRITIK SEL UYARISI: ${alert.regionName}`
              : `Yuksek Sel Riski: ${alert.regionName}`,
          body: `${alert.regionName} bolgesinde ${riskLabels[alert.riskLevel]} sel riski${
            alert.waterLevel ? ` (${alert.waterLevel.toFixed(2)}m)` : ''
          }. Lutfen dikkatli olun.`,
          riskLevel: alert.riskLevel,
          regionId: alert.regionId,
          regionName: alert.regionName,
          waterLevel: alert.waterLevel,
          url: `/?region=${alert.regionId}`,
          timestamp: new Date().toISOString(),
        };

        const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
        const targets = getSubscriptionsForRegion(alert.regionId).filter(
          (s) => riskOrder.indexOf(alert.riskLevel) >= riskOrder.indexOf(s.minRiskLevel)
        );

        let sent = 0;
        for (const sub of targets) {
          const result = await sendWebPushNotification(sub, payload);
          if (result.success) sent++;
        }

        results.push({ regionId: alert.regionId, sent, total: targets.length });
      }

      return { success: true, results };
    }),
});
