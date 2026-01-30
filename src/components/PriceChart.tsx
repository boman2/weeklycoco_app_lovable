import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { priceHistory, stores, formatPrice } from '@/data/mockData';

interface PriceChartProps {
  productId: string;
  storeId?: string;
}

const PriceChart = ({ productId, storeId }: PriceChartProps) => {
  // Filter history for this product
  const history = priceHistory
    .filter((h) => h.productId === productId && (!storeId || h.storeId === storeId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">가격 기록이 없습니다</p>
      </div>
    );
  }

  // Group by date for multi-store view
  const chartData = storeId
    ? history.map((h) => ({
        date: h.date.slice(5), // MM-DD format
        price: h.price,
      }))
    : history.reduce((acc, h) => {
        const existing = acc.find((d) => d.date === h.date.slice(5));
        const store = stores.find((s) => s.id === h.storeId);
        if (existing) {
          existing[store?.nameKo || h.storeId] = h.price;
        } else {
          acc.push({
            date: h.date.slice(5),
            [store?.nameKo || h.storeId]: h.price,
          });
        }
        return acc;
      }, [] as any[]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg bg-card p-3 shadow-card-lg border border-border">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatPrice(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const colors = ['hsl(352, 85%, 48%)', 'hsl(220, 100%, 27%)', 'hsl(142, 71%, 45%)'];

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          {storeId ? (
            <Line
              type="monotone"
              dataKey="price"
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ) : (
            Object.keys(chartData[0] || {})
              .filter((k) => k !== 'date')
              .map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[i % colors.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
