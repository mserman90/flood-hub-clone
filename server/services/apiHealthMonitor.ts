/**
 * apiHealthMonitor.ts
 * Flood Hub tarafından kullanılan API'lerin sağlık durumu ve limit bilgilerini izler
 * Open-Meteo, USGS, Google Flood API'nin durumunu takip eder
 */

import axios from 'axios';

// ============================================================================
// Tip Tanımları
// ============================================================================

export interface APIStatus {
  name: string;
  apiId: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime: number; // ms
  lastChecked: Date;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTime?: Date;
    percentageUsed: number;
  };
  errorMessage?: string;
  uptime: number; // percentage
}

export interface APIHealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'down';
  apis: APIStatus[];
  summary: {
    totalAPIs: number;
    healthyAPIs: number;
    degradedAPIs: number;
    downAPIs: number;
  };
}

// ============================================================================
// Konfigürasyon
// ============================================================================

const API_ENDPOINTS = {
  OPEN_METEO_WEATHER: {
    name: 'Open-Meteo Weather',
    id: 'open-meteo-weather',
    url: 'https://api.open-meteo.com/v1/weather?latitude=52.52&longitude=13.41&hourly=temperature_2m',
    timeout: 5000,
    rateLimit: {
      limit: 10000, // requests per day
      window: 'daily',
    },
  },
  OPEN_METEO_FLOOD: {
    name: 'Open-Meteo Flood',
    id: 'open-meteo-flood',
    url: 'https://flood-api.open-meteo.com/v1/flood?latitude=52.52&longitude=13.41&hourly=discharge',
    timeout: 5000,
    rateLimit: {
      limit: 10000, // requests per day
      window: 'daily',
    },
  },
  USGS_WATER: {
    name: 'USGS Water Data',
    id: 'usgs-water',
    url: 'https://waterservices.usgs.gov/nwis/iv?format=json&sites=01646500&parameterCd=00060',
    timeout: 8000,
    rateLimit: {
      limit: 1000, // requests per day
      window: 'daily',
    },
  },
};

// ============================================================================
// In-Memory Tracking
// ============================================================================

interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  lastResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastSuccessTime?: Date;
  requestsToday: number;
  lastResetTime: Date;
}

const metricsStore = new Map<string, APIMetrics>();

function initializeMetrics(apiId: string): APIMetrics {
  if (!metricsStore.has(apiId)) {
    metricsStore.set(apiId, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      lastResponseTime: 0,
      requestsToday: 0,
      lastResetTime: new Date(),
    });
  }
  return metricsStore.get(apiId)!;
}

function recordRequest(apiId: string, success: boolean, responseTime: number, error?: string) {
  const metrics = initializeMetrics(apiId);

  metrics.totalRequests++;
  metrics.lastResponseTime = responseTime;
  metrics.totalResponseTime += responseTime;

  if (success) {
    metrics.successfulRequests++;
    metrics.lastSuccessTime = new Date();
  } else {
    metrics.failedRequests++;
    metrics.lastError = error;
    metrics.lastErrorTime = new Date();
  }

  // Günlük request sayacını sıfırla (gece yarısında)
  const now = new Date();
  const lastReset = metrics.lastResetTime;
  if (
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    metrics.requestsToday = 0;
    metrics.lastResetTime = new Date();
  }

  metrics.requestsToday++;
}

// ============================================================================
// API Sağlık Kontrolü
// ============================================================================

/**
 * Tek bir API'nin sağlık durumunu kontrol et
 */
