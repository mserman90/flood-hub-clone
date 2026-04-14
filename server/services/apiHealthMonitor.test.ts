import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRiskLevel,
  checkAPIHealth,
  getHealthReport,
  getStatusSummary,
  formatAPIStatus,
  resetMetrics,
  getMetrics,
} from './apiHealthMonitor';

describe('apiHealthMonitor', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('API Health Checks', () => {
    it('should return a health report', async () => {
      const report = await getHealthReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.overallStatus).toMatch(/healthy|degraded|down/);
      expect(report.apis).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
    });

    it('should have valid summary counts', async () => {
      const report = await getHealthReport();

      const { summary } = report;
      expect(summary.totalAPIs).toBeGreaterThan(0);
      expect(summary.healthyAPIs + summary.degradedAPIs + summary.downAPIs).toBe(summary.totalAPIs);
    });

    it('should include all required API endpoints', async () => {
      const report = await getHealthReport();

      const apiIds = report.apis.map((api) => api.apiId);
      expect(apiIds).toContain('open-meteo-weather');
      expect(apiIds).toContain('open-meteo-flood');
      expect(apiIds).toContain('usgs-water');
    });

    it('should have valid API status structure', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        expect(api.name).toBeDefined();
        expect(api.apiId).toBeDefined();
        expect(api.status).toMatch(/healthy|degraded|down|unknown/);
        expect(api.responseTime).toBeGreaterThanOrEqual(0);
        expect(api.lastChecked).toBeInstanceOf(Date);
        expect(api.uptime).toBeGreaterThanOrEqual(0);
        expect(api.uptime).toBeLessThanOrEqual(100);
      });
    });

    it('should include rate limit information', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        if (api.rateLimit) {
          expect(api.rateLimit.remaining).toBeGreaterThanOrEqual(0);
          expect(api.rateLimit.limit).toBeGreaterThan(0);
          expect(api.rateLimit.percentageUsed).toBeGreaterThanOrEqual(0);
          expect(api.rateLimit.percentageUsed).toBeLessThanOrEqual(100);
        }
      });
    });
  });

  describe('Status Summary', () => {
    it('should generate a valid status summary', async () => {
      const report = await getHealthReport();
      const summary = getStatusSummary(report);

      expect(summary).toBeDefined();
      expect(summary).toContain('Overall Status');
      expect(summary).toContain('Healthy APIs');
      expect(summary).toContain('Degraded APIs');
      expect(summary).toContain('Down APIs');
    });

    it('should format API status correctly', async () => {
      const report = await getHealthReport();
      const api = report.apis[0];

      if (api) {
        const formatted = formatAPIStatus(api);

        expect(formatted).toContain(api.name);
        expect(formatted).toContain(api.status);
        expect(formatted).toContain('Response Time');
        expect(formatted).toContain('Uptime');
      }
    });
  });

  describe('Metrics Tracking', () => {
    it('should track metrics for each API', async () => {
      await getHealthReport();

      const metrics1 = getMetrics('open-meteo-weather');
      const metrics2 = getMetrics('open-meteo-flood');
      const metrics3 = getMetrics('usgs-water');

      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
      expect(metrics3).toBeDefined();

      expect(metrics1?.totalRequests).toBeGreaterThan(0);
      expect(metrics2?.totalRequests).toBeGreaterThan(0);
      expect(metrics3?.totalRequests).toBeGreaterThan(0);
    });

    it('should track successful and failed requests', async () => {
      await getHealthReport();

      const metrics = getMetrics('open-meteo-weather');

      if (metrics) {
        expect(metrics.successfulRequests + metrics.failedRequests).toBe(metrics.totalRequests);
        expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
        expect(metrics.failedRequests).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track response times', async () => {
      await getHealthReport();

      const metrics = getMetrics('open-meteo-weather');

      if (metrics) {
        expect(metrics.lastResponseTime).toBeGreaterThanOrEqual(0);
        expect(metrics.totalResponseTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should reset metrics correctly', () => {
      resetMetrics();

      const metrics1 = getMetrics('open-meteo-weather');
      const metrics2 = getMetrics('open-meteo-flood');
      const metrics3 = getMetrics('usgs-water');

      expect(metrics1).toBeUndefined();
      expect(metrics2).toBeUndefined();
      expect(metrics3).toBeUndefined();
    });
  });

  describe('Overall Status Determination', () => {
    it('should determine overall status correctly', async () => {
      const report = await getHealthReport();

      if (report.summary.downAPIs > 0) {
        expect(report.overallStatus).toBe('down');
      } else if (report.summary.degradedAPIs > 0) {
        expect(report.overallStatus).toBe('degraded');
      } else {
        expect(report.overallStatus).toBe('healthy');
      }
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent timestamps', async () => {
      const report = await getHealthReport();
      const now = Date.now();

      report.apis.forEach((api) => {
        const checkTime = api.lastChecked.getTime();
        expect(checkTime).toBeLessThanOrEqual(now);
        expect(now - checkTime).toBeLessThan(10000); // Within 10 seconds
      });
    });

    it('should have consistent uptime calculations', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        expect(api.uptime).toBeGreaterThanOrEqual(0);
        expect(api.uptime).toBeLessThanOrEqual(100);
      });
    });

    it('should have valid response times', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        expect(api.responseTime).toBeGreaterThanOrEqual(0);
        expect(api.responseTime).toBeLessThan(30000); // Less than 30 seconds
      });
    });
  });

  describe('Rate Limit Calculations', () => {
    it('should calculate percentage used correctly', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        if (api.rateLimit) {
          const calculated = ((api.rateLimit.limit - api.rateLimit.remaining) / api.rateLimit.limit) * 100;
          expect(Math.abs(calculated - api.rateLimit.percentageUsed)).toBeLessThan(0.1);
        }
      });
    });

    it('should not exceed rate limits', async () => {
      const report = await getHealthReport();

      report.apis.forEach((api) => {
        if (api.rateLimit) {
          expect(api.rateLimit.remaining).toBeGreaterThanOrEqual(0);
          expect(api.rateLimit.remaining).toBeLessThanOrEqual(api.rateLimit.limit);
        }
      });
    });
  });
});
