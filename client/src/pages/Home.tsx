import { useAuth } from "@/_core/hooks/useAuth";
import { FloodMap } from '@/components/FloodMap';
import { FloodDataPanel } from '@/components/FloodDataPanel';
import { WaterLevelChart } from '@/components/WaterLevelChart';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

export default function Home() {
  const { user } = useAuth();

  // Fetch flood data from tRPC backend
  const { data: floodData, isLoading, error } = trpc.flood.getAnkaraFloodData.useQuery();

  const waterLevelData: WaterLevelData[] = floodData?.data?.waterLevelHistory || [];
  const currentWaterLevel = floodData?.data?.currentWaterLevel || 2.45;
  const forecastedWaterLevel = floodData?.data?.forecastedWaterLevel || 2.60;
  const riskLevel = floodData?.data?.riskLevel || 'low';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl text-slate-900">Flood Hub</h1>
              <p className="font-body text-xs text-slate-600">Sel Tahmin Sistemi</p>
            </div>
          </div>
          <div className="font-body text-xs text-slate-600">
            <p>Ankara Bölgesi</p>
            <p>38.6253°N, 35.7123°E</p>
            {user && <p className="text-blue-600">Hoş geldiniz, {user.name}</p>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="font-body text-slate-600">Sel verileri yükleniyor...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Data Information */}
              <div className="lg:col-span-1">
                <FloodDataPanel
                  locationName="Ankara"
                  currentWaterLevel={currentWaterLevel}
                  forecastedWaterLevel={forecastedWaterLevel}
                  riskLevel={riskLevel as 'low' | 'medium' | 'high' | 'critical'}
                  lastUpdated={floodData?.data?.lastUpdated ? new Date(floodData.data.lastUpdated) : new Date()}
                />
              </div>

              {/* Center - Map */}
              <div className="lg:col-span-2">
                <FloodMap
                  latitude={38.625278384355575}
                  longitude={35.71231125704324}
                  zoom={6.6389999971389795}
                />
              </div>
            </div>

            {/* Bottom - Chart */}
            <div className="mt-6">
              <WaterLevelChart data={waterLevelData} title="Su Seviyesi Geçmişi (Son 24 Saat)" />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-body text-sm text-yellow-900">
                  <strong>Uyarı:</strong> Gerçek veriler yüklenemedi, mock veriler gösterilmektedir.
                </p>
              </div>
            )}

            {floodData?.data?.source === 'mock' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-body text-sm text-blue-900">
                  <strong>Bilgilendirme:</strong> Bu sistem şu anda demo amaçlı mock veriler kullanmaktadır.
                  Gerçek sel tahmin verileri için Open-Meteo API veya Google Flood Forecasting API entegrasyonu yapılabilir.
                </p>
              </div>
            )}

            {/* Footer Info */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-body text-sm text-blue-900">
                <strong>Bilgilendirme:</strong> Sel koşulları yaklaşıktır ve bilgilendirme amaçlıdır.
                Daha fazla bilgi için resmi kaynakları kontrol edin.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
