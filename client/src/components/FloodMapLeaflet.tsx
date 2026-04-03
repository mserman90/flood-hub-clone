import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { StationData, SeverityLevel } from '@/hooks/useMultiStationData';
import {
  type GDACSAlert,
  ALERT_LEVEL_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  timeAgo,
} from '@/hooks/useAlertFeeds';

export interface FloodMapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
}

interface FloodMapLeafletProps {
  stations: StationData[];
  selectedStationId: string | null;
  onStationClick: (station: StationData) => void;
  visibleSeverities: Set<SeverityLevel>;
  mapType: 'harita' | 'karma';
  gdacsAlerts?: GDACSAlert[];
  showAlertMarkers?: boolean;
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  normal: '#4CAF50',
  uyari: '#FF9800',
  tehlike: '#F44336',
  asiri: '#B71C1C',
  veri_yok: '#9E9E9E',
};

const SEVERITY_RADIUS: Record<SeverityLevel, number> = {
  normal: 7,
  uyari: 9,
  tehlike: 11,
  asiri: 13,
  veri_yok: 6,
};

export const FloodMapLeaflet = forwardRef<FloodMapHandle, FloodMapLeafletProps>(function FloodMapLeaflet({
  stations,
  selectedStationId,
  onStationClick,
  visibleSeverities,
  mapType,
  gdacsAlerts = [],
  showAlertMarkers = false,
}, ref) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const alertMarkersRef = useRef<L.Marker[]>([]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lon: number, zoom = 8) => {
      mapRef.current?.flyTo([lat, lon], zoom, { duration: 1.2 });
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.93, 33.0],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add attribution
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer based on mapType
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'karma') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
      }).addTo(map);
      L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
    }
  }, [mapType]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    stations.forEach(stationData => {
      if (!visibleSeverities.has(stationData.severity)) return;

      const color = SEVERITY_COLORS[stationData.severity];
      const radius = SEVERITY_RADIUS[stationData.severity];
      const isSelected = stationData.station.id === selectedStationId;

      const marker = L.circleMarker(
        [stationData.station.latitude, stationData.station.longitude],
        {
          radius: isSelected ? radius + 3 : radius,
          fillColor: color,
          color: isSelected ? '#ffffff' : color,
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.85,
        }
      );

      marker.on('click', () => onStationClick(stationData));

      marker.bindTooltip(stationData.station.name, {
        direction: 'top',
        offset: [0, -radius],
        className: 'flood-tooltip',
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [stations, selectedStationId, onStationClick, visibleSeverities]);

  // Update alert markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old alert markers
    alertMarkersRef.current.forEach((m) => map.removeLayer(m));
    alertMarkersRef.current = [];

    if (!showAlertMarkers || gdacsAlerts.length === 0) return;

    gdacsAlerts.forEach((alert) => {
      const color = ALERT_LEVEL_COLORS[alert.alertLevel];
      const isRed = alert.alertLevel === 'Red';
      const size = isRed ? 16 : alert.alertLevel === 'Orange' ? 14 : 12;

      const svgIcon = L.divIcon({
        className: `alert-marker-icon ${isRed ? 'alert-marker-pulse' : ''}`,
        html: `<div class="alert-diamond" style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;transform:rotate(45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      });

      const typeLabel = EVENT_TYPE_LABELS[alert.eventType] ?? alert.eventType;
      const icon = EVENT_TYPE_ICONS[alert.eventType] ?? '⚠️';

      const popupContent = `
        <div class="alert-popup">
          <div class="alert-popup-header" style="border-bottom-color:${color}">
            <span>${icon} ${typeLabel}</span>
            <span class="alert-popup-level" style="background:${color}">${alert.alertLevel}</span>
          </div>
          <div class="alert-popup-title">${alert.name}</div>
          <div class="alert-popup-meta">
            <div>${alert.country || ''}</div>
            <div>${timeAgo(alert.fromDate)}</div>
            ${alert.severityText ? `<div>${alert.severityText}</div>` : ''}
          </div>
          ${alert.reportUrl ? `<a href="${alert.reportUrl}" target="_blank" rel="noopener noreferrer" class="alert-popup-link">Raporu görüntüle →</a>` : ''}
        </div>
      `;

      const marker = L.marker([alert.latitude, alert.longitude], { icon: svgIcon });
      marker.bindPopup(popupContent, {
        className: 'alert-popup-container',
        maxWidth: 280,
      });
      marker.bindTooltip(`${icon} ${alert.name}`, {
        direction: 'top',
        offset: [0, -(size / 2 + 4)],
        className: 'flood-tooltip',
      });

      marker.addTo(map);
      alertMarkersRef.current.push(marker);
    });
  }, [gdacsAlerts, showAlertMarkers]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ background: '#e8f4f8' }}
    />
  );
});
