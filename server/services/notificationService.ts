/**
 * notificationService.ts
 * Bildirim tercihlerine göre bildirimleri gönderen servis.
 * Anlık, günlük özet, haftalık özet ve sessiz saatleri yönetir.
 */

import { getDb } from '../db';
import { notificationPreferences, alertHistory } from '../../drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';

type NotificationMode = 'instant' | 'daily' | 'weekly' | 'disabled';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface AlertInfo {
  regionId: string;
  regionName: string;
  riskLevel: RiskLevel;
  waterLevel?: number;
  title?: string;
  body?: string;
}

/**
 * Kullanıcının bildirim tercihlerini al
 */
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Sessiz saatlerde olup olmadığını kontrol et
 */
function isInQuietHours(prefs: any): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  // Eğer başlangıç saati bitiş saatinden büyükse (örn: 22:00 - 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  } else {
    return currentTime >= start && currentTime < end;
  }
}

/**
 * Risk seviyesini sayısal değere çevir (karşılaştırma için)
 */
function getRiskLevelValue(level: RiskLevel): number {
  const values: Record<RiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return values[level];
}

/**
 * Kullanıcının bu risk seviyesi için bildirim alması gerekip gerekmediğini kontrol et
 */
function shouldNotifyForRiskLevel(userMinRisk: RiskLevel, alertRisk: RiskLevel): boolean {
  return getRiskLevelValue(alertRisk) >= getRiskLevelValue(userMinRisk);
}

/**
 * Bildirim tercihlerine göre bildirim gönderilip gönderilmeyeceğini belirle
 */
export function shouldSendNotification(
  prefs: any,
  alert: AlertInfo,
  isQuietHours: boolean
): {
  shouldSend: boolean;
  channels: string[];
  reason?: string;
} {
  // Bildirimler kapalı mı?
  if (prefs.notificationMode === 'disabled') {
    return { shouldSend: false, channels: [], reason: 'Bildirimler kapalı' };
  }

  // Risk seviyesi filtreleme
  if (!shouldNotifyForRiskLevel(prefs.minRiskLevel, alert.riskLevel)) {
    return {
      shouldSend: false,
      channels: [],
      reason: `Risk seviyesi ${prefs.minRiskLevel} altında`,
    };
  }

  // Sessiz saatlerde mi?
  if (isQuietHours) {
    return { shouldSend: false, channels: [], reason: 'Sessiz saatlerde' };
  }

  // Anlık bildirim modu
  if (prefs.notificationMode === 'instant') {
    const channels: string[] = [];
    if (prefs.enablePush) channels.push('push');
    if (prefs.enableEmail) channels.push('email');
    if (prefs.enableInApp) channels.push('in-app');

    return {
      shouldSend: channels.length > 0,
      channels,
      reason: 'Anlık bildirim',
    };
  }

  // Günlük/Haftalık özet - şimdi gönderme, daha sonra topla
  if (prefs.notificationMode === 'daily' || prefs.notificationMode === 'weekly') {
    return {
      shouldSend: false,
      channels: [],
      reason: 'Özet modunda - daha sonra gönderilecek',
    };
  }

  return { shouldSend: false, channels: [] };
}

/**
 * Günlük özet bildirimi gönderilmesi gerekip gerekmediğini kontrol et
 */
export function shouldSendDailySummary(prefs: any): boolean {
  if (prefs.notificationMode !== 'daily') return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Özet saatine ulaştı mı? (5 dakika tolerans)
  const summaryTime = prefs.summaryTime; // HH:mm format
  const [summaryHour, summaryMin] = summaryTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const summaryTotalMin = summaryHour * 60 + summaryMin;
  const currentTotalMin = currentHour * 60 + currentMin;

  return Math.abs(summaryTotalMin - currentTotalMin) <= 5;
}

/**
 * Haftalık özet bildirimi gönderilmesi gerekip gerekmediğini kontrol et
 */
export function shouldSendWeeklySummary(prefs: any): boolean {
  if (prefs.notificationMode !== 'weekly') return false;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];

  if (currentDay !== prefs.summaryDay) return false;

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const summaryTime = prefs.summaryTime; // HH:mm format
  const [summaryHour, summaryMin] = summaryTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const summaryTotalMin = summaryHour * 60 + summaryMin;
  const currentTotalMin = currentHour * 60 + currentMin;

  return Math.abs(summaryTotalMin - currentTotalMin) <= 5;
}

/**
 * Kullanıcının son 24 saatteki uyarılarını al
 */
export async function getUserAlertsForSummary(
  userId: number,
  hoursBack: number = 24
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Basit örnek - gerçek implementasyonda alertHistory ve alertSubscriptions'ı join etmen gerekir
  const result = await db
    .select()
    .from(alertHistory)
    .where(gte(alertHistory.sentAt, cutoffTime))
    .limit(100);

  return result;
}

/**
 * Bildirim tercihlerini doğrula
 */
export function validatePreferences(prefs: any): string[] {
  const errors: string[] = [];

  if (!['instant', 'daily', 'weekly', 'disabled'].includes(prefs.notificationMode)) {
    errors.push('Geçersiz bildirim modu');
  }

  if (!['low', 'medium', 'high', 'critical'].includes(prefs.minRiskLevel)) {
    errors.push('Geçersiz minimum risk seviyesi');
  }

  // Saat formatını doğrula
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(prefs.summaryTime)) {
    errors.push('Geçersiz özet saati formatı');
  }

  if (prefs.quietHoursEnabled) {
    if (!timeRegex.test(prefs.quietHoursStart)) {
      errors.push('Geçersiz sessiz saat başlangıcı');
    }
    if (!timeRegex.test(prefs.quietHoursEnd)) {
      errors.push('Geçersiz sessiz saat bitişi');
    }
  }

  return errors;
}

/**
 * Bildirim tercihlerinin özet bilgisini oluştur
 */
export function getPreferenceSummary(prefs: any): string {
  const parts: string[] = [];

  parts.push(`Mod: ${prefs.notificationMode}`);

  const channels: string[] = [];
  if (prefs.enablePush) channels.push('Push');
  if (prefs.enableEmail) channels.push('Email');
  if (prefs.enableInApp) channels.push('Uygulama İçi');
  parts.push(`Kanallar: ${channels.join(', ') || 'Hiçbiri'}`);

  parts.push(`Min Risk: ${prefs.minRiskLevel}`);

  if (prefs.quietHoursEnabled) {
    parts.push(`Sessiz Saatler: ${prefs.quietHoursStart} - ${prefs.quietHoursEnd}`);
  }

  return parts.join(' | ');
}
