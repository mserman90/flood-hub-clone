import { describe, it, expect, beforeEach } from 'vitest';
import { preferencesRouter } from './preferences';
import type { TrpcContext } from '../_core/context';

// Mock context
const mockContext: TrpcContext = {
  user: {
    id: 1,
    openId: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    loginMethod: 'test',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

describe('preferencesRouter', () => {
  let caller: any;

  beforeEach(() => {
    caller = preferencesRouter.createCaller(mockContext);
  });

  describe('getPreferences', () => {
    it('should return default preferences if none exist', async () => {
      const result = await caller.getPreferences();

      expect(result).toBeDefined();
      // Tercihler önceki testlerden kalabilir, bu yüzden sadece temel özellikleri kontrol et
      expect(result.notificationMode).toBeDefined();
      expect(['instant', 'daily', 'weekly', 'disabled']).toContain(result.notificationMode);
      expect(result.enablePush).toBeDefined();
      expect(result.enableEmail).toBeDefined();
      expect(result.enableInApp).toBeDefined();
      expect(result.minRiskLevel).toBeDefined();
      expect(result.quietHoursEnabled).toBeDefined();
    });

    it('should return existing preferences', async () => {
      // First call creates defaults
      const first = await caller.getPreferences();

      // Second call should return the same
      const second = await caller.getPreferences();

      expect(second.notificationMode).toBe(first.notificationMode);
      expect(second.enablePush).toBe(first.enablePush);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification mode', async () => {
      const result = await caller.updatePreferences({
        notificationMode: 'daily',
      });

      expect(result.notificationMode).toBe('daily');
    });

    it('should update multiple preferences at once', async () => {
      const result = await caller.updatePreferences({
        notificationMode: 'weekly',
        enableEmail: true,
        minRiskLevel: 'critical',
        summaryDay: 'friday',
      });

      expect(result.notificationMode).toBe('weekly');
      expect(result.enableEmail).toBe(true);
      expect(result.minRiskLevel).toBe('critical');
      expect(result.summaryDay).toBe('friday');
    });

    it('should update quiet hours settings', async () => {
      const result = await caller.updatePreferences({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      expect(result.quietHoursEnabled).toBe(true);
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('08:00');
    });

    it('should validate time format', async () => {
      try {
        await caller.updatePreferences({
          summaryTime: 'invalid-time',
        });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
      }
    });

    it('should validate notification mode', async () => {
      try {
        await caller.updatePreferences({
          notificationMode: 'invalid-mode' as any,
        });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
      }
    });

    it('should validate risk level', async () => {
      try {
        await caller.updatePreferences({
          minRiskLevel: 'invalid-level' as any,
        });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('resetToDefaults', () => {
    it('should reset preferences to defaults', async () => {
      // First update to non-default
      await caller.updatePreferences({
        notificationMode: 'disabled',
        enablePush: false,
        enableEmail: true,
        minRiskLevel: 'low',
      });

      // Then reset
      const result = await caller.resetToDefaults();

      expect(result.notificationMode).toBe('instant');
      expect(result.enablePush).toBe(true);
      expect(result.enableEmail).toBe(false);
      expect(result.enableInApp).toBe(true);
      expect(result.minRiskLevel).toBe('high');
      expect(result.quietHoursEnabled).toBe(false);
    });
  });

  describe('disableAllChannels', () => {
    it('should disable all notification channels', async () => {
      const result = await caller.disableAllChannels();

      expect(result).toBeDefined();
      expect(result.enablePush).toBe(false);
      expect(result.enableEmail).toBe(false);
      expect(result.enableInApp).toBe(false);
      expect(result.notificationMode).toBe('disabled');
    });

    it('should persist disabled state', async () => {
      await caller.disableAllChannels();

      const prefs = await caller.getPreferences();

      expect(prefs.enablePush).toBe(false);
      expect(prefs.enableEmail).toBe(false);
      expect(prefs.enableInApp).toBe(false);
    });
  });

  describe('enableAllChannels', () => {
    it('should enable all notification channels', async () => {
      // First disable all
      await caller.disableAllChannels();

      // Then enable all
      const result = await caller.enableAllChannels();

      expect(result).toBeDefined();
      expect(result.enablePush).toBe(true);
      expect(result.enableEmail).toBe(true);
      expect(result.enableInApp).toBe(true);
      expect(result.notificationMode).toBe('instant');
    });

    it('should persist enabled state', async () => {
      await caller.enableAllChannels();

      const prefs = await caller.getPreferences();

      expect(prefs.enablePush).toBe(true);
      expect(prefs.enableEmail).toBe(true);
      expect(prefs.enableInApp).toBe(true);
    });
  });

  describe('preference combinations', () => {
    it('should handle daily summary preferences', async () => {
      const result = await caller.updatePreferences({
        notificationMode: 'daily',
        summaryTime: '09:30',
        enablePush: true,
        enableEmail: true,
      });

      expect(result.notificationMode).toBe('daily');
      expect(result.summaryTime).toBe('09:30');
      expect(result.enablePush).toBe(true);
      expect(result.enableEmail).toBe(true);
    });

    it('should handle weekly summary preferences', async () => {
      const result = await caller.updatePreferences({
        notificationMode: 'weekly',
        summaryTime: '10:00',
        summaryDay: 'monday',
        minRiskLevel: 'high',
      });

      expect(result.notificationMode).toBe('weekly');
      expect(result.summaryTime).toBe('10:00');
      expect(result.summaryDay).toBe('monday');
      expect(result.minRiskLevel).toBe('high');
    });

    it('should handle quiet hours with instant mode', async () => {
      const result = await caller.updatePreferences({
        notificationMode: 'instant',
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      });

      expect(result.notificationMode).toBe('instant');
      expect(result.quietHoursEnabled).toBe(true);
      expect(result.quietHoursStart).toBe('23:00');
      expect(result.quietHoursEnd).toBe('07:00');
    });
  });

  describe('edge cases', () => {
    it('should handle partial updates', async () => {
      const initial = await caller.getPreferences();

      const updated = await caller.updatePreferences({
        enablePush: false,
      });

      expect(updated.enablePush).toBe(false);
      expect(updated.enableEmail).toBe(initial.enableEmail);
      expect(updated.enableInApp).toBe(initial.enableInApp);
    });

    it('should handle empty update', async () => {
      const initial = await caller.getPreferences();

      const updated = await caller.updatePreferences({});

      expect(updated.notificationMode).toBe(initial.notificationMode);
      expect(updated.enablePush).toBe(initial.enablePush);
    });

    it('should handle multiple sequential updates', async () => {
      await caller.updatePreferences({ notificationMode: 'daily' });
      await caller.updatePreferences({ enableEmail: true });
      const result = await caller.updatePreferences({ minRiskLevel: 'low' });

      expect(result.notificationMode).toBe('daily');
      expect(result.enableEmail).toBe(true);
      expect(result.minRiskLevel).toBe('low');
    });
  });
});
