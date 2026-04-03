import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

interface OpenMeteoFloodResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    river_discharge_mean: number[];
    river_discharge_max: number[];
  };
}

/**
 * Convert river discharge (m³/s) to approximate water level (meters)
 * This is a simplified hydraulic approximation; real conversion depends on
 * river cross-section geometry. We use a log-based formula for a more
 * realistic relationship than linear scaling.
 */
function dischargeToWaterLevel(discharge: number): number {
  if (discharge <= 0) return 0.5;
  // Manning's equation approximation: depth ~ Q^0.4 for wide channels
  const level = 0.5 + Math.pow(discharge / 10, 0.4);
  return parseFloat(level.toFixed(2));
}

/**
 * Fetch flood data from Open-Meteo GloFAS API
 * Free API, no authentication required
 * https://open-meteo.com/en/docs/flood-api
 */
async function fetchOpenMeteoFloodData(
  latitude: number,
  longitude: number
): Promise<{
  waterLevelHistory: WaterLevelData[];
  currentWaterLevel: number;
  forecastedWaterLevel: number;
  source: 'api' | 'mock';
}> {
  const url =
    `https://flood-api.open-meteo.com/v1/flood` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&daily=river_discharge_mean,river_discharge_max` +
    `&past_days=1&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoFloodResponse = await response.json();

  if (!data.daily?.river_discharge_mean?.length) {
    throw new Error('Open-Meteo API returned empty data');
  }

  const times = data.daily.time;
  const meanDischarges = data.daily.river_discharge_mean;
  const maxDischarges = data.daily.river_discharge_max;

  // Build water level history from daily data
  // Interpolate daily values into hourly entries for the past 24 hours
  const waterLevelHistory: WaterLevelData[] = [];
  const now = new Date();

  // Use first day (past/current) as base, rest as forecast
  const currentDischarge = meanDischarges[0] ?? 0;
  const currentMaxDischarge = maxDischarges[0] ?? 0;
  const currentWaterLevel = dischargeToWaterLevel(currentDischarge);

  // Generate 24-hour history by interpolating around current discharge
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours().toString().padStart(2, '0');

    // Create realistic hourly variation around the daily mean
    const hourFraction = time.getHours() / 24;
    const diurnalVariation = Math.sin(hourFraction * Math.PI * 2 - Math.PI / 2) * 0.15;
    const hourlyDischarge = currentDischarge * (1 + diurnalVariation);
    const waterLevel = dischargeToWaterLevel(hourlyDischarge);

    // Add forecast for future hours using next day's data
    let forecast: number | undefined;
    if (i < 12 && meanDischarges.length > 1) {
      const forecastDischarge = meanDischarges[1] ?? currentDischarge;
      const forecastVariation = Math.sin((hourFraction + 0.1) * Math.PI * 2) * 0.1;
      forecast = dischargeToWaterLevel(forecastDischarge * (1 + forecastVariation));
    }

    waterLevelHistory.push({
      timestamp: `${hour}:00`,
      waterLevel,
      forecast,
    });
  }

  // Forecasted water level from tomorrow's data
  const forecastDischarge = meanDischarges[1] ?? currentDischarge;
  const forecastedWaterLevel = dischargeToWaterLevel(forecastDischarge);

  return {
    waterLevelHistory,
    currentWaterLevel,
    forecastedWaterLevel,
    source: 'api',
  };
}

/**
 * Generate mock flood data as fallback
 */
function generateMockFloodData(): WaterLevelData[] {
  const now = new Date();
  const data: WaterLevelData[] = [];

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours().toString().padStart(2, '0');
    const baseLevel = 2.3 + Math.sin(i / 4) * 0.5;
    const forecast = baseLevel + 0.15 + Math.sin(i / 3) * 0.3;

    data.push({
      timestamp: `${hour}:00`,
      waterLevel: parseFloat(baseLevel.toFixed(2)),
      forecast: i < 12 ? undefined : parseFloat(forecast.toFixed(2)),
    });
  }

  return data;
}

/**
 * Determine risk level based on water level
 */
function getRiskLevel(waterLevel: number): 'low' | 'medium' | 'high' | 'critical' {
  if (waterLevel < 2.5) return 'low';
  if (waterLevel < 3.5) return 'medium';
  if (waterLevel < 4.5) return 'high';
  return 'critical';
}

