import { X, ChevronLeft, Info, RefreshCw } from 'lucide-react';
import type { SeverityLevel } from '@/hooks/useMultiStationData';

interface OptionsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
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
  showInundationHistory: boolean;
  onToggleInundationHistory: (val: boolean) => void;
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
  icon,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="toggle-switch-row">
      <span className="toggle-label">
        {label}
        {icon && <span className="toggle-label-icon">{icon}</span>}
      </span>
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
  showInundationHistory,
  onToggleInundationHistory,
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
          <span>Görüntüleme seçenekleri</span>
          <button onClick={onToggle} className="options-close-btn" aria-label="Kapat">
            <X size={16} />
          </button>
        </div>

        <div className="options-panel-content">
          {/* Flood layer toggle */}
          <div className="options-section">
            <ToggleSwitch
              checked={showFloodLayer}
              onChange={onToggleFloodLayer}
              label="Seller"
            />
          </div>

          {/* "Göstergeleri anlayın" section */}
          <div className="options-section">
            <h4 className="options-group-title">Göstergeleri anlayın</h4>

            {/* Gauge Legend */}
            <div className="options-subsection">
              <h5 className="options-section-title">Gösterge Lejantı</h5>
              <p className="options-subtitle">Nehir taşkınları - Beklenen önem düzeyi</p>
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

            {/* Additional Coverage */}
            <div className="options-subsection">
              <ToggleSwitch
                checked={showExtendedCoverage}
                onChange={onToggleExtendedCoverage}
                label="Ek kapsam"
                icon={
                  <span className="info-icon-tooltip" title="Etkinleştirildiğinde düşük güvenilirlikli göstergeler de haritada gösterilir.">
                    <Info size={14} />
                  </span>
                }
              />
              {showExtendedCoverage && (
                <p className="options-note">Düşük güvenilirlikli göstergeler</p>
              )}
            </div>
          </div>

          {/* "Katmanları keşfedin" section */}
          <div className="options-section">
            <h4 className="options-group-title">Katmanları keşfedin</h4>

            {/* Inundation Probability */}
            <div className="options-subsection">
              <ToggleSwitch
                checked={showFloodProbability}
                onChange={onToggleFloodProbability}
                label="Su baskını olasılığı"
              />
              {showFloodProbability && (
                <div className="inundation-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#1565C0' }} />
                    <span className="legend-label">Çok yüksek</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#42A5F5' }} />
                    <span className="legend-label">Yüksek</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#90CAF9' }} />
                    <span className="legend-label">Orta</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inundation History */}
            <div className="options-subsection">
              <ToggleSwitch
                checked={showInundationHistory}
                onChange={onToggleInundationHistory}
                label="Su baskını geçmişi"
                icon={<RefreshCw size={14} className="refresh-icon" />}
              />
              {showInundationHistory && (
                <div className="inundation-legend">
                  <p className="options-note">Koyu renk = daha sık su baskını</p>
                </div>
              )}
            </div>
          </div>

          {/* Significant events */}
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
        </div>
      </div>
    </>
  );
}
