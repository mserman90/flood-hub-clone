import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

/**
 * Generate mock flood data for demonstration
 * In production, this would connect to a real API
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
   * Currently returns mock data, can be extended with real API integration
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
        // Generate mock data
        const waterLevelData = generateMockFloodData();

        // Get current water level (last entry)
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
            source: 'mock', // Indicates this is mock data
          },
        };
      } catch (error) {
        console.error('Error fetching flood data:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Get flood data for Ankara (default location)
   */
  getAnkaraFloodData: publicProcedure.query(async () => {
    try {
      // Generate mock data
      const waterLevelData = generateMockFloodData();

      const currentData = waterLevelData[waterLevelData.length - 1];
      const currentWaterLevel = currentData?.waterLevel || 2.45;
      const forecastedWaterLevel = currentData?.forecast || 2.60;

      return {
        success: true,
        data: {
          location: 'Ankara',
          latitude: 38.625278,
          longitude: 35.712311,
          currentWaterLevel,
          forecastedWaterLevel,
          riskLevel: getRiskLevel(currentWaterLevel),
          waterLevelHistory: waterLevelData,
          lastUpdated: new Date(),
          source: 'mock', // Indicates this is mock data
        },
      };
    } catch (error) {
      console.error('Error fetching Ankara flood data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }),

  /**
   * Get flood data for multiple locations
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
        const results = input.locations.map((location) => {
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
            source: 'mock',
          };
        });

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
