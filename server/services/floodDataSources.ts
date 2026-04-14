/**
 * floodDataSources.ts
 * Flood Hub için çoklu veri kaynağı entegrasyonu
 * Fallback stratejisi: Open-Meteo Weather → Open-Meteo Flood → USGS → Mock
 */

import axios from 'axios';

// ============================================================================
// Tip Tanımları
// ============================================================================

export interface NormalizedFloodData {
  regionId: string;
  regionName: string;
  latitude: number;
  longitude: number;
  currentWaterLevel: number;
  forecastedWaterLevel?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: 'open-meteo-weather' | 'open-meteo-flood' | 'usgs' | 'mock';
  confidence: number; // 0-1
  forecastHours: number;
  metadata?: Record<string, any>;
}

interface TimeSeriesData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

// ============================================================================
// Konfigürasyon
// ============================================================================

const API_CONFIG = {
  OPEN_METEO_WEATHER: 'https://api.open-meteo.com/v1/weather',
  OPEN_METEO_FLOOD: 'https://flood-api.open-meteo.com/v1/flood',
  USGS_WATER: 'https://waterservices.usgs.gov/nwis/iv',
  USGS_RTFI: 'https://api.waterdata.usgs.gov/rtfi/v1',
  TIMEOUT: 8000, // 8 saniye
  RETRY_COUNT: 2,
};

// ============================================================================
// Yardımcı Fonksiyonlar
// ============================================================================

/**
 * Risk seviyesini su seviyesine göre belirle
 */
export function calculateRiskLevel(
  waterLevel: number,
  baselineLevel: number = 2.0,
  criticalThreshold: number = 3.5
): 'low' | 'medium' | 'high' | 'critical' {
  const ratio = waterLevel / baselineLevel;

  if (ratio < 1.0) return 'low';
  if (ratio < 1.3) return 'medium';
  if (ratio < 1.6) return 'high';
  return 'critical';
}

/**
 * Retry mekanizması
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = API_CONFIG.RETRY_COUNT,
  backoffMs: number = 1000
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: API_CONFIG.TIMEOUT,
      });
      return response.data;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// ============================================================================
// Open-Meteo Weather API (Birincil)
// ============================================================================

/**
 * Open-Meteo Weather API'den veri çek
 */
export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string
): Promise<NormalizedFloodData | null> {
  try {
    const url = new URL(API_CONFIG.OPEN_METEO_WEATHER);
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('hourly', 'precipitation,relative_humidity_2m');
    url.searchParams.append('forecast_days', '7');
    url.searchParams.append('timezone', 'UTC');

    const data = await fetchWithRetry(url.toString());

    // Yağış verisi kullanarak su seviyesi tahmini yap
    const hourlyData = data.hourly || {};
    const precipitation = hourlyData.precipitation || [];
    const avgPrecipitation = precipitation.slice(0, 24).reduce((a: number, b: number) => a + b, 0) / 24;

    // Yağış → su seviyesi dönüşümü (basit model)
    const baselineLevel = 2.0;
    const currentWaterLevel = baselineLevel + avgPrecipitation * 0.5;
    const forecastedWaterLevel = currentWaterLevel + (avgPrecipitation * 0.3);

    return {
      regionId,
      regionName,
      latitude,
      longitude,
      currentWaterLevel: parseFloat(currentWaterLevel.toFixed(2)),
      forecastedWaterLevel: parseFloat(forecastedWaterLevel.toFixed(2)),
      riskLevel: calculateRiskLevel(currentWaterLevel),
      timestamp: new Date(),
      source: 'open-meteo-weather',
      confidence: 0.7,
      forecastHours: 24,
      metadata: {
        precipitation: avgPrecipitation,
        model: 'weather-based-estimation',
      },
    };
  } catch (error) {
    console.error('[FLOOD-DATA] Open-Meteo Weather API hatası:', error);
    return null;
  }
}

// ============================================================================
// Open-Meteo Flood API (Yedek 1)
// ============================================================================

/**
 * Open-Meteo Flood API'den veri çek
 */
