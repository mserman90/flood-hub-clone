/**
 * floodRiskJob.ts
 * Periyodik sel riski kontrol job'u.
 * Belirli araliklarla bolgeler icin flood risk skoru hesaplar
 * ve esik asildiysa notificationsRouter uzerinden push bildirim gonderir.
 *
 * Kullanim: server/index.ts icerisinde startFloodRiskJob() cagirin.
 */

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// -----------------------------------------------------------
// Izlenen bolgeler (production'da DB'den cekilebilir)
// -----------------------------------------------------------

export interface MonitoredRegion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  alertThreshold: RiskLevel; // Bu seviye ve uzeri icin alert gonder
}

export const DEFAULT_MONITORED_REGIONS: MonitoredRegion[] = [
  { id: 'ankara-cubuk', name: 'Cubuk Cayi (Ankara)', latitude: 40.2316, longitude: 33.0302, alertThreshold: 'high' },
  { id: 'istanbul-kagithane', name: 'Kagithane Deresi (Istanbul)', latitude: 41.0736, longitude: 28.9778, alertThreshold: 'high' },
  { id: 'izmir-bornova', name: 'Bornova Cayi (Izmir)', latitude: 38.4681, longitude: 27.2195, alertThreshold: 'high' },
  { id: 'samsun-mert', name: 'Mert Irmaği (Samsun)', latitude: 41.2869, longitude: 36.3300, alertThreshold: 'high' },
  { id: 'rize-firtina', name: 'Fırtına Deresi (Rize)', latitude: 41.0500, longitude: 40.9800, alertThreshold: 'medium' },
  { id: 'kastamonu-ezine', name: 'Ezine Cayi (Kastamonu)', latitude: 41.3760, longitude: 33.7760, alertThreshold: 'high' },
];

// -----------------------------------------------------------
// Risk hesaplama motoru
// -----------------------------------------------------------

export interface FloodRiskResult {
  regionId: string;
  regionName: string;
  riskLevel: RiskLevel;
  waterLevel: number;
  previousRiskLevel?: RiskLevel;
  isEscalated: boolean; // Risk seviyesi yukseldi mi?
  checkedAt: string;
}

/**
 * Su seviyesinden risk seviyesini hesapla
 * Production'da GloFAS, TATUS veya Open-Meteo API'sinden veri cekin
 */
function calculateRiskFromWaterLevel(waterLevel: number): RiskLevel {
  if (waterLevel < 2.5) return 'low';
  if (waterLevel < 3.5) return 'medium';
  if (waterLevel < 4.5) return 'high';
  return 'critical';
}

/**
 * Bir bolge icin guncel flood verisini getir
 * Production: Open-Meteo GloFAS veya TATUS API entegrasyonu
 */
async function fetchRegionFloodData(
  region: MonitoredRegion
): Promise<{ waterLevel: number; riskLevel: RiskLevel }> {
  try {
    // ----- PRODUCTION: Open-Meteo GloFAS entegrasyonu -----
    // const url = `https://flood-api.open-meteo.com/v1/flood` +
    //   `?latitude=${region.latitude}&longitude=${region.longitude}` +
    //   `&daily=river_discharge_max&forecast_days=1`;
    // const response = await fetch(url);
    // const data = await response.json();
    // const discharge = data.daily?.river_discharge_max?.[0] || 0;
    // const waterLevel = dischargeToWaterLevel(discharge);
    // return { waterLevel, riskLevel: calculateRiskFromWaterLevel(waterLevel) };

    // ----- GELISTIRME: Simulasyon (zaman bazli dalgalanma) -----
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const seed = (region.latitude * 100 + region.longitude) % 7;
    const baseLevel = 2.0 + (seed * 0.3);
    // Zaman bazli dalgalanma + rastgele ek
    const timeVariation = Math.sin((hour * 60 + minute) / 180) * 1.2;
    const noise = Math.sin(Date.now() / 120000 + seed) * 0.4;
    const waterLevel = Math.max(0.5, baseLevel + timeVariation + noise);

    return {
      waterLevel: parseFloat(waterLevel.toFixed(2)),
      riskLevel: calculateRiskFromWaterLevel(waterLevel),
    };
  } catch (error) {
    console.error(`[FLOOD-JOB] ${region.name} verisi alinamadi:`, error);
    return { waterLevel: 0, riskLevel: 'low' };
  }
}

// -----------------------------------------------------------
// Risk gecmisi (onceki kontrol ile karsilastirmak icin)
// -----------------------------------------------------------

const previousRiskLevels = new Map<string, RiskLevel>();

// -----------------------------------------------------------
// Push bildirim gonderimi (notificationsRouter'dan)
// -----------------------------------------------------------