export const floodRouter = router({
  /**
   * Get flood data for a specific location
   * Fetches real data from Open-Meteo GloFAS API, falls back to mock data
   */
  getFloodData: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
    )
    .query(async ({ input }) => {
      try {
        // Try fetching real data from Open-Meteo GloFAS API
        const apiData = await fetchOpenMeteoFloodData(input.latitude, input.longitude);

        return {
          success: true,
          data: {
            currentWaterLevel: apiData.currentWaterLevel,
            forecastedWaterLevel: apiData.forecastedWaterLevel,
            riskLevel: getRiskLevel(apiData.currentWaterLevel),
            waterLevelHistory: apiData.waterLevelHistory,
            lastUpdated: new Date(),
            source: apiData.source,
          },
        };
      } catch (error) {
        console.error('Error fetching flood data from API, falling back to mock:', error);

        // Fallback to mock data
        const waterLevelData = generateMockFloodData();
        const currentData = waterLevelData[waterLevelData.length - 1];
        const currentWaterLevel = currentData?.waterLevel || 2.45;
        const forecastedWaterLevel = currentData?.forecast || 2.60;

        return {
          success: true,
          data: {
            currentWaterLevel,
            forecastedWaterLevel,
            riskLevel: getRiskLevel(currentWaterLevel),
            waterLevelHistory: waterLevelData,
            lastUpdated: new Date(),
            source: 'mock' as const,
          },
        };
      }
    }),

  /**
   * Get flood data for Ankara (default location)
   * Uses Open-Meteo GloFAS API with Ankara coordinates
   */
  getAnkaraFloodData: publicProcedure.query(async () => {
    const ankaraLat = 39.93;
    const ankaraLon = 32.86;

    try {
      // Fetch real data from Open-Meteo GloFAS API
      const apiData = await fetchOpenMeteoFloodData(ankaraLat, ankaraLon);

      return {
        success: true,
        data: {
          location: 'Ankara',
          latitude: ankaraLat,
          longitude: ankaraLon,
          currentWaterLevel: apiData.currentWaterLevel,
          forecastedWaterLevel: apiData.forecastedWaterLevel,
          riskLevel: getRiskLevel(apiData.currentWaterLevel),
          waterLevelHistory: apiData.waterLevelHistory,
          lastUpdated: new Date(),
          source: apiData.source,
        },
      };
    } catch (error) {
      console.error('Error fetching Ankara flood data from API, falling back to mock:', error);

      // Fallback to mock data
      const waterLevelData = generateMockFloodData();
      const currentData = waterLevelData[waterLevelData.length - 1];
      const currentWaterLevel = currentData?.waterLevel || 2.45;
      const forecastedWaterLevel = currentData?.forecast || 2.60;

      return {
        success: true,
        data: {
          location: 'Ankara',
          latitude: ankaraLat,
          longitude: ankaraLon,
          currentWaterLevel,
          forecastedWaterLevel,
          riskLevel: getRiskLevel(currentWaterLevel),
          waterLevelHistory: waterLevelData,
          lastUpdated: new Date(),
          source: 'mock' as const,
        },
      };
    }
  }),

  /**
   * Get flood data for multiple locations
   * Uses Open-Meteo GloFAS API for each location
   */
  getFloodDataBatch: publicProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            name: z.string(),
            latitude: z.number(),
            longitude: z.number(),
          })
        ),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.locations.map(async (location) => {
            try {
              const apiData = await fetchOpenMeteoFloodData(location.latitude, location.longitude);
              return {
                location: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                currentWaterLevel: apiData.currentWaterLevel,
                forecastedWaterLevel: apiData.forecastedWaterLevel,
                riskLevel: getRiskLevel(apiData.currentWaterLevel),
                waterLevelHistory: apiData.waterLevelHistory,
                lastUpdated: new Date(),
                source: apiData.source,
              };
            } catch {
              // Fallback to mock for individual location failures
              const waterLevelData = generateMockFloodData();
              const currentData = waterLevelData[waterLevelData.length - 1];
              return {
                location: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                currentWaterLevel: currentData?.waterLevel || 2.45,
                forecastedWaterLevel: currentData?.forecast || 2.60,
                riskLevel: getRiskLevel(currentData?.waterLevel || 2.45),
                waterLevelHistory: waterLevelData,
                lastUpdated: new Date(),
                source: 'mock' as const,
              };
            }
          })
        );

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error('Error fetching batch flood data:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),
});
