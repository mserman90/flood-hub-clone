/**
 * apiHealth.ts
 * API sağlık durumu ve limit bilgilerini sağlayan tRPC router
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getHealthReport, formatAPIStatus } from '../services/apiHealthMonitor';

export const apiHealthRouter = router({
  /**
   * Tüm API'lerin sağlık durumunu al
   */
  getHealthReport: publicProcedure.query(async () => {
    try {
      const report = await getHealthReport();

      return {
        success: true,
        data: {
          timestamp: report.timestamp,
          overallStatus: report.overallStatus,
          summary: report.summary,
          apis: report.apis.map((api) => ({
            name: api.name,
            apiId: api.apiId,
            status: api.status,
            responseTime: api.responseTime,
            lastChecked: api.lastChecked,
            rateLimit: api.rateLimit
              ? {
                  remaining: api.rateLimit.remaining,
                  limit: api.rateLimit.limit,
                  percentageUsed: api.rateLimit.percentageUsed,
                  resetTime: api.rateLimit.resetTime,
                }
              : null,
            errorMessage: api.errorMessage,
            uptime: api.uptime,
          })),
        },
      };
    } catch (error) {
      console.error('[API-HEALTH] Error getting health report:', error);
      return {
        success: false,
        error: 'Failed to get API health report',
      };
    }
  }),

  /**
   * Belirli bir API'nin durumunu al
   */
  getAPIStatus: publicProcedure
    .input(
      z.object({
        apiId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const report = await getHealthReport();
        const api = report.apis.find((a) => a.apiId === input.apiId);

        if (!api) {
          return {
            success: false,
            error: `API ${input.apiId} not found`,
          };
        }

        return {
          success: true,
          data: {
            name: api.name,
            apiId: api.apiId,
            status: api.status,
            responseTime: api.responseTime,
            lastChecked: api.lastChecked,
            rateLimit: api.rateLimit
              ? {
                  remaining: api.rateLimit.remaining,
                  limit: api.rateLimit.limit,
                  percentageUsed: api.rateLimit.percentageUsed,
                  resetTime: api.rateLimit.resetTime,
                }
              : null,
            errorMessage: api.errorMessage,
            uptime: api.uptime,
            details: formatAPIStatus(api),
          },
        };
      } catch (error) {
        console.error('[API-HEALTH] Error getting API status:', error);
        return {
          success: false,
          error: 'Failed to get API status',
        };
      }
    }),

  /**
   * Sağlık durumu özeti al
   */
  getHealthSummary: publicProcedure.query(async () => {
    try {
      const report = await getHealthReport();

      const statusMessages = {
        healthy: 'Tum APIler calisiyordu',
        degraded: 'Bazi APIler yavaslaniyor',
        down: 'Bazi APIler calismiyordu',
      };

      return {
        success: true,
        data: {
          overallStatus: report.overallStatus,
          message: statusMessages[report.overallStatus],
          summary: {
            total: report.summary.totalAPIs,
            healthy: report.summary.healthyAPIs,
            degraded: report.summary.degradedAPIs,
            down: report.summary.downAPIs,
          },
          timestamp: report.timestamp,
        },
      };
    } catch (error) {
      console.error('[API-HEALTH] Error getting health summary:', error);
      return {
        success: false,
        error: 'Failed to get health summary',
      };
    }
  }),
});
