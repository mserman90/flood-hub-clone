import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Droplets, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FloodMapProps {
  latitude: number;
  longitude: number;
  zoom: number;
  onLocationChange?: (lat: number, lng: number) => void;
}

export function FloodMap({ latitude, longitude, zoom, onLocationChange }: FloodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;
    setIsLoading(false);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      <Card className="flex-1 overflow-hidden relative bg-gradient-to-br from-blue-50 to-slate-100">
        <div
          ref={mapContainer}
          className="w-full h-full relative flex items-center justify-center"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600">Harita yükleniyor...</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white/50">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663051179312/RR6t4xZCHdXAFRgtVyuVyp/flood-map-hero-jztPm7yMmYPwtpgUJ5SNSg.webp"
                alt="Harita Arka Planı"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <MapPin className="w-12 h-12 text-blue-600" />
                <div className="text-center">
                  <p className="font-heading text-lg text-slate-900">Ankara Bölgesi</p>
                  <p className="font-body text-sm text-slate-600">
                    {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 flex items-center gap-2 bg-blue-50 border-blue-200">
          <Droplets className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-body text-xs text-slate-600">Su Seviyesi</p>
            <p className="font-heading text-sm text-blue-900">2.45 m</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2 bg-green-50 border-green-200">
          <div className="w-5 h-5 rounded-full bg-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-body text-xs text-slate-600">Risk Seviyesi</p>
            <p className="font-heading text-sm text-green-900">Düşük</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2 bg-slate-50 border-slate-200">
          <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-body text-xs text-slate-600">Güncelleme</p>
            <p className="font-heading text-sm text-slate-900">Şimdi</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
