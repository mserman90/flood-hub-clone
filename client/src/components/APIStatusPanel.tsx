/**
 * APIStatusPanel.tsx
 * Flood Hub tarafından kullanılan API'lerin sağlık durumunu ve limit bilgilerini gösteren bileşen
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';

interface APIStatus {
  name: string;
  apiId: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime: number;
  lastChecked: Date;
  rateLimit?: {
    remaining: number;
    limit: number;
    percentageUsed: number;
    resetTime?: Date;
  } | null;
  errorMessage?: string;
  uptime: number;
}

export function APIStatusPanel() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 60 seconds

  // tRPC query
  const { data: healthReport, isLoading, refetch } = trpc.apiHealth.getHealthReport.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✗';
      default:
        return '?';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saglikli';
      case 'degraded':
        return 'Yavaslaniyor';
      case 'down':
        return 'Calismiyordu';
      default:
        return 'Bilinmiyor';
    }
  };

  if (!healthReport?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Saglik Durumu</CardTitle>
          <CardDescription>Flood Hub tarafından kullanılan API'lerin durumu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { apis, summary, overallStatus } = healthReport.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Saglik Durumu</CardTitle>
          <CardDescription>Flood Hub tarafından kullanılan API'lerin durumu ve limit bilgileri</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Genel Durum */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Genel Durum</h3>
            <Badge className={`${getStatusColor(overallStatus)} border`}>
              {getStatusIcon(overallStatus)} {getStatusLabel(overallStatus)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-2 bg-muted rounded">
              <div className="text-muted-foreground">Toplam API</div>
              <div className="font-semibold">{summary.totalAPIs}</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="text-green-700">Saglikli</div>
              <div className="font-semibold text-green-900">{summary.healthyAPIs}</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="text-yellow-700">Yavaslaniyor</div>
              <div className="font-semibold text-yellow-900">{summary.degradedAPIs}</div>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <div className="text-red-700">Calismiyordu</div>
              <div className="font-semibold text-red-900">{summary.downAPIs}</div>
            </div>
          </div>
        </div>

        {/* API Detayları */}
        <div className="space-y-4">
          <h3 className="font-semibold">API Detaylari</h3>
          {apis.map((api: APIStatus) => (
            <div key={api.apiId} className="border rounded-lg p-4 space-y-3">
              {/* API Başlığı */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{api.name}</span>
                  <Badge className={`${getStatusColor(api.status)} border`}>
                    {getStatusIcon(api.status)} {getStatusLabel(api.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{api.responseTime}ms</div>
              </div>

              {/* Uptime */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-semibold">{api.uptime.toFixed(1)}%</span>
                </div>
                <Progress value={api.uptime} className="h-2" />
              </div>

              {/* Rate Limit */}
              {api.rateLimit && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate Limit</span>
                    <span className="font-semibold">
                      {api.rateLimit.remaining}/{api.rateLimit.limit}
                    </span>
                  </div>
                  <Progress value={100 - api.rateLimit.percentageUsed} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {api.rateLimit.percentageUsed.toFixed(1)}% kullanildi
                  </div>
                </div>
              )}

              {/* Hata Mesajı */}
              {api.errorMessage && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {api.errorMessage}
                </div>
              )}

              {/* Son Kontrol */}
              <div className="text-xs text-muted-foreground">
                Son kontrol: {new Date(api.lastChecked).toLocaleTimeString('tr-TR')}
              </div>
            </div>
          ))}
        </div>

        {/* Otomatik Yenileme Ayarları */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Otomatik Yenileme</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          {autoRefresh && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Yenileme Araligi</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value={30000}>30 saniye</option>
                <option value={60000}>1 dakika</option>
                <option value={300000}>5 dakika</option>
                <option value={600000}>10 dakika</option>
              </select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
