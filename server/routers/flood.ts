import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

interface GoogleFloodStatus {
  gaugeId: string;
  waterLevel: number;
  discharge: number;
  riskLevel: string;
  forecasts: {
    time: string;
    discharge: number;
    waterLevel: number;
  }[];
}

async function fetchGoogleFloodData(gaugeId: string): Promise<any> {
  const apiKey = process.env.GOOGLE_FLOOD_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_FLOOD_API_KEY is not set');
  
  const url = `https://floodforecasting.googleapis.com/v1/floodStatus:queryLatestFloodStatusByGaugeIds?gaugeIds=${gaugeId}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Google Flood API request failed');
  return response.json();
}

async function fetchOpenMeteoFloodData(latitude: number, longitude: number) {
  const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${latitude}&longitude=${longitude}&daily=river_discharge_mean&past_days=1&forecast_days=7`;
  const response = await fetch(url);
  return response.json();
}

export const floodRouter = router({
  getFloodData: publicProcedure
    .input(z.object({ 
      latitude: z.number(), 
      longitude: z.number(),
      gaugeId: z.string().optional() 
    }))
    .query(async ({ input }) => {
      try {
        if (input.gaugeId) {
          const gData = await fetchGoogleFloodData(input.gaugeId);
          return { success: true, source: 'google', data: gData };
        }
        throw new Error('No gaugeId provided');
      } catch (e) {
        const omData = await fetchOpenMeteoFloodData(input.latitude, input.longitude);
        return { success: true, source: 'open-meteo', data: omData };
      }
    }),
  
  getAnkaraFloodData: publicProcedure.query(async () => {
    // Ankara default gauge or coordinates
    const ankaraGauge = 'hybas_2120644990'; 
    try {
      const gData = await fetchGoogleFloodData(ankaraGauge);
      return { success: true, source: 'google', data: gData };
    } catch (e) {
      const omData = await fetchOpenMeteoFloodData(39.93, 32.86);
      return { success: true, source: 'open-meteo', data: omData };
    }
  })
});
