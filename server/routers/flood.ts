import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { getFloodDataWithFallback, getFloodTimeSeriesWithFallback } from '../services/floodDataSources';

/**
 * flood.ts - Flood Data Router
 * Fallback stratejisi ile sel verisi sağlayan tRPC router
 * Sıra: Open-Meteo Weather → Open-Meteo Flood → USGS → Mock
 */

// Türkiye'deki önemli bölgeler
const REGIONS = {
  ankara: { lat: 39.93, lon: 32.86, name: 'Ankara' },
  istanbul: { lat: 41.0082, lon: 28.9784, name: 'Istanbul' },
  izmir: { lat: 38.4161, lon: 27.1398, name: 'Izmir' },
  samsun: { lat: 41.2867, lon: 36.3386, name: 'Samsun' },
  rize: { lat: 41.2, lon: 40.5, name: 'Rize' },
  kastamonu: { lat: 41.3769, lon: 33.7764, name: 'Kastamonu' },
};

export const floodRouter = router({
  /**
   * Belirli koordinatlar için flood verisi al
   */
  getFloodData: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        regionName: z.string().optional(),
        regionId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const regionId = input.regionId || `${input.latitude},${input.longitude}`;
      const regionName = input.regionName || `Location (${input.latitude.toFixed(2)}, ${input.longitude.toFixed(2)})`;

      try {
        const floodData = await getFloodDataWithFallback(
          input.latitude,
          input.longitude,
          regionName,
          regionId
        );

        return {
          success: true,
          data: floodData,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error('[FLOOD-ROUTER] Error fetching flood data:', error);
        return {
          success: false,
          error: 'Failed to fetch flood data',
          timestamp: new Date(),
        };
      }
    }),

  /**
   * Ankara bölgesi için flood verisi (varsayılan)
   */
  getAnkaraFloodData: publicProcedure.query(async () => {
    const ankara = REGIONS.ankara;

    try {
      const floodData = await getFloodDataWithFallback(
        ankara.lat,
        ankara.lon,
        ankara.name,
        'ankara'
      );

      return {
        success: true,
        data: floodData,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[FLOOD-ROUTER] Error fetching Ankara flood data:', error);
      return {
        success: false,
        error: 'Failed to fetch Ankara flood data',
        timestamp: new Date(),
      };
    }
  }),

  /**
   * Tüm önemli bölgeler için flood verisi
   */
  getAllRegionsFloodData: publicProcedure.query(async () => {
    try {
      const results = await Promise.all(
        Object.entries(REGIONS).map(async ([id, region]) => {
          const floodData = await getFloodDataWithFallback(
            region.lat,
            region.lon,
            region.name,
            id
          );
          return {
            regionId: id,
            ...floodData,
          };
        })
      );

      return {
        success: true,
        data: results,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[FLOOD-ROUTER] Error fetching all regions flood data:', error);
      return {
        success: false,
        error: 'Failed to fetch regions flood data',
        timestamp: new Date(),
      };
    }
  }),

  /**
   * Belirli bölge için zaman serisi flood verisi
   */
  getFloodTimeSeries: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        regionName: z.string().optional(),
        regionId: z.string().optional(),
        hours: z.number().min(1).max(168).default(24),
      })
    )
    .query(async ({ input }) => {
      const regionId = input.regionId || `${input.latitude},${input.longitude}`;
      const regionName = input.regionName || `Location (${input.latitude.toFixed(2)}, ${input.longitude.toFixed(2)})`;

      try {
        const timeSeries = await getFloodTimeSeriesWithFallback(
          input.latitude,
          input.longitude,
          regionName,
          regionId,
          input.hours
        );

        return {
          success: true,
          data: timeSeries,
          regionId,
          regionName,
          hours: input.hours,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error('[FLOOD-ROUTER] Error fetching flood time series:', error);
        return {
          success: false,
          error: 'Failed to fetch flood time series',
          timestamp: new Date(),
        };
      }
    }),

  /**
   * Mevcut bölgeleri listele
   */
  getAvailableRegions: publicProcedure.query(() => {
    return {
      success: true,
      data: Object.entries(REGIONS).map(([id, region]) => ({
        id,
        name: region.name,
        latitude: region.lat,
        longitude: region.lon,
      })),
    };
  }),

  /**
   * Bölge bilgisi al
   */
  getRegionInfo: publicProcedure
    .input(z.object({ regionId: z.string() }))
    .query(({ input }) => {
      const region = REGIONS[input.regionId as keyof typeof REGIONS];

      if (!region) {
        return {
          success: false,
          error: `Region ${input.regionId} not found`,
        };
      }

      return {
        success: true,
        data: {
          id: input.regionId,
          name: region.name,
          latitude: region.lat,
          longitude: region.lon,
        },
      };
    }),
});
