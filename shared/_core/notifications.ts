/**
 * notifications.ts - Paylasilan bildirim tipleri
 * Hem client hem server tarafindan kullanilan ortak tipler.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FloodAlertNotification {
  regionId: string;
  regionName: string;
  riskLevel: RiskLevel;
  previousRiskLevel?: RiskLevel;
  timestamp: string;
  message: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribeRequest {
  subscription: PushSubscriptionData;
  regionId: string;
  regionName: string;
  minRiskLevel?: RiskLevel;
  userId?: string;
}

export interface NotificationSubscription extends SubscribeRequest {
  id: string;
  createdAt: string;
}

export const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function isRiskLevelAtLeast(current: RiskLevel, minimum: RiskLevel): boolean {
  return RISK_LEVEL_ORDER[current] >= RISK_LEVEL_ORDER[minimum];
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: 'Dusuk',
    medium: 'Orta',
    high: 'Yuksek',
    critical: 'Kritik',
  };
  return labels[level];
}

export function getRiskLevelColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[level];
}
