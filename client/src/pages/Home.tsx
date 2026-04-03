import { useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { FloodMapLeaflet } from '@/components/FloodMapLeaflet';
import { StationDetailPanel } from '@/components/StationDetailPanel';
import { OptionsPanel } from '@/components/OptionsPanel';
import { BottomWarningBar } from '@/components/BottomWarningBar';
import { useMultiStationData, type StationData, type SeverityLevel } from '@/hooks/useMultiStationData';
import { Loader2 } from 'lucide-react';

const ALL_SEVERITIES = new Set<SeverityLevel>(['normal', 'uyari', 'tehlike', 'asiri', 'veri_yok']);

export default function Home() {
  const { data: stations, isLoading, error } = useMultiStationData();

  // Panel state
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [optionsPanelOpen, setOptionsPanelOpen] = useState(false);

  // Map state
  const [mapType, setMapType] = useState<'harita' | 'karma'>('harita');
  const [visibleSeverities, setVisibleSeverities] = useState<Set<SeverityLevel>>(new Set(ALL_SEVERITIES));

  // Filter toggles
  const [showFloodLayer, setShowFloodLayer] = useState(true);
  const [showExtendedCoverage, setShowExtendedCoverage] = useState(false);
  const [showSignificantEvents, setShowSignificantEvents] = useState(false);
  const [showFloodProbability, setShowFloodProbability] = useState(false);

  const handleStationClick = useCallback((stationData: StationData) => {
    setSelectedStation(stationData);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStation(null);
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

  // When flood layer is off, hide all markers
  const effectiveVisibleSeverities = showFloodLayer ? visibleSeverities : new Set<SeverityLevel>();

  return (
    <div className="flood-hub-app">
      <TopBar />

      <div className="flood-hub-main">
        {/* Left panel - station detail */}
        <div className={`left-panel ${selectedStation ? 'left-panel-open' : 'left-panel-closed'}`}>
          {selectedStation && (
            <StationDetailPanel
              stationData={selectedStation}
              onClose={handleCloseDetail}
            />
          )}
        </div>

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
              stations={stations || []}
              selectedStationId={selectedStation?.station.id ?? null}
              onStationClick={handleStationClick}
              visibleSeverities={effectiveVisibleSeverities}
              mapType={mapType}
            />
          )}
        </div>

        {/* Right panel - options */}
        <OptionsPanel
          isOpen={optionsPanelOpen}
          onToggle={() => setOptionsPanelOpen(!optionsPanelOpen)}
          mapType={mapType}
          onMapTypeChange={setMapType}
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
        />
      </div>

      <BottomWarningBar />
    </div>
  );
}
