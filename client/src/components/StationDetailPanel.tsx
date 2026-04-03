import { X, MapPin, Info } from 'lucide-react';
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

export function StationDetailPanel({ stationData, onClose }: StationDetailPanelProps) {
  const { station, severity, currentDischarge, dailyData, thresholds } = stationData;

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
        <p className="metadata-note">Güven eşiğine sahip ölçüm tesisi</p>
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
            <span className="metadata-value">Desteklenmiyor</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Havza boyutu</span>
            <span className="metadata-value">{station.basinSize.toLocaleString('tr-TR')} km²</span>
          </div>
        </div>
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

      {/* Disclaimer */}
      <div className="panel-disclaimer">
        <p>
          Bu bilgiler yalnızca bilgilendirme amaçlıdır. Tahminler, gerçek koşullardan farklılık gösterebilir.
          Resmi uyarılar için yetkili kurumları takip edin.
        </p>
        <a href="#" className="disclaimer-link">
          Modeller ve veri kaynakları hakkında daha fazla bilgi
        </a>
      </div>
    </div>
  );
}
