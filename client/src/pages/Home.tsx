import { useState, useCallback, useRef } from 'react';
import { TopBar } from '@/components/TopBar';
import { FloodMapLeaflet, type FloodMapHandle } from '@/components/FloodMapLeaflet';
import { StationDetailPanel } from '@/components/StationDetailPanel';
import { PlaceSidePanel } from '@/components/PlaceSidePanel';
import { OptionsPanel } from '@/components/OptionsPanel';
import { BottomWarningBar } from '@/components/BottomWarningBar';
import { AlertPanel } from '@/components/AlertPanel';
import { useMultiStationData, type StationData, type SeverityLevel } from '@/hooks/useMultiStationData';
import { useAlertFeeds } from '@/hooks/useAlertFeeds';
import type { GeocodingResult } from '@/hooks/useGeocoding';
import { Loader2 } from 'lucide-react';

const ALL_SEVERITIES = new Set<SeverityLevel>(['normal', 'uyari', 'tehlike', 'asiri', 'veri_yok']);

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const { data: stations, isLoading, error } = useMultiStationData();
  const alertFeeds = useAlertFeeds();

  const mapRef = useRef<FloodMapHandle>(null);

  // Panel state
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [optionsPanelOpen, setOptionsPanelOpen] = useState(false);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);

  // Place panel state
  const [placeInfo, setPlaceInfo] = useState<{ name: string; lat: number; lon: number } | null>(null);

  // Map state
  const [mapType, setMapType] = useState<'harita' | 'karma'>('harita');
  const [visibleSeverities, setVisibleSeverities] = useState<Set<SeverityLevel>>(new Set(ALL_SEVERITIES));

  // Filter toggles
  const [showFloodLayer, setShowFloodLayer] = useState(true);
  const [showExtendedCoverage, setShowExtendedCoverage] = useState(false);
  const [showSignificantEvents, setShowSignificantEvents] = useState(false);
  const [showFloodProbability, setShowFloodProbability] = useState(false);
  const [showInundationHistory, setShowInundationHistory] = useState(false);

  const handleStationClick = useCallback((stationData: StationData) => {
    setSelectedStation(stationData);
    setPlaceInfo(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStation(null);
  }, []);

  const handleClosePlacePanel = useCallback(() => {
    setPlaceInfo(null);
  }, []);

  const handleToggleSeverity = useCallback((severity: SeverityLevel) => {
    setVisibleSeverities(prev => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }, []);

  const handleAlertClick = useCallback((lat: number, lon: number) => {
    mapRef.current?.flyTo(lat, lon, 8);
    setAlertPanelOpen(false);
  }, []);

  const handleToggleAlertPanel = useCallback(() => {
    setAlertPanelOpen(prev => !prev);
  }, []);

  const handlePlaceSelect = useCallback((result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    mapRef.current?.flyTo(lat, lon, 12);
    setSelectedStation(null);
    setPlaceInfo({
      name: result.display_name.split(',')[0],
      lat,
      lon,
    });
  }, []);

  // Find nearest station to a place (within 200km)
  const nearestStationToPlace = placeInfo && stations
    ? (() => {
        let nearest: StationData | null = null;
        let minDist = Infinity;
        for (const s of stations) {
          const dist = getDistanceKm(placeInfo.lat, placeInfo.lon, s.station.latitude, s.station.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearest = s;
          }
        }
        return minDist <= 200 ? nearest : null;
      })()
    : null;

  // When flood layer is off, hide all markers
  const effectiveVisibleSeverities = showFloodLayer ? visibleSeverities : new Set<SeverityLevel>();

  const showLeftStationPanel = selectedStation && !placeInfo;
  const showLeftPlacePanel = placeInfo && !selectedStation;

  return (
    <div className="flood-hub-app">
      <TopBar
        alertCount={alertFeeds.totalAlertCount}
        highestAlertLevel={alertFeeds.highestAlertLevel}
        onAlertClick={handleToggleAlertPanel}
        onPlaceSelect={handlePlaceSelect}
      />

      <div className="flood-hub-main">
        {/* Left panel - station detail */}
        <div className={`left-panel ${showLeftStationPanel ? 'left-panel-open' : 'left-panel-closed'}`}>
          {selectedStation && (
            <StationDetailPanel
              stationData={selectedStation}
              onClose={handleCloseDetail}
            />
          )}
        </div>

        {/* Left panel - place panel */}
        <div className={`left-panel ${showLeftPlacePanel ? 'left-panel-open' : 'left-panel-closed'}`}>
          {placeInfo && (
            <PlaceSidePanel
              placeName={placeInfo.name}
              lat={placeInfo.lat}
              lon={placeInfo.lon}
              nearestStation={nearestStationToPlace}
              onClose={handleClosePlacePanel}
            />
          )}
        </div>

        {/* Alert panel - left side */}
        <AlertPanel
          isOpen={alertPanelOpen}
          onClose={() => setAlertPanelOpen(false)}
          alerts={alertFeeds.allAlerts}
          isLoading={alertFeeds.isLoading}
          onAlertClick={handleAlertClick}
        />

        {/* Map area */}
        <div className="map-area">
          {isLoading ? (
            <div className="map-loading">
              <Loader2 className="animate-spin" size={32} />
              <p>Sel verileri yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="map-error">
              <p>Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.</p>
            </div>
          ) : (
            <FloodMapLeaflet
              ref={mapRef}
              stations={stations || []}
              selectedStationId={selectedStation?.station.id ?? null}
              onStationClick={handleStationClick}
              visibleSeverities={effectiveVisibleSeverities}
              mapType={mapType}
              onMapTypeChange={setMapType}
              gdacsAlerts={alertFeeds.gdacs}
              showAlertMarkers={showSignificantEvents}
              showExtendedCoverage={showExtendedCoverage}
              showFloodProbability={showFloodProbability}
              showInundationHistory={showInundationHistory}
            />
          )}
        </div>

        {/* Right panel - options */}
        <OptionsPanel
          isOpen={optionsPanelOpen}
          onToggle={() => setOptionsPanelOpen(!optionsPanelOpen)}
          visibleSeverities={visibleSeverities}
          onToggleSeverity={handleToggleSeverity}
          showFloodLayer={showFloodLayer}
          onToggleFloodLayer={setShowFloodLayer}
          showExtendedCoverage={showExtendedCoverage}
          onToggleExtendedCoverage={setShowExtendedCoverage}
          showSignificantEvents={showSignificantEvents}
          onToggleSignificantEvents={setShowSignificantEvents}
          showFloodProbability={showFloodProbability}
          onToggleFloodProbability={setShowFloodProbability}
          showInundationHistory={showInundationHistory}
          onToggleInundationHistory={setShowInundationHistory}
        />
      </div>

      <BottomWarningBar nearTurkeyHighAlerts={alertFeeds.nearTurkeyHighAlerts} />
    </div>
  );
}
