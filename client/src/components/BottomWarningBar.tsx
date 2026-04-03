import { AlertTriangle } from 'lucide-react';
import {
  type GDACSAlert,
  EVENT_TYPE_LABELS,
  ALERT_LEVEL_COLORS,
} from '@/hooks/useAlertFeeds';

interface BottomWarningBarProps {
  nearTurkeyHighAlerts?: GDACSAlert[];
}

export function BottomWarningBar({ nearTurkeyHighAlerts = [] }: BottomWarningBarProps) {
  const hasSpecificAlerts = nearTurkeyHighAlerts.length > 0;

  if (hasSpecificAlerts) {
    const redAlerts = nearTurkeyHighAlerts.filter((a) => a.alertLevel === 'Red');
    const isRed = redAlerts.length > 0;
    const bgColor = isRed ? '#c62828' : '#e65100';

    // Summarize alert types
    const typeCounts = new Map<string, number>();
    nearTurkeyHighAlerts.forEach((a) => {
      const label = EVENT_TYPE_LABELS[a.eventType] ?? a.eventType;
      typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
    });
    const summary = Array.from(typeCounts.entries())
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return (
      <div className="bottom-warning-bar" style={{ background: bgColor }}>
        <AlertTriangle size={16} />
        <span>
          <strong>Dikkat:</strong> Türkiye yakınında {nearTurkeyHighAlerts.length} aktif{' '}
          {isRed ? 'yüksek şiddetli' : 'orta şiddetli'} afet uyarısı bulunmaktadır ({summary}).
          Güncel bilgiler için GDACS uyarılarını kontrol edin.
        </span>
      </div>
    );
  }

  return (
    <div className="bottom-warning-bar">
      <AlertTriangle size={16} />
      <span>
        Önemli uyarı: Bu görünüm, güven eşiği düzeyleri farklı olan ölçüm tesislerini içerir.
        Tahminlerin doğruluğu konuma ve zaman dilimine göre değişiklik gösterebilir.
      </span>
    </div>
  );
}
