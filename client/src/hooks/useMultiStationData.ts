import { useQuery } from '@tanstack/react-query';
import { STATIONS, type Station } from '@/data/stations';

export type SeverityLevel = 'normal' | 'uyari' | 'tehlike' | 'asiri' | 'veri_yok';

export interface DailyDischarge {
  date: string;
  mean: number;
  max: number;
  min: number;
  isForecast: boolean;
}

export interface StationData {
  station: Station;
  severity: SeverityLevel;
  currentDischarge: number;
  forecastDischarge: number;
  dailyData: DailyDischarge[];
  thresholds: {
    uyari: number;
    tehlike: number;
    asiri: number;
  };
  lastUpdated: Date;
}

interface OpenMeteoFloodResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    river_discharge_mean: (number | null)[];
    river_discharge_max: (number | null)[];
    river_discharge_min: (number | null)[];
  };
}

function calculateThresholds(basinSize: number) {
  // Thresholds scale with basin size
  const factor = Math.sqrt(basinSize / 1000);
  return {
    uyari: Math.round(50 * factor),
    tehlike: Math.round(150 * factor),
    asiri: Math.round(400 * factor),
  };
}

function getSeverity(discharge: number, thresholds: { uyari: number; tehlike: number; asiri: number }): SeverityLevel {
  if (discharge <= 0) return 'veri_yok';
  if (discharge >= thresholds.asiri) return 'asiri';
  if (discharge >= thresholds.tehlike) return 'tehlike';
  if (discharge >= thresholds.uyari) return 'uyari';
  return 'normal';
}

async function fetchStationData(station: Station): Promise<StationData> {
  const url =
    `https://flood-api.open-meteo.com/v1/flood` +
    `?latitude=${station.latitude}&longitude=${station.longitude}` +
    `&daily=river_discharge_mean,river_discharge_max,river_discharge_min` +
    `&past_days=30&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const apiData: OpenMeteoFloodResponse = await response.json();
  const today = new Date().toISOString().slice(0, 10);
  const thresholds = calculateThresholds(station.basinSize);

  const dailyData: DailyDischarge[] = [];
  let currentDischarge = 0;
  let forecastDischarge = 0;

  for (let i = 0; i < apiData.daily.time.length; i++) {
    const date = apiData.daily.time[i];
    const mean = apiData.daily.river_discharge_mean[i] ?? 0;
    const max = apiData.daily.river_discharge_max[i] ?? 0;
    const min = apiData.daily.river_discharge_min?.[i] ?? 0;
    const isForecast = date > today;

    dailyData.push({ date, mean, max, min, isForecast });

    if (date === today) {
      currentDischarge = mean;
      forecastDischarge = max;
    }
  }

  // If today's data not found, use the most recent past day
  if (currentDischarge === 0 && dailyData.length > 0) {
    const pastDays = dailyData.filter(d => !d.isForecast);
    if (pastDays.length > 0) {
      const latest = pastDays[pastDays.length - 1];
      currentDischarge = latest.mean;
      forecastDischarge = latest.max;
    }
  }

  const severity = getSeverity(currentDischarge, thresholds);

  return {
    station,
    severity,
    currentDischarge: parseFloat(currentDischarge.toFixed(2)),
    forecastDischarge: parseFloat(forecastDischarge.toFixed(2)),
    dailyData,
    thresholds,
    lastUpdated: new Date(),
  };
}

async function fetchAllStations(): Promise<StationData[]> {
  // Fetch in batches to avoid overwhelming the API
  const batchSize = 6;
  const results: StationData[] = [];

  for (let i = 0; i < STATIONS.length; i += batchSize) {
    const batch = STATIONS.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(station => fetchStationData(station))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Create a "no data" entry for failed stations
        const station = batch[j];
        results.push({
          station,
          severity: 'veri_yok',
          currentDischarge: 0,
          forecastDischarge: 0,
          dailyData: [],
          thresholds: calculateThresholds(station.basinSize),
          lastUpdated: new Date(),
        });
      }
    }

    // Small delay between batches
    if (i + batchSize < STATIONS.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

export function useMultiStationData() {
  return useQuery({
    queryKey: ['multi-station-flood-data'],
    queryFn: fetchAllStations,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
