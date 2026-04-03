import { X, MapPin, Navigation } from 'lucide-react';
import { Hydrograph } from './Hydrograph';
import type { StationData, SeverityLevel } from '@/hooks/useMultiStationData';

interface PlaceSidePanelProps {
  placeName: string;
  nearestStation: StationData | null;
  onClose: () => void;
}

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  normal: 'Normal',
  uyari: 'Uyarı',
  tehlike: 'Tehlike',
  asiri: 'Aşırı',
  veri_yok: 'Veri yok',
};

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  normal: '#4CAF50',
  uyari: '#FF9800',
  tehlike: '#F44336',
  asiri: '#B71C1C',
  veri_yok: '#9E9E9E',
};

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

export function PlaceSidePanel({ placeName, nearestStation, onClose }: PlaceSidePanelProps) {
  return (
    <div className="place-side-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Navigation size={18} color="#1a73e8" />
          <span className="panel-title">{placeName}</span>
        </div>
        <button onClick={onClose} className="panel-close-btn" aria-label="Kapat">
          <X size={18} />
        </button>
      </div>

      {/* Nearest gauge section */}
      <div className="place-section">
        <h4 className="place-section-title">
          <MapPin size={16} color="#5f6368" />
          En yakın nehir ölçüm istasyonu
        </h4>

        {nearestStation ? (
          <>
            <div className="place-station-info">
              <div className="place-station-name">{nearestStation.station.name}</div>
              <div className="place-station-distance">
                {getDistanceKm(
                  parseFloat(nearestStation.station.latitude.toString()),
                  parseFloat(nearestStation.station.longitude.toString()),
                  0, 0
                ) > 0
                  ? `~${Math.round(
                      getDistanceKm(
                        parseFloat(nearestStation.station.latitude.toString()),
                        parseFloat(nearestStation.station.longitude.toString()),
                        0,
                        0
                      )
                    )} km uzaklıkta`
                  : ''}
              </div>
              <div className="place-station-severity">
                <span
                  className="severity-dot"
                  style={{ background: SEVERITY_COLORS[nearestStation.severity] }}
                />
                <span>{SEVERITY_LABELS[nearestStation.severity]}</span>
              </div>
            </div>

            {/* Hydrograph for nearest station */}
            <div className="hydrograph-container">
              <Hydrograph
                dailyData={nearestStation.dailyData}
                thresholds={nearestStation.thresholds}
                currentDischarge={nearestStation.currentDischarge}
              />
            </div>

            <div className="place-discharge-info">
              <span className="discharge-label">Mevcut debi</span>
              <span className="discharge-value">
                {nearestStation.currentDischarge.toFixed(1)} m³/sn
              </span>
            </div>
          </>
        ) : (
          <div className="place-no-data">
            <p>Bu konum için ölçüm verisi mevcut değil</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="panel-disclaimer">
        <p>
          Bu bilgiler yalnızca bilgilendirme amaçlıdır. Resmi kaynaklara başvurun.
        </p>
      </div>
    </div>
  );
}
