/**
 * preferences.ts - tRPC Router
 * Kullanici bildirim tercihlerini yoneten backend router.
 * Tercihler: bildirim modu, kanallar, sessiz saatler, risk seviyeleri, vb.
 */

import { protectedProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { notificationPreferences } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

type NotificationMode = 'instant' | 'daily' | 'weekly' | 'disabled';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type SummaryDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const preferencesRouter = router({
  /**
   * Kullanicinin bildirim tercihlerini getir
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    if (result.length === 0) {
      // Varsayilan tercihler olustur
      const defaultPrefs = {
        userId: ctx.user.id,
        notificationMode: 'instant' as NotificationMode,
        enablePush: true,
        enableEmail: false,
        enableInApp: true,
        summaryTime: '09:00',
        summaryDay: 'monday' as SummaryDay,
        minRiskLevel: 'high' as RiskLevel,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      await db.insert(notificationPreferences).values(defaultPrefs);
      return defaultPrefs;
    }

    return result[0];
  }),

  /**
   * Bildirim tercihlerini guncelle
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        notificationMode: z.enum(['instant', 'daily', 'weekly', 'disabled']).optional(),
        enablePush: z.boolean().optional(),
        enableEmail: z.boolean().optional(),
        enableInApp: z.boolean().optional(),
        summaryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm format
        summaryDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
        minRiskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm format
        quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm format
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Guncellenecek alanlari belirle
      const updateData: Record<string, any> = {};

      if (input.notificationMode !== undefined) updateData.notificationMode = input.notificationMode;
      if (input.enablePush !== undefined) updateData.enablePush = input.enablePush;
      if (input.enableEmail !== undefined) updateData.enableEmail = input.enableEmail;
      if (input.enableInApp !== undefined) updateData.enableInApp = input.enableInApp;
      if (input.summaryTime !== undefined) updateData.summaryTime = input.summaryTime;
      if (input.summaryDay !== undefined) updateData.summaryDay = input.summaryDay;
      if (input.minRiskLevel !== undefined) updateData.minRiskLevel = input.minRiskLevel;
      if (input.quietHoursEnabled !== undefined) updateData.quietHoursEnabled = input.quietHoursEnabled;
      if (input.quietHoursStart !== undefined) updateData.quietHoursStart = input.quietHoursStart;
      if (input.quietHoursEnd !== undefined) updateData.quietHoursEnd = input.quietHoursEnd;

      // Bos update ise mevcut tercihler dondur
      if (Object.keys(updateData).length === 0) {
        const existing = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, ctx.user.id))
          .limit(1);
        return existing[0] || null;
      }

      // Onceki tercihler varsa guncelle, yoksa olustur
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        // Yeni tercihler olustur
        const newPrefs = {
          userId: ctx.user.id,
          ...updateData,
        };
        await db.insert(notificationPreferences).values(newPrefs);
        return newPrefs;
      } else {
        // Mevcut tercihler guncelle
        await db
          .update(notificationPreferences)
          .set(updateData)
          .where(eq(notificationPreferences.userId, ctx.user.id));

        const updated = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, ctx.user.id))
          .limit(1);

        return updated[0];
      }
    }),

  /**
   * Varsayilan tercihlerine geri don
   */
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const defaultPrefs = {
      notificationMode: 'instant' as NotificationMode,
      enablePush: true,
      enableEmail: false,
      enableInApp: true,
      summaryTime: '09:00',
      summaryDay: 'monday' as SummaryDay,
      minRiskLevel: 'high' as RiskLevel,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };

    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(notificationPreferences).values({
        userId: ctx.user.id,
        ...defaultPrefs,
      });
    } else {
      await db
        .update(notificationPreferences)
        .set(defaultPrefs)
        .where(eq(notificationPreferences.userId, ctx.user.id));
    }

    return defaultPrefs;
  }),

  /**
   * Tum kanallar devre disi birak (hizli kapatma)
   */
  disableAllChannels: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    await db
      .update(notificationPreferences)
      .set({
        enablePush: false,
        enableEmail: false,
        enableInApp: false,
        notificationMode: 'disabled' as NotificationMode,
      })
      .where(eq(notificationPreferences.userId, ctx.user.id));

    const updated = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    return updated[0] || null;
  }),

  /**
   * Tum kanallar aktif et (hizli acma)
   */
  enableAllChannels: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    await db
      .update(notificationPreferences)
      .set({
        enablePush: true,
        enableEmail: true,
        enableInApp: true,
        notificationMode: 'instant' as NotificationMode,
      })
      .where(eq(notificationPreferences.userId, ctx.user.id));

    const updated = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    return updated[0] || null;
  }),
});
