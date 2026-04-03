import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

interface FloodData {
  location: string;
  latitude: number;
  longitude: number;
  currentWaterLevel: number;
  forecastedWaterLevel: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  waterLevelHistory: WaterLevelData[];
  lastUpdated: Date;
  source: 'open-meteo' | 'mock';
  discharge?: {
    current: number;
    forecast: number;
    unit: string;
  };
}

// ---------------------------------------------------------------------------
// Open-Meteo Flood API — direct client-side fetch
// Used when tRPC backend is unavailable (e.g., GitHub Pages deployment)
// ---------------------------------------------------------------------------

interface OpenMeteoFloodResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    river_discharge_mean: (number | null)[];
    river_discharge_max: (number | null)[];
    river_discharge_min?: (number | null)[];
  };
}

function dischargeToWaterLevel(discharge: number): number {
  if (discharge <= 0) return 0.3;
  const k = 0.45;
  return parseFloat(Math.max(0.3, k * Math.pow(discharge, 0.4)).toFixed(2));
}

function getRiskLevel(discharge: number): 'low' | 'medium' | 'high' | 'critical' {
  if (discharge < 50) return 'low';
  if (discharge < 150) return 'medium';
  if (discharge < 400) return 'high';
  return 'critical';
}

async function fetchFloodDataDirect(): Promise<FloodData> {
  const latitude = 39.93;
  const longitude = 32.86;

  const url =
    `https://flood-api.open-meteo.com/v1/flood` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&daily=river_discharge_mean,river_discharge_max,river_discharge_min` +
    `&past_days=1&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const apiData: OpenMeteoFloodResponse = await response.json();
  const today = new Date().toISOString().slice(0, 10);

  const history: WaterLevelData[] = [];
  let currentDischarge = 0;
  let forecastDischarge = 0;
  let foundToday = false;

  for (let i = 0; i < apiData.daily.time.length; i++) {
    const date = apiData.daily.time[i];
    const meanDischarge = apiData.daily.river_discharge_mean[i] ?? 0;
    const maxDischarge = apiData.daily.river_discharge_max[i] ?? 0;
    const isForecast = date > today;

    const d = new Date(date + 'T00:00:00');
    const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    history.push({
      timestamp: label,
      waterLevel: dischargeToWaterLevel(meanDischarge),
      forecast: isForecast ? dischargeToWaterLevel(maxDischarge) : undefined,
    });

    if (date === today) {
      currentDischarge = meanDischarge;
      forecastDischarge = maxDischarge;
      foundToday = true;
    }
  }

  if (!foundToday && apiData.daily.time.length > 0) {
    const idx = Math.min(1, apiData.daily.time.length - 1);
    currentDischarge = apiData.daily.river_discharge_mean[idx] ?? 0;
    forecastDischarge = apiData.daily.river_discharge_max[idx] ?? 0;
  }

  return {
    location: 'Ankara',
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    currentWaterLevel: dischargeToWaterLevel(currentDischarge),
    forecastedWaterLevel: dischargeToWaterLevel(forecastDischarge),
    riskLevel: getRiskLevel(currentDischarge),
    waterLevelHistory: history,
    lastUpdated: new Date(),
    source: 'open-meteo',
    discharge: {
      current: parseFloat(currentDischarge.toFixed(2)),
      forecast: parseFloat(forecastDischarge.toFixed(2)),
      unit: 'm³/s',
    },
  };
}

/**
 * Hook that fetches flood data.
 * 1. Tries the tRPC backend first (works when server is running).
 * 2. Falls back to direct Open-Meteo API call (works on GitHub Pages).
 */
export function useFloodData() {
  // Try tRPC backend
  const trpcQuery = trpc.flood.getAnkaraFloodData.useQuery(undefined, {
    retry: false,
    // Short staleTime so we don't cache errors for too long
    staleTime: 5 * 60 * 1000,
  });

  // Direct API fallback — only enabled when tRPC fails
  const directQuery = useQuery({
    queryKey: ['flood-data-direct', 'ankara'],
    queryFn: fetchFloodDataDirect,
    enabled: !!trpcQuery.error,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // If tRPC succeeded, use it
  if (trpcQuery.data?.data) {
    return {
      data: trpcQuery.data.data as FloodData,
      isLoading: false,
      error: null,
      source: (trpcQuery.data.data.source ?? 'open-meteo') as string,
    };
  }

  // If tRPC failed but direct API succeeded
  if (trpcQuery.error && directQuery.data) {
    return {
      data: directQuery.data,
      isLoading: false,
      error: null,
      source: 'open-meteo',
    };
  }

  // Still loading
  if (trpcQuery.isLoading || (trpcQuery.error && directQuery.isLoading)) {
    return {
      data: null,
      isLoading: true,
      error: null,
      source: null,
    };
  }

  // Both failed
  return {
    data: null,
    isLoading: false,
    error: directQuery.error || trpcQuery.error,
    source: null,
  };
}
