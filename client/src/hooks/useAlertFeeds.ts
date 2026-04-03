import { useQuery } from '@tanstack/react-query';

// ---- Types ----

export type GDACSAlertLevel = 'Red' | 'Orange' | 'Green';
export type GDACSEventType = 'FL' | 'EQ' | 'TC' | 'VO' | 'WF' | 'DR';

export interface GDACSAlert {
  id: string;
  eventType: GDACSEventType;
  alertLevel: GDACSAlertLevel;
  name: string;
  description: string;
  country: string;
  fromDate: string;
  toDate: string;
  severity: number;
  severityText: string;
  reportUrl: string;
  latitude: number;
  longitude: number;
  source: 'gdacs';
}

export interface CAPAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  latitude: number;
  longitude: number;
  published: string;
  link: string;
  source: 'afad' | 'tsms';
}

export type DisasterAlert = GDACSAlert | CAPAlert;

// ---- Turkish labels ----

export const EVENT_TYPE_LABELS: Record<GDACSEventType, string> = {
  FL: 'Sel',
  EQ: 'Deprem',
  TC: 'Kasırga',
  VO: 'Volkan',
  WF: 'Orman Yangını',
  DR: 'Kuraklık',
};

export const EVENT_TYPE_ICONS: Record<GDACSEventType, string> = {
  FL: '🌊',
  EQ: '🔴',
  TC: '🌀',
  VO: '🌋',
  WF: '🔥',
  DR: '☀️',
};

export const ALERT_LEVEL_COLORS: Record<GDACSAlertLevel, string> = {
  Red: '#D32F2F',
  Orange: '#F57C00',
  Green: '#388E3C',
};

// ---- Fetch helpers ----

const GDACS_URL =
  'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=FL;EQ;TC;VO;WF&alertlevel=Green;Orange;Red&limit=50';

function parseGDACSResponse(data: any): GDACSAlert[] {
  if (!data?.features || !Array.isArray(data.features)) return [];

  return data.features
    .map((feature: any): GDACSAlert | null => {
      try {
        const props = feature.properties ?? {};
        const coords = feature.geometry?.coordinates;
        if (!coords) return null;

        return {
          id: `gdacs-${props.eventid ?? props.eventtype}-${coords[0]}-${coords[1]}`,
          eventType: (props.eventtype ?? 'FL') as GDACSEventType,
          alertLevel: (props.alertlevel ?? 'Green') as GDACSAlertLevel,
          name: props.name ?? props.eventname ?? 'Bilinmeyen Olay',
          description: props.description ?? props.htmldescription ?? '',
          country: props.country ?? '',
          fromDate: props.fromdate ?? '',
          toDate: props.todate ?? '',
          severity: props.severitydata?.severity ?? 0,
          severityText: props.severitydata?.severitytext ?? '',
          reportUrl: props.url?.report ?? props.url?.details ?? '',
          latitude: coords[1],
          longitude: coords[0],
          source: 'gdacs',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as GDACSAlert[];
}

async function fetchGDACSAlerts(): Promise<GDACSAlert[]> {
  // Try direct fetch first
  try {
    const resp = await fetch(GDACS_URL);
    if (!resp.ok) throw new Error('GDACS direct fetch failed');
    const data = await resp.json();
    return parseGDACSResponse(data);
  } catch {
    // Fallback: CORS proxy
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(GDACS_URL)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error('Proxy fetch failed');
      const data = await resp.json();
      return parseGDACSResponse(data);
    } catch {
      console.warn('All GDACS fetch attempts failed');
      return [];
    }
  }
}

function parseCAPFeed(xmlText: string, source: 'afad' | 'tsms'): CAPAlert[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');
    const alerts: CAPAlert[] = [];

    items.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent ?? '';
      const description = item.querySelector('description')?.textContent ?? '';
      const link = item.querySelector('link')?.textContent ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent ?? '';

      // Try to extract lat/lon from geo tags or description
      const lat = item.querySelector('geo\\:lat, lat')?.textContent;
      const lon = item.querySelector('geo\\:long, long, geo\\:lon, lon')?.textContent;

      // Default to Turkey center if no coords
      const latitude = lat ? parseFloat(lat) : 39.0 + Math.random() * 3;
      const longitude = lon ? parseFloat(lon) : 32.0 + Math.random() * 5;

      alerts.push({
        id: `${source}-${idx}-${pubDate}`,
        title: title || 'CAP Uyarısı',
        description,
        severity: 'Unknown',
        latitude,
        longitude,
        published: pubDate,
        link,
        source,
      });
    });

    return alerts;
  } catch {
    return [];
  }
}

async function fetchCAPFeed(url: string, source: 'afad' | 'tsms'): Promise<CAPAlert[]> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) return [];
    const text = await resp.text();
    return parseCAPFeed(text, source);
  } catch {
    return [];
  }
}

// ---- Distance helper ----

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Turkey center coordinates
const TURKEY_CENTER = { lat: 39.0, lon: 35.0 };
const TURKEY_PROXIMITY_KM = 1000;

export function isNearTurkey(lat: number, lon: number): boolean {
  return haversineDistance(TURKEY_CENTER.lat, TURKEY_CENTER.lon, lat, lon) < TURKEY_PROXIMITY_KM;
}

// ---- Time ago helper ----

export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  return `${diffDays} gün önce`;
}

// ---- Main hook ----

async function fetchAllAlerts(): Promise<{
  gdacs: GDACSAlert[];
  cap: CAPAlert[];
}> {
  const [gdacs, afad, tsms] = await Promise.allSettled([
    fetchGDACSAlerts(),
    fetchCAPFeed('https://cap-sources.s3.amazonaws.com/tr-afad-en/rss.xml', 'afad'),
    fetchCAPFeed('https://cap-sources.s3.amazonaws.com/tr-tsms-en/rss.xml', 'tsms'),
  ]);

  return {
    gdacs: gdacs.status === 'fulfilled' ? gdacs.value : [],
    cap: [
      ...(afad.status === 'fulfilled' ? afad.value : []),
      ...(tsms.status === 'fulfilled' ? tsms.value : []),
    ],
  };
}

export function useAlertFeeds() {
  const query = useQuery({
    queryKey: ['alert-feeds'],
    queryFn: fetchAllAlerts,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const gdacs = query.data?.gdacs ?? [];
  const cap = query.data?.cap ?? [];

  const redAlerts = gdacs.filter((a) => a.alertLevel === 'Red');
  const orangeAlerts = gdacs.filter((a) => a.alertLevel === 'Orange');

  const nearTurkeyHighAlerts = gdacs.filter(
    (a) =>
      (a.alertLevel === 'Red' || a.alertLevel === 'Orange') &&
      isNearTurkey(a.latitude, a.longitude),
  );

  const totalAlertCount = gdacs.length + cap.length;

  const highestAlertLevel: GDACSAlertLevel | null = redAlerts.length
    ? 'Red'
    : orangeAlerts.length
      ? 'Orange'
      : gdacs.length
        ? 'Green'
        : null;

  return {
    gdacs,
    cap,
    allAlerts: [...gdacs, ...cap] as DisasterAlert[],
    totalAlertCount,
    redAlerts,
    orangeAlerts,
    nearTurkeyHighAlerts,
    highestAlertLevel,
    isLoading: query.isLoading,
    error: query.error,
  };
}