export async function fetchOpenMeteoFlood(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string
): Promise<NormalizedFloodData | null> {
  try {
    const url = new URL(API_CONFIG.OPEN_METEO_FLOOD);
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('hourly', 'discharge');
    url.searchParams.append('forecast_days', '7');
    url.searchParams.append('timezone', 'UTC');

    const data = await fetchWithRetry(url.toString());

    const hourlyData = data.hourly || {};
    const discharge = hourlyData.discharge || [];

    if (discharge.length === 0) {
      return null;
    }

    // Debi → su seviyesi dönüşümü (basit model)
    const currentDischarge = discharge[0];
    const avgDischarge = discharge.slice(0, 24).reduce((a: number, b: number) => a + b, 0) / 24;

    // Debi (m³/s) → su seviyesi (m) dönüşümü
    // Basit model: seviye = 1.5 + (debi / 100) * 0.5
    const baselineLevel = 1.5;
    const currentWaterLevel = baselineLevel + (currentDischarge / 100) * 0.5;
    const forecastedWaterLevel = baselineLevel + (avgDischarge / 100) * 0.5;

    return {
      regionId,
      regionName,
      latitude,
      longitude,
      currentWaterLevel: parseFloat(currentWaterLevel.toFixed(2)),
      forecastedWaterLevel: parseFloat(forecastedWaterLevel.toFixed(2)),
      riskLevel: calculateRiskLevel(currentWaterLevel),
      timestamp: new Date(),
      source: 'open-meteo-flood',
      confidence: 0.85,
      forecastHours: 24,
      metadata: {
        discharge: currentDischarge,
        avgDischarge,
        model: 'discharge-based',
      },
    };
  } catch (error) {
    console.error('[FLOOD-DATA] Open-Meteo Flood API hatası:', error);
    return null;
  }
}

// ============================================================================
// USGS Water Data API (Yedek 2)
// ============================================================================

/**
 * USGS Water Data API'den veri çek (ABD için)
 */
export async function fetchUSGSWaterData(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string
): Promise<NormalizedFloodData | null> {
  try {
    // USGS IV (Instantaneous Values) endpoint
    const url = new URL(API_CONFIG.USGS_WATER);
    url.searchParams.append('format', 'json');
    url.searchParams.append('parameterCd', '00060'); // Discharge
    url.searchParams.append('siteType', 'ST'); // Stream
    url.searchParams.append('hasDataTypeCd', 'iv'); // Instantaneous
    // Koordinat bazlı arama (bounding box)
    url.searchParams.append('bBox', `${longitude - 0.5},${latitude - 0.5},${longitude + 0.5},${latitude + 0.5}`);

    const data = await fetchWithRetry(url.toString());

    const timeSeries = data.value?.timeSeries || [];
    if (timeSeries.length === 0) {
      return null;
    }

    // İlk site'ın verilerini al
    const firstSite = timeSeries[0];
    const values = firstSite.values?.[0]?.value || [];

    if (values.length === 0) {
      return null;
    }

    // En son değeri al
    const latestValue = values[values.length - 1];
    const discharge = parseFloat(latestValue.value);

    // Debi → su seviyesi dönüşümü
    const baselineLevel = 1.5;
    const currentWaterLevel = baselineLevel + (discharge / 100) * 0.5;

    return {
      regionId,
      regionName,
      latitude,
      longitude,
      currentWaterLevel: parseFloat(currentWaterLevel.toFixed(2)),
      riskLevel: calculateRiskLevel(currentWaterLevel),
      timestamp: new Date(latestValue.dateTime),
      source: 'usgs',
      confidence: 0.9,
      forecastHours: 0, // USGS gerçek zamanlı veri sağlar
      metadata: {
        discharge,
        siteName: firstSite.sourceInfo?.siteName,
        model: 'usgs-realtime',
      },
    };
  } catch (error) {
    console.error('[FLOOD-DATA] USGS Water Data API hatası:', error);
    return null;
  }
}

// ============================================================================
// Mock Veri (Yedek 3)
// ============================================================================

