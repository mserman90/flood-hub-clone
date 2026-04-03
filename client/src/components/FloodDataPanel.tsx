import { AlertTriangle, TrendingUp, Clock, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FloodDataPanelProps {
  locationName: string;
  currentWaterLevel: number;
  forecastedWaterLevel: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

const riskConfig = {
  low: { color: 'bg-green-50 border-green-200', icon: 'text-green-600', label: 'Düşük Risk', badge: 'risk-low' },
  medium: { color: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-600', label: 'Orta Risk', badge: 'risk-medium' },
  high: { color: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', label: 'Yüksek Risk', badge: 'risk-high' },
  critical: { color: 'bg-red-50 border-red-200', icon: 'text-red-600', label: 'Kritik Risk', badge: 'risk-critical' },
};

export function FloodDataPanel({
  locationName,
  currentWaterLevel,
  forecastedWaterLevel,
  riskLevel,
  lastUpdated,
}: FloodDataPanelProps) {
  const config = riskConfig[riskLevel];
  const waterLevelChange = forecastedWaterLevel - currentWaterLevel;
  const isRising = waterLevelChange > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Location Header */}
      <Card className="p-4 border-slate-200">
        <h2 className="font-display text-xl text-slate-900 mb-1">{locationName}</h2>
        <p className="font-body text-sm text-slate-600">Ankara, Türkiye</p>
      </Card>

      {/* Risk Level Alert */}
      <Card className={`p-4 border-2 ${config.color}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 ${config.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-slate-900">Sel Riski Durumu</p>
            <p className={`font-heading text-lg ${config.icon}`}>{config.label}</p>
          </div>
        </div>
      </Card>

      {/* Water Level Information */}
      <Card className="p-4 border-slate-200">
        <div className="space-y-4">
          <div>
            <p className="font-body text-xs text-slate-600 mb-1">Mevcut Su Seviyesi</p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-2xl text-blue-600">{currentWaterLevel.toFixed(2)}</p>
              <p className="font-body text-sm text-slate-600">metre</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="font-body text-xs text-slate-600 mb-1">Tahmin Edilen Su Seviyesi</p>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-lg text-slate-900">{forecastedWaterLevel.toFixed(2)}</p>
              <p className="font-body text-sm text-slate-600">metre</p>
              <div className={`flex items-center gap-1 ml-auto ${isRising ? 'text-red-600' : 'text-green-600'}`}>
                <TrendingUp className={`w-4 h-4 ${isRising ? '' : 'rotate-180'}`} />
                <span className="font-body text-sm">{Math.abs(waterLevelChange).toFixed(2)} m</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Last Updated */}
      <Card className="p-3 border-slate-200 flex items-center gap-2 bg-slate-50">
        <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-body text-xs text-slate-600">Son Güncelleme</p>
          <p className="font-body text-sm text-slate-900">{lastUpdated.toLocaleTimeString('tr-TR')}</p>
        </div>
      </Card>

      {/* Information Notice */}
      <Card className="p-3 border-slate-200 flex items-start gap-2 bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="font-body text-xs text-blue-900">
          Sel koşulları yaklaşıktır ve bilgilendirme amaçlıdır. Daha fazla bilgi için resmi kaynakları kontrol edin.
        </p>
      </Card>
    </div>
  );
}
