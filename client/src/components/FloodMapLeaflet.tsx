import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { StationData, SeverityLevel } from '@/hooks/useMultiStationData';

interface FloodMapLeafletProps {
  stations: StationData[];
  selectedStationId: string | null;
  onStationClick: (station: StationData) => void;
  visibleSeverities: Set<SeverityLevel>;
  mapType: 'harita' | 'karma';
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

export function FloodMapLeaflet({
  stations,
  selectedStationId,
  onStationClick,
  visibleSeverities,
  mapType,
}: FloodMapLeafletProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

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

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ background: '#e8f4f8' }}
    />
  );
}
