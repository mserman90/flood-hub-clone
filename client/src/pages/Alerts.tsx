/**
 * Alerts.tsx
 * Sel uyari yonetim sayfasi.
 * Kullanici abone oldugu bolgeleri gorur, yeni bolge ekler/cikarir.
 * Rota: /alerts
 */

import { Bell, BellOff, AlertTriangle, MapPin, RefreshCw, Trash2, Shield } from 'lucide-react';
import { FloodAlertSubscribe } from '../components/FloodAlertSubscribe';
import { useFloodAlerts } from '../hooks/useFloodAlerts';
import type { RiskLevel } from '../services/notificationService';
import { DEFAULT_MONITORED_REGIONS } from '../../server/jobs/floodRiskJob';

// Ornek olarak frontend sabitleri kullan (server import yerine)
const MONITORED_REGIONS = [
  { id: 'ankara-cubuk', name: 'Cubuk Cayi (Ankara)', latitude: 40.2316, longitude: 33.0302 },
  { id: 'istanbul-kagithane', name: 'Kagithane Deresi (Istanbul)', latitude: 41.0736, longitude: 28.9778 },
  { id: 'izmir-bornova', name: 'Bornova Cayi (Izmir)', latitude: 38.4681, longitude: 27.2195 },
  { id: 'samsun-mert', name: 'Mert Irmağı (Samsun)', latitude: 41.2869, longitude: 36.3300 },
  { id: 'rize-firtina', name: 'Fırtına Deresi (Rize)', latitude: 41.0500, longitude: 40.9800 },
  { id: 'kastamonu-ezine', name: 'Ezine Cayi (Kastamonu)', latitude: 41.3760, longitude: 33.7760 },
];

const RISK_BADGE: Record<RiskLevel, { label: string; cls: string }> = {
  low: { label: 'Dusuk', cls: 'bg-green-100 text-green-700' },
  medium: { label: 'Orta', cls: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Yuksek', cls: 'bg-orange-100 text-orange-700' },
  critical: { label: 'KRITIK', cls: 'bg-red-100 text-red-700 font-bold animate-pulse' },
};

export default function Alerts() {
  const {
    isSupported,
    isPermissionGranted,
    isPermissionDenied,
    subscribedRegions,
    hasActiveSubscription,
    unsubscribeRegion,
    unsubscribeAll,
    isLoading,
  } = useFloodAlerts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sel Uyari Sistemi</h1>
              <p className="text-xs text-gray-500">Bolge bazli anlık push bildirimleri</p>
            </div>
          </div>

          {/* Genel durum rozeti */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              !isSupported
                ? 'bg-gray-100 text-gray-500 border-gray-200'
                : isPermissionDenied
                ? 'bg-red-50 text-red-600 border-red-200'
                : hasActiveSubscription
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {!isSupported ? (
              <>
                <BellOff className="w-3 h-3" />
                Desteklenmiyor
              </>
            ) : isPermissionDenied ? (
              <>
                <BellOff className="w-3 h-3" />
                Izin Engellendi
              </>
            ) : hasActiveSubscription ? (
              <>
                <Bell className="w-3 h-3" />
                {subscribedRegions.length} Bolge Aktif
              </>
            ) : (
              <>
                <Bell className="w-3 h-3" />
                Abone Yok
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 flex flex-col gap-6">
        {/* Bildirim izni engellendi uyarisi */}
        {isPermissionDenied && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Bildirimler Engellendi</p>
              <p className="text-xs text-red-600 mt-1">
                Tarayici ayarlari &gt; Site izinleri &gt; Bildirimler bolumunden bu site icin izin verin.
                Ardından sayfayi yenileyin.
              </p>
            </div>
          </div>
        )}

        {/* Mevcut abonelikler */}
        {subscribedRegions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Aktif Abonelikler ({subscribedRegions.length})
              </h2>
              <button
                onClick={unsubscribeAll}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tum abonelikleri kaldir
              </button>
            </div>

            <div className="grid gap-3">
              {subscribedRegions.map((region) => (
                <div
                  key={region.regionId}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{region.regionName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(region.subscribedAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })} tarihinden itibaren
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => unsubscribeRegion(region.regionId)}
                    disabled={isLoading}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Aboneligi kaldir"
                  >
                    <BellOff className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tum bolgeler listesi */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Izlenebilir Bolgeler
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            {MONITORED_REGIONS.map((region) => (
              <FloodAlertSubscribe
                key={region.id}
                regionId={region.id}
                regionName={region.name}
                currentRiskLevel="low"
              />
            ))}
          </div>
        </section>

        {/* Sistem bilgisi */}
        <section className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800">Uyari Sistemi Hakkinda</h3>
              <ul className="mt-2 space-y-1 text-xs text-blue-700">
                <li>Her 15 dakikada bir bolge risk seviyeleri kontrol edilir.</li>
                <li>Risk seviyesi Yuksek veya Kritik seviyeye ciktiginda anlık bildirim gonderilir.</li>
                <li>Bildirimler, tarayiciniz acikken arka planda calisan Service Worker ile iletilir.</li>
                <li>Abonelikleriniz cihazinizda guvenli sekilde saklanir.</li>
                <li>Veri kaynagi: Open-Meteo GloFAS / TATUS (simulasyon modunda)</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
