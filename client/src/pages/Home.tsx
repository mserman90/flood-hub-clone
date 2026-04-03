import { useState, useEffect } from 'react';
import { FloodMap } from '@/components/FloodMap';
import { FloodDataPanel } from '@/components/FloodDataPanel';
import { WaterLevelChart } from '@/components/WaterLevelChart';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

export default function Home() {
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData[]>([]);

  useEffect(() => {
    // Generate mock data for the last 24 hours
    const now = new Date();
    const mockData: WaterLevelData[] = [];

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours().toString().padStart(2, '0');
      const baseLevel = 2.3 + Math.sin(i / 4) * 0.5;
      const forecast = baseLevel + 0.15 + Math.sin(i / 3) * 0.3;

      mockData.push({
        timestamp: `${hour}:00`,
        waterLevel: parseFloat(baseLevel.toFixed(2)),
        forecast: i < 12 ? undefined : parseFloat(forecast.toFixed(2)),
      });
    }

    setWaterLevelData(mockData);
  }, []);

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Data Information */}
          <div className="lg:col-span-1">
            <FloodDataPanel
              locationName="Ankara"
              currentWaterLevel={2.45}
              forecastedWaterLevel={2.60}
              riskLevel="low"
              lastUpdated={new Date()}
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

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-body text-sm text-blue-900">
            <strong>Bilgilendirme:</strong> Sel koşulları yaklaşıktır ve bilgilendirme amaçlıdır. 
            Daha fazla bilgi için resmi kaynakları kontrol edin. Bu sistem Google AI modelleri tarafından 
            sağlanan tahminleri kullanmaktadır.
          </p>
        </div>
      </main>
    </div>
  );
}
