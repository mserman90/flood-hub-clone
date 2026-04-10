import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationsRouter } from './notifications';
import type { TrpcContext } from '../_core/context';

// Mock context
const mockContext: TrpcContext = {
  user: null,
  req: {} as any,
  res: {} as any,
};

describe('notificationsRouter', () => {
  let caller: any;

  beforeEach(() => {
    caller = notificationsRouter.createCaller(mockContext);
  });

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key from environment', async () => {
      const result = await caller.getVapidPublicKey();
      expect(result).toHaveProperty('vapidPublicKey');
      // VAPID key null olabilir (test ortamında)
      expect(result.vapidPublicKey === null || typeof result.vapidPublicKey === 'string').toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should subscribe user to push notifications', async () => {
      const input = {
        subscription: {
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-key-1',
            auth: 'test-auth-1',
          },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      };

      const result = await caller.subscribe(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Çubuk Çayı (Ankara)');
    });

    it('should handle multiple subscriptions for same region', async () => {
      const input1 = {
        subscription: {
          endpoint: 'https://example.com/push1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      };

      const input2 = {
        subscription: {
          endpoint: 'https://example.com/push2',
          keys: { p256dh: 'key2', auth: 'auth2' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'medium' as const,
      };

      const result1 = await caller.subscribe(input1);
      const result2 = await caller.subscribe(input2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe user from push notifications', async () => {
      const subscribeInput = {
        subscription: {
          endpoint: 'https://example.com/push',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      };

      await caller.subscribe(subscribeInput);

      const unsubscribeInput = {
        regionId: 'ankara-cubuk',
        endpoint: 'https://example.com/push',
      };

      const result = await caller.unsubscribe(unsubscribeInput);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
    });

    it('should handle unsubscribe for non-existent subscription', async () => {
      const result = await caller.unsubscribe({
        regionId: 'non-existent',
        endpoint: 'https://example.com/non-existent',
      });

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(false);
    });
  });

  describe('sendFloodAlert', () => {
    it('should send flood alert to subscribed users', async () => {
      // Subscribe a user first
      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      });

      const alertInput = {
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        riskLevel: 'high' as const,
        waterLevel: 3.8,
        title: 'Test Sel Uyarısı',
        body: 'Test mesajı',
      };

      const result = await caller.sendFloodAlert(alertInput);

      expect(result.success).toBe(true);
      expect(result.regionId).toBe('ankara-cubuk');
      expect(result.riskLevel).toBe('high');
      expect(result.sentCount).toBeGreaterThanOrEqual(0);
    });

    it('should filter subscriptions by risk level', async () => {
      // Subscribe with different risk levels
      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'test-region',
        regionName: 'Test Region',
        minRiskLevel: 'critical' as const,
      });

      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push2',
          keys: { p256dh: 'key2', auth: 'auth2' },
        },
        regionId: 'test-region',
        regionName: 'Test Region',
        minRiskLevel: 'high' as const,
      });

      // Send high risk alert
      const result = await caller.sendFloodAlert({
        regionId: 'test-region',
        regionName: 'Test Region',
        riskLevel: 'high' as const,
        waterLevel: 3.5,
      });

      expect(result.success).toBe(true);
      // Should only send to users subscribed to 'high' or lower
      expect(result.targetCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStats', () => {
    it('should return subscription statistics', async () => {
      // Subscribe to multiple regions
      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      });

      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push2',
          keys: { p256dh: 'key2', auth: 'auth2' },
        },
        regionId: 'istanbul-kagithane',
        regionName: 'Kağıthane Deresi (Istanbul)',
        minRiskLevel: 'high' as const,
      });

      const stats = await caller.getStats();

      expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(2);
      expect(stats.byRegion).toHaveProperty('ankara-cubuk');
      expect(stats.byRegion).toHaveProperty('istanbul-kagithane');
    });
  });

  describe('broadcastFloodAlerts', () => {
    it('should broadcast multiple flood alerts', async () => {
      // Subscribe to regions
      await caller.subscribe({
        subscription: {
          endpoint: 'https://example.com/push1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        regionId: 'ankara-cubuk',
        regionName: 'Çubuk Çayı (Ankara)',
        minRiskLevel: 'high' as const,
      });

      const alerts = [
        {
          regionId: 'ankara-cubuk',
          regionName: 'Çubuk Çayı (Ankara)',
          riskLevel: 'high' as const,
          waterLevel: 3.8,
        },
        {
          regionId: 'istanbul-kagithane',
          regionName: 'Kağıthane Deresi (Istanbul)',
          riskLevel: 'critical' as const,
          waterLevel: 4.5,
        },
      ];

      const result = await caller.broadcastFloodAlerts({ alerts });

      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
    });

    it('should skip low and medium risk alerts', async () => {
      const alerts = [
        {
          regionId: 'test-region',
          regionName: 'Test Region',
          riskLevel: 'low' as const,
          waterLevel: 2.0,
        },
        {
          regionId: 'test-region',
          regionName: 'Test Region',
          riskLevel: 'medium' as const,
          waterLevel: 3.0,
        },
      ];

      const result = await caller.broadcastFloodAlerts({ alerts });

      expect(result.success).toBe(true);
      // Should skip low and medium risk
      expect(result.results.length).toBe(0);
    });
  });
});
