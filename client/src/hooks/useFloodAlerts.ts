/**
 * useFloodAlerts.ts
 * Sel uyari aboneliklerini yoneten React custom hook.
 * Bölge aboneligi, durum takibi ve bildirim yonetimi.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getCurrentSubscription,
  getNotificationStatus,
  isPushSupported,
  subscribeToRegionAlerts,
  unsubscribeFromRegionAlerts,
  type RiskLevel,
} from '../services/notificationService';

export interface SubscribedRegion {
  regionId: string;
  regionName: string;
  subscribedAt: string;
  minRiskLevel: RiskLevel;
}

export interface FloodAlertState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isPermissionDenied: boolean;
  isLoading: boolean;
  error: string | null;
  subscribedRegions: SubscribedRegion[];
  hasActiveSubscription: boolean;
}

const STORAGE_KEY = 'flood_alert_subscriptions';

function loadSubscribedRegions(): SubscribedRegion[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SubscribedRegion[]) : [];
  } catch {
    return [];
  }
}

function saveSubscribedRegions(regions: SubscribedRegion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
  } catch {
    // localStorage kullanim disi olabilir
  }
}

export function useFloodAlerts() {
  const [state, setState] = useState<FloodAlertState>(() => {
    const status = getNotificationStatus();
    return {
      isSupported: status.isSupported,
      isPermissionGranted: status.permission === 'granted',
      isPermissionDenied: status.isBlocked,
      isLoading: false,
      error: null,
      subscribedRegions: loadSubscribedRegions(),
      hasActiveSubscription: false,
    };
  });

  // Mevcut abonelik durumunu kontrol et
  useEffect(() => {
    if (!isPushSupported()) return;

    getCurrentSubscription().then((sub) => {
      setState((prev) => ({ ...prev, hasActiveSubscription: !!sub }));
    });
  }, []);

  // Bildirim izni degisikliklerini dinle
  useEffect(() => {
    if (!('Notification' in window)) return;

    const checkPermission = () => {
      const permission = Notification.permission;
      setState((prev) => ({
        ...prev,
        isPermissionGranted: permission === 'granted',
        isPermissionDenied: permission === 'denied',
      }));
    };

    // Her 2 saniyede bir kontrol et (permission API event desteklemiyor)
    const interval = setInterval(checkPermission, 2000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Belirtilen bolge icin uyari aboneligi olustur
   */
  const subscribeRegion = useCallback(
    async (
      regionId: string,
      regionName: string,
      minRiskLevel: RiskLevel = 'high',
      userId?: string
    ): Promise<{ success: boolean; message: string }> => {
      // Zaten abone mi?
      const alreadySubscribed = state.subscribedRegions.some((r) => r.regionId === regionId);
      if (alreadySubscribed) {
        return { success: true, message: `${regionName} icin zaten abone olundu.` };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await subscribeToRegionAlerts(regionId, regionName, userId);

      if (result.success) {
        const newRegion: SubscribedRegion = {
          regionId,
          regionName,
          subscribedAt: new Date().toISOString(),
          minRiskLevel,
        };
        const updated = [...state.subscribedRegions, newRegion];
        saveSubscribedRegions(updated);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          subscribedRegions: updated,
          hasActiveSubscription: true,
          isPermissionGranted: true,
          isPermissionDenied: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
      }

      return result;
    },
    [state.subscribedRegions]
  );

  /**
   * Belirtilen bolge icin uyari aboneligini iptal et
   */
  const unsubscribeRegion = useCallback(
    async (regionId: string): Promise<{ success: boolean; message: string }> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await unsubscribeFromRegionAlerts(regionId);

      if (result.success) {
        const updated = state.subscribedRegions.filter((r) => r.regionId !== regionId);
        saveSubscribedRegions(updated);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          subscribedRegions: updated,
          hasActiveSubscription: updated.length > 0,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: result.message }));
      }

      return result;
    },
    [state.subscribedRegions]
  );

  /**
   * Belirli bir bolgeye abone olunup olunmadigini kontrol et
   */
  const isSubscribedToRegion = useCallback(
    (regionId: string): boolean => {
      return state.subscribedRegions.some((r) => r.regionId === regionId);
    },
    [state.subscribedRegions]
  );

  /**
   * Hatayi temizle
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Tum abonelikleri iptal et
   */
  const unsubscribeAll = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    for (const region of state.subscribedRegions) {
      await unsubscribeFromRegionAlerts(region.regionId);
    }
    saveSubscribedRegions([]);
    setState((prev) => ({
      ...prev,
      isLoading: false,
      subscribedRegions: [],
      hasActiveSubscription: false,
    }));
  }, [state.subscribedRegions]);

  return {
    ...state,
    subscribeRegion,
    unsubscribeRegion,
    isSubscribedToRegion,
    clearError,
    unsubscribeAll,
  };
}
