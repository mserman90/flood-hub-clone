import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
} from 'recharts';
import type { DailyDischarge } from '@/hooks/useMultiStationData';

interface HydrographProps {
  dailyData: DailyDischarge[];
  thresholds: {
    uyari: number;
    tehlike: number;
    asiri: number;
  };
  currentDischarge: number;
}

export function Hydrograph({ dailyData, thresholds, currentDischarge }: HydrographProps) {
  if (dailyData.length === 0) {
    return (
      <div className="hydrograph-empty">
        <p>Bu istasyon için veri bulunamadı</p>
      </div>
    );
  }

  // Find today's index for the "Now" line
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = dailyData.find(d => d.date === today)?.date;

  // Format data for chart
  const chartData = dailyData.map(d => {
    const date = new Date(d.date);
    const label = `${date.getDate()}/${date.getMonth() + 1}`;
    return {
      date: d.date,
      label,
      historical: !d.isForecast ? d.mean : undefined,
      forecast: d.isForecast ? d.mean : undefined,
      // Connect forecast to last historical point
      forecastConnect: d.date === today ? d.mean : (d.isForecast ? d.mean : undefined),
      max: d.max,
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const value = data.historical ?? data.forecast ?? data.forecastConnect;
    const isForecast = data.forecast !== undefined;

    return (
      <div className="hydrograph-tooltip">
        <p className="tooltip-date">{formattedDate}</p>
        <p className="tooltip-value">
          Debi: <strong>{value?.toFixed(1)} m³/sn</strong>
        </p>
        {isForecast && <p className="tooltip-forecast-label">Tahmin</p>}
      </div>
    );
  };

  // Calculate Y-axis domain
  const allValues = dailyData.map(d => Math.max(d.mean, d.max));
  const maxValue = Math.max(...allValues, thresholds.asiri * 1.1);
  const yMax = Math.ceil(maxValue / 10) * 10;

  return (
    <div className="hydrograph-chart">
      <div className="hydrograph-ylabel">Debi (m³/sn)</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1976D2" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1976D2" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="label"
            stroke="#666"
            fontSize={10}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            stroke="#666"
            fontSize={10}
            tickLine={false}
            domain={[0, yMax]}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Threshold lines */}
          <ReferenceLine
            y={thresholds.uyari}
            stroke="#FF9800"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: 'Uyarı', position: 'right', fill: '#FF9800', fontSize: 10 }}
          />
          <ReferenceLine
            y={thresholds.tehlike}
            stroke="#F44336"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: 'Tehlike', position: 'right', fill: '#F44336', fontSize: 10 }}
          />
          <ReferenceLine
            y={thresholds.asiri}
            stroke="#B71C1C"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: 'Aşırı', position: 'right', fill: '#B71C1C', fontSize: 10 }}
          />

          {/* "Now" vertical line */}
          {todayLabel && (
            <ReferenceLine
              x={chartData.find(d => d.date === todayLabel)?.label}
              stroke="#333"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Şu an', position: 'top', fill: '#333', fontSize: 10, fontWeight: 600 }}
            />
          )}

          {/* Historical area */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke="none"
            fill="url(#historicalGradient)"
            connectNulls={false}
          />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke="#1976D2"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />

          {/* Forecast line (dashed) */}
          <Line
            type="monotone"
            dataKey="forecastConnect"
            stroke="#1976D2"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
