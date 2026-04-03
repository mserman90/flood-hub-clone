import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface WaterLevelData {
  timestamp: string;
  waterLevel: number;
  forecast?: number;
}

interface WaterLevelChartProps {
  data: WaterLevelData[];
  title?: string;
}

export function WaterLevelChart({ data, title = 'Su Seviyesi Geçmişi' }: WaterLevelChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-body text-xs text-slate-600">{payload[0].payload.timestamp}</p>
          <p className="font-heading text-sm text-blue-600">
            {payload[0].value.toFixed(2)} m
          </p>
          {payload[1] && (
            <p className="font-heading text-sm text-orange-600">
              Tahmin: {payload[1].value.toFixed(2)} m
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 border-slate-200">
      <h3 className="font-heading text-lg text-slate-900 mb-4">{title}</h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="timestamp"
              stroke="#64748B"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#64748B"
              style={{ fontSize: '12px' }}
              label={{ value: 'Metre', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
              iconType="line"
            />
            <Area
              type="monotone"
              dataKey="waterLevel"
              stroke="#0066CC"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorWater)"
              name="Mevcut Su Seviyesi"
              isAnimationActive={true}
              animationDuration={1000}
            />
            {data.some(d => d.forecast !== undefined) && (
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorForecast)"
                name="Tahmin Edilen Su Seviyesi"
                isAnimationActive={true}
                animationDuration={1000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="font-body text-xs text-slate-600 mt-3">
        Grafik son 24 saatlik su seviyesi verilerini göstermektedir.
      </p>
    </Card>
  );
}
