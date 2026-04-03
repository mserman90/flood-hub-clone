import { X, ExternalLink, MapPin } from 'lucide-react';
import {
  type GDACSAlert,
  type CAPAlert,
  type DisasterAlert,
  type GDACSAlertLevel,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  ALERT_LEVEL_COLORS,
  timeAgo,
} from '@/hooks/useAlertFeeds';

interface AlertPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: DisasterAlert[];
  isLoading: boolean;
  onAlertClick: (lat: number, lon: number) => void;
}

const ALERT_LEVEL_LABELS: Record<GDACSAlertLevel, string> = {
  Red: 'Yüksek Şiddet',
  Orange: 'Orta Şiddet',
  Green: 'Düşük Şiddet',
};

function isGDACSAlert(alert: DisasterAlert): alert is GDACSAlert {
  return alert.source === 'gdacs';
}

function GDACSAlertCard({
  alert,
  onAlertClick,
}: {
  alert: GDACSAlert;
  onAlertClick: (lat: number, lon: number) => void;
}) {
  const color = ALERT_LEVEL_COLORS[alert.alertLevel];
  const icon = EVENT_TYPE_ICONS[alert.eventType] ?? '⚠️';
  const typeLabel = EVENT_TYPE_LABELS[alert.eventType] ?? alert.eventType;

  return (
    <div
      className="alert-card"
      style={{ borderLeftColor: color }}
      onClick={() => onAlertClick(alert.latitude, alert.longitude)}
    >
      <div className="alert-card-header">
        <span className="alert-card-icon">{icon}</span>
        <span className="alert-card-type" style={{ color }}>
          {typeLabel}
        </span>
        <span className="alert-card-badge" style={{ background: color }}>
          {ALERT_LEVEL_LABELS[alert.alertLevel]}
        </span>
      </div>
      <div className="alert-card-title">{alert.name}</div>
      <div className="alert-card-meta">
        <span className="alert-card-country">
          <MapPin size={12} />
          {alert.country || 'Bilinmeyen konum'}
        </span>
        <span className="alert-card-time">{timeAgo(alert.fromDate)}</span>
      </div>
      {alert.severityText && (
        <div className="alert-card-severity">{alert.severityText}</div>
      )}
      {alert.reportUrl && (
        <a
          href={alert.reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="alert-card-link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
          Ayrıntılar
        </a>
      )}
    </div>
  );
}

function CAPAlertCard({
  alert,
  onAlertClick,
}: {
  alert: CAPAlert;
  onAlertClick: (lat: number, lon: number) => void;
}) {
  return (
    <div
      className="alert-card alert-card-cap"
      onClick={() => onAlertClick(alert.latitude, alert.longitude)}
    >
      <div className="alert-card-header">
        <span className="alert-card-icon">⚠️</span>
        <span className="alert-card-type" style={{ color: '#F57C00' }}>
          {alert.source === 'afad' ? 'AFAD' : 'TSMS'}
        </span>
      </div>
      <div className="alert-card-title">{alert.title}</div>
      <div className="alert-card-meta">
        <span className="alert-card-time">{timeAgo(alert.published)}</span>
      </div>
      {alert.link && (
        <a
          href={alert.link}
          target="_blank"
          rel="noopener noreferrer"
          className="alert-card-link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
          Ayrıntılar
        </a>
      )}
    </div>
  );
}

export function AlertPanel({
  isOpen,
  onClose,
  alerts,
  isLoading,
  onAlertClick,
}: AlertPanelProps) {
  const gdacsAlerts = alerts.filter(isGDACSAlert);
  const capAlerts = alerts.filter((a): a is CAPAlert => !isGDACSAlert(a));

  return (
    <div className={`alert-panel ${isOpen ? 'alert-panel-open' : 'alert-panel-closed'}`}>
      <div className="alert-panel-header">
        <span>Uyarılar</span>
        <span className="alert-panel-count">{alerts.length}</span>
        <button onClick={onClose} className="panel-close-btn" aria-label="Kapat">
          <X size={16} />
        </button>
      </div>

      <div className="alert-panel-content">
        {isLoading ? (
          <div className="alert-panel-loading">
            <div className="alert-spinner" />
            <span>Uyarılar yükleniyor...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="alert-panel-empty">
            <span>Aktif uyarı bulunamadı</span>
          </div>
        ) : (
          <>
            {gdacsAlerts.length > 0 && (
              <div className="alert-section">
                <h4 className="alert-section-title">GDACS Küresel Uyarılar</h4>
                {gdacsAlerts.map((alert) => (
                  <GDACSAlertCard
                    key={alert.id}
                    alert={alert}
                    onAlertClick={onAlertClick}
                  />
                ))}
              </div>
            )}
            {capAlerts.length > 0 && (
              <div className="alert-section">
                <h4 className="alert-section-title">Türkiye CAP Uyarıları</h4>
                {capAlerts.map((alert) => (
                  <CAPAlertCard
                    key={alert.id}
                    alert={alert}
                    onAlertClick={onAlertClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
