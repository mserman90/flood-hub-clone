/**
 * FloodAlertSubscribe.tsx
 * Bir bolge icin sel uyarisi aboneligi yoneten React bileseni.
 * Harita uzerindeki popup veya sidebar'da kullanilabilir.
 */

import { useEffect, useState } from 'react';
import { Bell, BellOff, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useFloodAlerts } from '../hooks/useFloodAlerts';
import type { RiskLevel } from '../services/notificationService';

interface FloodAlertSubscribeProps {
  regionId: string;
  regionName: string;
  currentRiskLevel?: RiskLevel;
  currentWaterLevel?: number;
  userId?: string;
  compact?: boolean; // Harita popup icin kucuk mod
}

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  low: {
    label: 'Dusuk Risk',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  medium: {
    label: 'Orta Risk',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  high: {
    label: 'Yuksek Risk',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  critical: {
    label: 'KRITIK RiSK',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
  },
};

export function FloodAlertSubscribe({
  regionId,
  regionName,
  currentRiskLevel = 'low',
  currentWaterLevel,
  userId,
  compact = false,
}: FloodAlertSubscribeProps) {
  const {
    isSupported,
    isPermissionDenied,
    isLoading,
    error,
    subscribeRegion,
    unsubscribeRegion,
    isSubscribedToRegion,
    clearError,
  } = useFloodAlerts();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const isSubscribed = isSubscribedToRegion(regionId);
  const riskConfig = RISK_CONFIG[currentRiskLevel];

  // Feedback mesajini 4 saniye sonra temizle
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleSubscribe = async () => {
    clearError();
    const result = await subscribeRegion(regionId, regionName, 'high', userId);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  const handleUnsubscribe = async () => {
    clearError();
    const result = await unsubscribeRegion(regionId);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 p-2">
        <BellOff className="w-4 h-4" />
        <span>Bu tarayici bildirimleri desteklemiyor</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {/* Risk seviyesi rozeti */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            riskConfig.bgColor
          } ${riskConfig.color} ${riskConfig.borderColor}`}
        >
          <AlertTriangle className="w-3 h-3" />
          {riskConfig.label}
          {currentWaterLevel && (
            <span className="ml-1 opacity-75">({currentWaterLevel.toFixed(2)}m)</span>
          )}
        </div>

        {/* Abone ol/iptal butonu */}
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading || isPermissionDenied}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isSubscribed
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isSubscribed ? (
            <BellOff className="w-3 h-3" />
          ) : (
            <Bell className="w-3 h-3" />
          )}
          {isLoading ? 'Lutfen bekleyin...' : isSubscribed ? 'Uyarilari kapat' : 'Uyari al'}
        </button>

        {/* Izin engellendi uyarisi */}
        {isPermissionDenied && (
          <p className="text-xs text-red-500">
            Bildirimler engellendi. Tarayici ayarlarindan izin verin.
          </p>
        )}

        {/* Geri bildirim */}
        {feedback && (
          <div
            className={`flex items-center gap-1 text-xs ${
              feedback.type === 'success' ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {feedback.message}
          </div>
        )}
      </div>
    );
  }

  // Tam genis mod (sidebar / panel icin)
  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Baslik */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          Sel Uyari Sistemi
        </h3>
        {isSubscribed && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            Aktif
          </span>
        )}
      </div>

      {/* Bolge bilgisi */}
      <div className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">{regionName}</span> bolgesindeki sel
        riski yukseldigi anda anlık bildirim al.
      </div>

      {/* Mevcut risk durumu */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
          riskConfig.bgColor
        } ${riskConfig.borderColor}`}
      >
        <AlertTriangle className={`w-4 h-4 ${riskConfig.color}`} />
        <div className="flex-1">
          <div className={`text-xs font-semibold ${riskConfig.color}`}>
            Mevcut Risk: {riskConfig.label}
          </div>
          {currentWaterLevel !== undefined && (
            <div className="text-xs text-gray-500 mt-0.5">
              Su seviyesi: {currentWaterLevel.toFixed(2)} m
            </div>
          )}
        </div>
      </div>

      {/* Bildirim izni engellendi */}
      {isPermissionDenied && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-600">
            <p className="font-medium">Bildirimler engellendi</p>
            <p className="mt-0.5 text-red-500">
              Tarayici ayarlari &gt; Site izinleri &gt; Bildirimler bolumunden izin verin.
            </p>
          </div>
        </div>
      )}

      {/* Hata mesaji */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-500" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Geri bildirim mesaji */}
      {feedback && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <p className="text-xs">{feedback.message}</p>
        </div>
      )}

      {/* Ana aksiyon butonu */}
      {!isPermissionDenied && (
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isSubscribed
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              : currentRiskLevel === 'critical'
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              : currentRiskLevel === 'high'
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Islem yapiliyor...</span>
            </>
          ) : isSubscribed ? (
            <>
              <BellOff className="w-4 h-4" />
              <span>Uyarilari Kapat</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>
                {currentRiskLevel === 'critical' || currentRiskLevel === 'high'
                  ? 'HEMEN ABONE OL'
                  : 'Uyari Al'}
              </span>
            </>
          )}
        </button>
      )}

      {/* Abonelik bilgi notu */}
      <p className="text-xs text-gray-400 text-center">
        Yuksek veya kritik risk seviyesinde bildirim alirsiniz.
        Tarayiciniz acikken calisir.
      </p>
    </div>
  );
}