async function sendAlertsForEscalations(
  escalations: FloodRiskResult[]
): Promise<void> {
  if (escalations.length === 0) return;

  try {
    // notificationsRouter.broadcastFloodAlerts'i dogrudan cagir
    const { notificationsRouter } = await import('../routers/notifications');

    // tRPC caller olustur
    const { createCallerFactory } = await import('../_core/trpc');
    const createCaller = createCallerFactory(notificationsRouter);
    const caller = createCaller({} as never);

    const alerts = escalations.map((r) => ({
      regionId: r.regionId,
      regionName: r.regionName,
      riskLevel: r.riskLevel,
      waterLevel: r.waterLevel,
    }));

    const result = await caller.broadcastFloodAlerts({ alerts });
    console.log('[FLOOD-JOB] Bildirimler gonderildi:', result.results);
  } catch (error) {
    // tRPC caller yoksa HTTP fallback
    console.error('[FLOOD-JOB] tRPC caller hatasi, HTTP fallback deneniyor:', error);
    await sendAlertsViaHttp(escalations);
  }
}

async function sendAlertsViaHttp(escalations: FloodRiskResult[]): Promise<void> {
  const port = process.env.PORT || 3000;
  for (const alert of escalations) {
    try {
      await fetch(`http://localhost:${port}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: alert.regionId,
          regionName: alert.regionName,
          riskLevel: alert.riskLevel,
          waterLevel: alert.waterLevel,
        }),
      });
    } catch {
      // HTTP de basarisiz olursa log yaz
      console.log('[FLOOD-JOB] HTTP alert gonderimi basarisiz:', alert.regionName);
    }
  }
}

// -----------------------------------------------------------
// Ana job fonksiyonu
// -----------------------------------------------------------

export async function runFloodRiskCheck(
  regions: MonitoredRegion[] = DEFAULT_MONITORED_REGIONS
): Promise<FloodRiskResult[]> {
  const results: FloodRiskResult[] = [];
  const escalations: FloodRiskResult[] = [];

  for (const region of regions) {
    const { waterLevel, riskLevel } = await fetchRegionFloodData(region);
    const prevRisk = previousRiskLevels.get(region.id);

    const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const isEscalated =
      riskLevel !== prevRisk &&
      riskOrder.indexOf(riskLevel) > (prevRisk ? riskOrder.indexOf(prevRisk) : -1) &&
      riskOrder.indexOf(riskLevel) >= riskOrder.indexOf(region.alertThreshold);

    const result: FloodRiskResult = {
      regionId: region.id,
      regionName: region.name,
      riskLevel,
      waterLevel,
      previousRiskLevel: prevRisk,
      isEscalated,
      checkedAt: new Date().toISOString(),
    };

    results.push(result);
    previousRiskLevels.set(region.id, riskLevel);

    if (isEscalated) {
      escalations.push(result);
      console.log(
        `[FLOOD-JOB] ESIK ASILDI: ${region.name} | ${prevRisk} -> ${riskLevel} | ${waterLevel}m`
      );
    }
  }

  // Yukselen risk seviyeleri icin bildirim gonder
  if (escalations.length > 0) {
    await sendAlertsForEscalations(escalations);
  }

  return results;
}

// -----------------------------------------------------------
// Zamanlanmis job baslat
// -----------------------------------------------------------

let jobInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Flood risk kontrol job'unu baslat
 * @param intervalMinutes Kontrol araligi (varsayilan: 15 dakika)
 */
export function startFloodRiskJob(
  intervalMinutes = 15,
  regions: MonitoredRegion[] = DEFAULT_MONITORED_REGIONS
): void {
  if (jobInterval) {
    console.warn('[FLOOD-JOB] Job zaten calisiyor.');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[FLOOD-JOB] Baslatildi. Kontrol araligi: ${intervalMinutes} dakika | Izlenen bolge sayisi: ${regions.length}`
  );

  // Ilk kontrolu hemen yap
  runFloodRiskCheck(regions).then((results) => {
    const summary = results.map((r) => `${r.regionName}: ${r.riskLevel} (${r.waterLevel}m)`).join(', ');
    console.log(`[FLOOD-JOB] Ilk kontrol tamamlandi: ${summary}`);
  });

  // Periyodik kontrol
  jobInterval = setInterval(async () => {
    try {
      const results = await runFloodRiskCheck(regions);
      const high = results.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical');
      if (high.length > 0) {
        console.log(
          `[FLOOD-JOB] Yuksek riskli bolgeler: ${high.map((r) => `${r.regionName}(${r.riskLevel})`).join(', ')}`
        );
      }
    } catch (error) {
      console.error('[FLOOD-JOB] Kontrol hatasi:', error);
    }
  }, intervalMs);
}

/**
 * Flood risk job'unu durdur
 */
export function stopFloodRiskJob(): void {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log('[FLOOD-JOB] Durduruldu.');
  }
}

/**
 * Mevcut risk durumlarini dondur (API veya test icin)
 */
export function getCurrentRiskLevels(): Record<string, RiskLevel> {
  return Object.fromEntries(previousRiskLevels);
}
