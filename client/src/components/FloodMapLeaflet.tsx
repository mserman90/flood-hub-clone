import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
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
  getZoom: () => number;
}

interface FloodMapLeafletProps {
  stations: StationData[];
  selectedStationId: string | null;
  onStationClick: (station: StationData) => void;
  visibleSeverities: Set<SeverityLevel>;
  mapType: 'harita' | 'karma';
  onMapTypeChange: (type: 'harita' | 'karma') => void;
  gdacsAlerts?: GDACSAlert[];
  showAlertMarkers?: boolean;
  showExtendedCoverage?: boolean;
  showFloodProbability?: boolean;
  showInundationHistory?: boolean;
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

const SEVERITY_PRIORITY: Record<SeverityLevel, number> = {
  asiri: 4,
  tehlike: 3,
  uyari: 2,
  veri_yok: 1,
  normal: 0,
};

const CLUSTER_ZOOM_THRESHOLD = 8;

function getClusterColor(severities: SeverityLevel[]): string {
  let max: SeverityLevel = 'normal';
  for (const s of severities) {
    if (SEVERITY_PRIORITY[s] > SEVERITY_PRIORITY[max]) max = s;
  }
  return SEVERITY_COLORS[max];
}

export const FloodMapLeaflet = forwardRef<FloodMapHandle, FloodMapLeafletProps>(function FloodMapLeaflet({
  stations,
  selectedStationId,
  onStationClick,
  visibleSeverities,
  mapType,
  onMapTypeChange,
  gdacsAlerts = [],
  showAlertMarkers = false,
  showExtendedCoverage = false,
  showFloodProbability = false,
  showInundationHistory = false,
}, ref) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const overlayLayersRef = useRef<L.Circle[]>([]);
  const [currentZoom, setCurrentZoom] = useState(7);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lon: number, zoom = 8) => {
      mapRef.current?.flyTo([lat, lon], zoom, { duration: 1.2 });
    },
    getZoom: () => mapRef.current?.getZoom() ?? 7,
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

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

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

  // Update station markers with clustering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old individual markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Remove old cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const filteredStations = stations.filter(s => {
      if (!visibleSeverities.has(s.severity)) return false;
      if (!showExtendedCoverage && s.station.confidence === 'low') return false;
      return true;
    });

    const useClustering = currentZoom <= CLUSTER_ZOOM_THRESHOLD;

    if (useClustering) {
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => {
          const childMarkers = cluster.getAllChildMarkers();
          const severities = childMarkers.map(m => (m as L.Marker & { _stationSeverity?: SeverityLevel })._stationSeverity || 'normal');
          const color = getClusterColor(severities);
          const count = cluster.getChildCount();

          return L.divIcon({
            html: `<div class="hex-cluster" style="background:${color}"><span>${count}</span></div>`,
            className: 'hex-cluster-wrapper',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });
        },
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: CLUSTER_ZOOM_THRESHOLD + 1,
      });

      filteredStations.forEach(stationData => {
        const color = SEVERITY_COLORS[stationData.severity];
        const isSelected = stationData.station.id === selectedStationId;

        const marker = L.marker(
          [stationData.station.latitude, stationData.station.longitude],
          {
            icon: L.divIcon({
              html: `<div class="station-cluster-dot" style="background:${color};border:${isSelected ? '3px solid #fff' : `2px solid ${color}`};width:${isSelected ? 20 : 14}px;height:${isSelected ? 20 : 14}px;"></div>`,
              className: 'station-dot-wrapper',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          }
        );

        (marker as L.Marker & { _stationSeverity?: SeverityLevel })._stationSeverity = stationData.severity;
        marker.on('click', () => onStationClick(stationData));
        marker.bindTooltip(stationData.station.name, {
          direction: 'top',
          offset: [0, -10],
          className: 'flood-tooltip',
        });

        clusterGroup.addLayer(marker);
      });

      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    } else {
      // Individual circle markers when zoomed in
      filteredStations.forEach(stationData => {
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
    }
  }, [stations, selectedStationId, onStationClick, visibleSeverities, currentZoom, showExtendedCoverage]);

  // Update alert markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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

  // Inundation overlays (probability + history)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old overlays
    overlayLayersRef.current.forEach(l => map.removeLayer(l));
    overlayLayersRef.current = [];

    if (showFloodProbability) {
      stations.forEach(s => {
        if (s.severity === 'uyari' || s.severity === 'tehlike' || s.severity === 'asiri') {
          const color =
            s.severity === 'asiri' ? '#1565C0' :
            s.severity === 'tehlike' ? '#42A5F5' :
            '#90CAF9';
          const radius =
            s.severity === 'asiri' ? 15000 :
            s.severity === 'tehlike' ? 12000 :
            8000;

          const circle = L.circle(
            [s.station.latitude, s.station.longitude],
            {
              radius,
              fillColor: color,
              fillOpacity: 0.25,
              color: color,
              weight: 1,
              opacity: 0.4,
              className: 'inundation-overlay',
            }
          );
          circle.addTo(map);
          overlayLayersRef.current.push(circle);
        }
      });
    }

    if (showInundationHistory) {
      stations.forEach(s => {
        // Simulate history - show purple overlays with varying opacity
        const opacity = s.severity === 'normal' ? 0.1 : s.severity === 'uyari' ? 0.2 : 0.35;
        const circle = L.circle(
          [s.station.latitude, s.station.longitude],
          {
            radius: 10000,
            fillColor: '#7B1FA2',
            fillOpacity: opacity,
            color: '#7B1FA2',
            weight: 1,
            opacity: 0.3,
            className: 'inundation-overlay',
          }
        );
        circle.addTo(map);
        overlayLayersRef.current.push(circle);
      });
    }
  }, [stations, showFloodProbability, showInundationHistory]);

  return (
    <div className="map-container-wrapper">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ background: '#e8f4f8' }}
      />

      {/* Map type toggle overlay */}
      <div className="map-type-overlay">
        <button
          className={`map-type-overlay-btn ${mapType === 'harita' ? 'map-type-overlay-active' : ''}`}
          onClick={() => onMapTypeChange('harita')}
        >
          Harita
        </button>
        <button
          className={`map-type-overlay-btn ${mapType === 'karma' ? 'map-type-overlay-active' : ''}`}
          onClick={() => onMapTypeChange('karma')}
        >
          Karma
        </button>
      </div>
    </div>
  );
});
