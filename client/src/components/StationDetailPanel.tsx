import { useState } from 'react';
import { X, MapPin, Info, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Hydrograph } from './Hydrograph';
import type { StationData, SeverityLevel } from '@/hooks/useMultiStationData';

interface StationDetailPanelProps {
  stationData: StationData;
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

const INUNDATION_LABELS: Record<string, string> = {
  available: 'Uyarı sırasında kullanılabilir',
  not_available: 'Desteklenmiyor',
  sometimes: 'Bazen',
};

export function StationDetailPanel({ stationData, onClose }: StationDetailPanelProps) {
  const { station, severity, currentDischarge, dailyData, thresholds } = stationData;
  const [thresholdsOpen, setThresholdsOpen] = useState(false);

  // Count days at each severity level from forecast
  const forecastDays = dailyData.filter(d => d.isForecast);
  const uyariCount = forecastDays.filter(d => d.mean >= thresholds.uyari && d.mean < thresholds.tehlike).length;
  const tehlikeCount = forecastDays.filter(d => d.mean >= thresholds.tehlike && d.mean < thresholds.asiri).length;
  const asiriCount = forecastDays.filter(d => d.mean >= thresholds.asiri).length;

  return (
    <div className="station-detail-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <MapPin size={18} color="#4CAF50" />
          <span className="panel-title">Nehir ile ilgili tahmin</span>
        </div>
        <button onClick={onClose} className="panel-close-btn" aria-label="Kapat">
          <X size={18} />
        </button>
      </div>

      {/* Info banner */}
      <div className="info-banner">
        <Info size={14} />
        <span>1 ay öncesine yakın nehir seviyesi</span>
      </div>

      {/* Hydrograph */}
      <div className="hydrograph-container">
        <Hydrograph
          dailyData={dailyData}
          thresholds={thresholds}
          currentDischarge={currentDischarge}
        />
      </div>

      {/* Severity summary */}
      <div className="severity-summary">
        <div className="severity-item">
          <span className="severity-dot" style={{ background: SEVERITY_COLORS.uyari }} />
          <span className="severity-label">Uyarı</span>
          <span className="severity-count">{uyariCount}</span>
        </div>
        <div className="severity-item">
          <span className="severity-dot" style={{ background: SEVERITY_COLORS.tehlike }} />
          <span className="severity-label">Tehlike</span>
          <span className="severity-count">{tehlikeCount}</span>
        </div>
        <div className="severity-item">
          <span className="severity-dot" style={{ background: SEVERITY_COLORS.asiri }} />
          <span className="severity-label">Aşırı</span>
          <span className="severity-count">{asiriCount}</span>
        </div>
      </div>

      {/* Station metadata */}
      <div className="station-metadata">
        <h4 className="metadata-title">Gösterge Bilgileri</h4>

        {/* Confidence badge */}
        <div className="confidence-badge-container">
          {station.confidence === 'high' ? (
            <div className="confidence-badge confidence-high">
              <CheckCircle size={14} />
              <span>Yüksek güvenilirlikli ölçüm</span>
            </div>
          ) : (
            <div className="confidence-badge confidence-low">
              <AlertCircle size={14} />
              <span>Düşük güvenilirlikli ölçüm</span>
            </div>
          )}
        </div>

        <div className="metadata-grid">
          <div className="metadata-row">
            <span className="metadata-key">Nehir ölçüm kimliği</span>
            <span className="metadata-value">{station.id}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Kaynak</span>
            <span className="metadata-value">{station.source}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Enlem</span>
            <span className="metadata-value">{station.latitude.toFixed(4)}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Boylam</span>
            <span className="metadata-value">{station.longitude.toFixed(4)}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Ölçüm istasyonu adı</span>
            <span className="metadata-value">{station.name}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Su baskını haritası</span>
            <span className="metadata-value">{INUNDATION_LABELS[station.inundationMapAvailable]}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Havza boyutu</span>
            <span className="metadata-value">
              {station.basinSize.toLocaleString('tr-TR')} km²
              <button
                className="basin-view-btn"
                title="Havza görüntüleme yakında eklenecek"
                onClick={() => alert('Havza görüntüleme yakında eklenecek')}
              >
                <Eye size={14} />
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Gauge Thresholds - Collapsible */}
      <div className="gauge-thresholds-section">
        <button
          className="gauge-thresholds-toggle"
          onClick={() => setThresholdsOpen(!thresholdsOpen)}
        >
          <span className="gauge-thresholds-title">Gösterge Eşikleri</span>
          {thresholdsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {thresholdsOpen && (
          <div className="gauge-thresholds-content">
            <div className="gauge-thresholds-unit">
              <span className="gauge-thresholds-unit-label">Ölçüm birimi</span>
              <span className="gauge-thresholds-unit-value">Debi m³/sn</span>
            </div>

            <div className="gauge-thresholds-grid">
              <div className="gauge-threshold-col">
                <span className="gauge-threshold-label" style={{ color: '#FF9800' }}>Uyarı seviyesi</span>
                <span className="gauge-threshold-value">{thresholds.uyari}</span>
              </div>
              <div className="gauge-threshold-col">
                <span className="gauge-threshold-label" style={{ color: '#F44336' }}>Tehlike seviyesi</span>
                <span className="gauge-threshold-value">{thresholds.tehlike}</span>
              </div>
              <div className="gauge-threshold-col">
                <span className="gauge-threshold-label" style={{ color: '#B71C1C' }}>Aşırı seviye</span>
                <span className="gauge-threshold-value">{thresholds.asiri}</span>
              </div>
            </div>

            {/* Colored bar */}
            <div className="gauge-thresholds-bar">
              <div className="gauge-bar-segment" style={{ background: '#FF9800' }} />
              <div className="gauge-bar-segment" style={{ background: '#F44336' }} />
              <div className="gauge-bar-segment" style={{ background: '#B71C1C' }} />
            </div>
          </div>
        )}
      </div>

      {/* Current status */}
      <div className="current-status">
        <div className="status-badge" style={{ background: SEVERITY_COLORS[severity] + '20', color: SEVERITY_COLORS[severity], borderColor: SEVERITY_COLORS[severity] }}>
          <span className="severity-dot" style={{ background: SEVERITY_COLORS[severity] }} />
          {SEVERITY_LABELS[severity]}
        </div>
        <div className="discharge-info">
          <span className="discharge-label">Mevcut debi</span>
          <span className="discharge-value">{currentDischarge.toFixed(1)} m³/sn</span>
        </div>
      </div>

      {/* Google alert link */}
      <div className="google-alert-link-section">
        <a href="#" className="google-alert-link">Google uyarısı</a>
      </div>

      {/* Disclaimer */}
      <div className="panel-disclaimer">
        <p>
          Bu bilgiler yalnızca bilgilendirme amaçlıdır. Tahminler, gerçek koşullardan farklılık gösterebilir.
          Resmi kaynaklara başvurun. Modeller ve veri kaynakları hakkında daha fazla bilgi edinin.
        </p>
        <a href="#" className="disclaimer-link">
          Modeller ve veri kaynakları hakkında daha fazla bilgi
        </a>
      </div>
    </div>
  );
}