export async function checkAPIHealth(apiConfig: (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]): Promise<APIStatus> {
  const metrics = initializeMetrics(apiConfig.id);
  const startTime = Date.now();

  try {
    const response = await axios.get(apiConfig.url, {
      timeout: apiConfig.timeout,
      validateStatus: () => true, // Tüm status kodlarını kabul et
    });

    const responseTime = Date.now() - startTime;
    const isSuccess = response.status >= 200 && response.status < 300;

    recordRequest(apiConfig.id, isSuccess, responseTime);

    // Rate limit bilgisini header'lardan çıkar
    const rateLimitRemaining = response.headers['x-ratelimit-remaining-requests'] ||
      response.headers['x-ratelimit-remaining'] || null;
    const rateLimitLimit = response.headers['x-ratelimit-limit-requests'] ||
      response.headers['x-ratelimit-limit'] || null;

    const rateLimit = rateLimitRemaining && rateLimitLimit
      ? {
          remaining: parseInt(rateLimitRemaining as string, 10),
          limit: parseInt(rateLimitLimit as string, 10),
          percentageUsed: ((parseInt(rateLimitLimit as string, 10) - parseInt(rateLimitRemaining as string, 10)) /
            parseInt(rateLimitLimit as string, 10)) *
            100,
        }
      : {
          remaining: apiConfig.rateLimit.limit - metrics.requestsToday,
          limit: apiConfig.rateLimit.limit,
          percentageUsed: (metrics.requestsToday / apiConfig.rateLimit.limit) * 100,
        };

    const status: APIStatus = {
      name: apiConfig.name,
      apiId: apiConfig.id,
      status: isSuccess ? 'healthy' : 'degraded',
      responseTime,
      lastChecked: new Date(),
      rateLimit,
      uptime: (metrics.successfulRequests / Math.max(metrics.totalRequests, 1)) * 100,
    };

    if (!isSuccess) {
      status.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    return status;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    recordRequest(apiConfig.id, false, responseTime, errorMessage);

    return {
      name: apiConfig.name,
      apiId: apiConfig.id,
      status: responseTime > apiConfig.timeout ? 'down' : 'degraded',
      responseTime,
      lastChecked: new Date(),
      errorMessage,
      rateLimit: {
        remaining: Math.max(0, apiConfig.rateLimit.limit - metrics.requestsToday),
        limit: apiConfig.rateLimit.limit,
        percentageUsed: (metrics.requestsToday / apiConfig.rateLimit.limit) * 100,
      },
      uptime: (metrics.successfulRequests / Math.max(metrics.totalRequests, 1)) * 100,
    };
  }
}

// ============================================================================
// Toplu Sağlık Raporu
// ============================================================================

/**
 * Tüm API'lerin sağlık durumunu kontrol et
 */
export async function getHealthReport(): Promise<APIHealthReport> {
  const apiStatuses = await Promise.all(
    Object.values(API_ENDPOINTS).map((config) => checkAPIHealth(config))
  );

  const summary = {
    totalAPIs: apiStatuses.length,
    healthyAPIs: apiStatuses.filter((s) => s.status === 'healthy').length,
    degradedAPIs: apiStatuses.filter((s) => s.status === 'degraded').length,
    downAPIs: apiStatuses.filter((s) => s.status === 'down').length,
  };

  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  if (summary.downAPIs > 0) {
    overallStatus = 'down';
  } else if (summary.degradedAPIs > 0) {
    overallStatus = 'degraded';
  }

  return {
    timestamp: new Date(),
    overallStatus,
    apis: apiStatuses,
    summary,
  };
}

// ============================================================================
// Durum Özeti
// ============================================================================

/**
 * Insan tarafından okunabilir durum özeti oluştur
 */
export function getStatusSummary(report: APIHealthReport): string {
  const { summary, overallStatus } = report;

  const statusEmoji = {
    healthy: '✓',
    degraded: '⚠',
    down: '✗',
  };

  const lines = [
    `Overall Status: ${statusEmoji[overallStatus]} ${overallStatus.toUpperCase()}`,
    `Healthy APIs: ${summary.healthyAPIs}/${summary.totalAPIs}`,
    `Degraded APIs: ${summary.degradedAPIs}`,
    `Down APIs: ${summary.downAPIs}`,
  ];

  return lines.join('\n');
}

/**
 * API detay bilgisini formatla
 */
export function formatAPIStatus(api: APIStatus): string {
  const statusEmoji = {
    healthy: '✓',
    degraded: '⚠',
    down: '✗',
    unknown: '?',
  };

  const lines = [
    `${statusEmoji[api.status]} ${api.name} (${api.apiId})`,
    `Status: ${api.status}`,
    `Response Time: ${api.responseTime}ms`,
    `Uptime: ${api.uptime.toFixed(1)}%`,
  ];

  if (api.rateLimit) {
    lines.push(
      `Rate Limit: ${api.rateLimit.remaining}/${api.rateLimit.limit} (${api.rateLimit.percentageUsed.toFixed(1)}% used)`
    );
  }

  if (api.errorMessage) {
    lines.push(`Error: ${api.errorMessage}`);
  }

  lines.push(`Last Checked: ${api.lastChecked.toLocaleString()}`);

  return lines.join('\n');
}

// ============================================================================
// Metrikleri Sıfırla
// ============================================================================

/**
 * Tüm metrikleri sıfırla (test için)
 */
export function resetMetrics(): void {
  metricsStore.clear();
}

/**
 * Belirli bir API'nin metriklerini sıfırla
 */
export function resetAPIMetrics(apiId: string): void {
  metricsStore.delete(apiId);
}

/**
 * Metrikleri al (debug için)
 */
export function getMetrics(apiId: string): APIMetrics | undefined {
  return metricsStore.get(apiId);
}
