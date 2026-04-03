import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { SeverityLevel } from '@/hooks/useMultiStationData';

interface OptionsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  mapType: 'harita' | 'karma';
  onMapTypeChange: (type: 'harita' | 'karma') => void;
  visibleSeverities: Set<SeverityLevel>;
  onToggleSeverity: (severity: SeverityLevel) => void;
  showFloodLayer: boolean;
  onToggleFloodLayer: (val: boolean) => void;
  showExtendedCoverage: boolean;
  onToggleExtendedCoverage: (val: boolean) => void;
  showSignificantEvents: boolean;
  onToggleSignificantEvents: (val: boolean) => void;
  showFloodProbability: boolean;
  onToggleFloodProbability: (val: boolean) => void;
}

const SEVERITY_CONFIG: { key: SeverityLevel; label: string; color: string }[] = [
  { key: 'asiri', label: 'Aşırı', color: '#B71C1C' },
  { key: 'tehlike', label: 'Tehlike', color: '#F44336' },
  { key: 'uyari', label: 'Uyarı', color: '#FF9800' },
  { key: 'veri_yok', label: 'Veri yok', color: '#9E9E9E' },
  { key: 'normal', label: 'Normal', color: '#4CAF50' },
];

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-switch-row">
      <span className="toggle-label">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? 'toggle-on' : 'toggle-off'}`}
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  );
}

export function OptionsPanel({
  isOpen,
  onToggle,
  mapType,
  onMapTypeChange,
  visibleSeverities,
  onToggleSeverity,
  showFloodLayer,
  onToggleFloodLayer,
  showExtendedCoverage,
  onToggleExtendedCoverage,
  showSignificantEvents,
  onToggleSignificantEvents,
  showFloodProbability,
  onToggleFloodProbability,
}: OptionsPanelProps) {
  return (
    <>
      {/* Toggle button (always visible) */}
      {!isOpen && (
        <button className="options-toggle-btn" onClick={onToggle}>
          <ChevronLeft size={16} />
          <span>Seçenekleri göster</span>
        </button>
      )}

      {/* Panel */}
      <div className={`options-panel ${isOpen ? 'options-panel-open' : 'options-panel-closed'}`}>
        <div className="options-panel-header">
          <span>Seçenekleri göster</span>
          <button onClick={onToggle} className="options-close-btn" aria-label="Kapat">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="options-panel-content">
          {/* Map type toggle */}
          <div className="options-section">
            <div className="map-type-toggle">
              <button
                className={`map-type-btn ${mapType === 'harita' ? 'map-type-active' : ''}`}
                onClick={() => onMapTypeChange('harita')}
              >
                Harita
              </button>
              <button
                className={`map-type-btn ${mapType === 'karma' ? 'map-type-active' : ''}`}
                onClick={() => onMapTypeChange('karma')}
              >
                Karma
              </button>
            </div>
          </div>

          {/* Flood layer toggle */}
          <div className="options-section">
            <ToggleSwitch
              checked={showFloodLayer}
              onChange={onToggleFloodLayer}
              label="Seller"
            />
          </div>

          {/* Severity legend */}
          <div className="options-section">
            <h4 className="options-section-title">Nehir taşkınları - Beklenen önem düzeyi</h4>
            <div className="severity-legend">
              {SEVERITY_CONFIG.map(item => {
                const isToggleable = item.key === 'veri_yok' || item.key === 'normal';
                return (
                  <div key={item.key} className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ background: item.color }}
                    />
                    <span className="legend-label">{item.label}</span>
                    {isToggleable && (
                      <button
                        role="switch"
                        aria-checked={visibleSeverities.has(item.key)}
                        onClick={() => onToggleSeverity(item.key)}
                        className={`toggle-switch toggle-small ${visibleSeverities.has(item.key) ? 'toggle-on' : 'toggle-off'}`}
                      >
                        <span className="toggle-thumb" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* City floods section */}
          <div className="options-section">
            <h4 className="options-section-title">Şehirlerde su baskınları <span className="beta-badge">Beta</span></h4>
            <p className="options-subtitle">24 saat içinde</p>
            <div className="city-flood-legend">
              <div className="legend-item">
                <span className="legend-square" style={{ background: '#F44336' }} />
                <span className="legend-label">Çok yüksek olasılıkla</span>
              </div>
              <div className="legend-item">
                <span className="legend-square" style={{ background: '#FF9800' }} />
                <span className="legend-label">Yüksek olasılıkla</span>
              </div>
            </div>
          </div>

          {/* Additional toggles */}
          <div className="options-section">
            <ToggleSwitch
              checked={showExtendedCoverage}
              onChange={onToggleExtendedCoverage}
              label="Genişletilmiş kapsam"
            />
            <p className="options-note">Düşük güven eşiğine sahip ölçüm tesisleri</p>
          </div>

          <div className="options-section">
            <ToggleSwitch
              checked={showSignificantEvents}
              onChange={onToggleSignificantEvents}
              label="Önemli sel olayları"
            />
            <div className="legend-item" style={{ marginTop: '4px' }}>
              <span className="legend-dot" style={{ background: '#E91E63' }} />
              <span className="legend-label">Etkinlik mevcut</span>
            </div>
          </div>

          <div className="options-section">
            <ToggleSwitch
              checked={showFloodProbability}
              onChange={onToggleFloodProbability}
              label="Sel olasılığı"
            />
          </div>
        </div>
      </div>
    </>
  );
}
