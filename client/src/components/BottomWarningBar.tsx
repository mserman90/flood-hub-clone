import { AlertTriangle } from 'lucide-react';

export function BottomWarningBar() {
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