/**
 * Mock flood verisi oluştur
 */
export function getMockFloodData(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string
): NormalizedFloodData {
  // Koordinatlara göre deterministik mock veri
  const seed = Math.abs(latitude + longitude);
  const baseLevel = 2.0 + (seed % 1) * 0.5;
  const variance = Math.sin(Date.now() / 10000) * 0.3;

  return {
    regionId,
    regionName,
    latitude,
    longitude,
    currentWaterLevel: parseFloat((baseLevel + variance).toFixed(2)),
    forecastedWaterLevel: parseFloat((baseLevel + variance + 0.2).toFixed(2)),
    riskLevel: calculateRiskLevel(baseLevel + variance),
    timestamp: new Date(),
    source: 'mock',
    confidence: 0.5,
    forecastHours: 24,
    metadata: {
      note: 'Mock data - all sources failed',
    },
  };
}

// ============================================================================
// Ana Fallback Mekanizması
// ============================================================================

/**
 * Fallback stratejisi ile flood verisi çek
 * Sıra: Open-Meteo Weather → Open-Meteo Flood → USGS → Mock
 */
export async function getFloodDataWithFallback(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string
): Promise<NormalizedFloodData> {
  console.log(`[FLOOD-DATA] Fetching data for ${regionName} (${latitude}, ${longitude})`);

  // Yedek 1: Open-Meteo Weather
  try {
    const result = await fetchOpenMeteoWeather(latitude, longitude, regionName, regionId);
    if (result) {
      console.log(`[FLOOD-DATA] Open-Meteo Weather basarili`);
      return result;
    }
  } catch (error) {
    console.warn('[FLOOD-DATA] Open-Meteo Weather basarisiz, yedek 1e geciliyor...');
  }

  // Yedek 2: Open-Meteo Flood
  try {
    const result = await fetchOpenMeteoFlood(latitude, longitude, regionName, regionId);
    if (result) {
      console.log(`[FLOOD-DATA] Open-Meteo Flood basarili`);
      return result;
    }
  } catch (error) {
    console.warn('[FLOOD-DATA] Open-Meteo Flood basarisiz, yedek 2ye geciliyor...');
  }

  // Yedek 3: USGS (ABD için)
  try {
    const result = await fetchUSGSWaterData(latitude, longitude, regionName, regionId);
    if (result) {
      console.log(`[FLOOD-DATA] USGS Water Data basarili`);
      return result;
    }
  } catch (error) {
    console.warn('[FLOOD-DATA] USGS Water Data basarisiz, mock veriye geciliyor...');
  }

  // Yedek 4: Mock
  console.warn(`[FLOOD-DATA] Tum APIler basarisiz, mock veri kullaniliyor`);
  return getMockFloodData(latitude, longitude, regionName, regionId);
}

// ============================================================================
// Zaman Serisi Verisi
// ============================================================================

/**
 * Zaman serisi flood verisi çek
 */
export async function getFloodTimeSeriesWithFallback(
  latitude: number,
  longitude: number,
  regionName: string,
  regionId: string,
  hours: number = 24
): Promise<TimeSeriesData[]> {
  try {
    const url = new URL(API_CONFIG.OPEN_METEO_FLOOD);
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('hourly', 'discharge');
    url.searchParams.append('forecast_days', Math.ceil(hours / 24).toString());
    url.searchParams.append('timezone', 'UTC');

    const data = await fetchWithRetry(url.toString());

    const hourlyData = data.hourly || {};
    const times = hourlyData.time || [];
    const discharge = hourlyData.discharge || [];

    return times.slice(0, hours).map((time: string, index: number) => ({
      timestamp: time,
      waterLevel: 1.5 + (discharge[index] / 100) * 0.5,
    }));
  } catch (error) {
    console.error('[FLOOD-DATA] Zaman serisi verisi başarısız:', error);
    // Mock zaman serisi
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(Date.now() - (hours - i) * 60 * 60 * 1000).toISOString(),
      waterLevel: 2.0 + Math.sin(i / 4) * 0.5,
    }));
  }
}
