import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer } from 'recharts';

/** A headline number with an optional sparkline. */
export function StatCard({
  icon,
  label,
  value,
  suffix,
  footnote,
  color = '#00C4B4',
  data = [],
  chartType = 'area',
  chartLabel,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  footnote?: string;
  color?: string;
  data?: number[];
  chartType?: 'area' | 'line' | 'bar';
  /** Describes the sparkline for screen readers. */
  chartLabel?: string;
}) {
  const chartData = data.map((v, index) => ({ index, value: v }));
  const gradientId = `stat-${label.replace(/\W+/g, '-')}`;
  const showChart = data.some((v) => v > 0);
  return (
    <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4" style={{ background: `${color}20`, color }} aria-hidden="true">
          {icon}
        </div>
        <p className="text-3xl sm:text-4xl font-extrabold text-white">
          {value}
          {suffix && <span className="text-base sm:text-lg font-bold text-white-70 ml-1">{suffix}</span>}
        </p>
        <p className="text-xs font-semibold text-white-70 uppercase tracking-wider mt-1">{label}</p>
        {footnote && <p className="text-xs text-white-70 mt-1">{footnote}</p>}
        {showChart && (
          <div className="mt-4 -mx-2 h-[60px]" role="img" aria-label={chartLabel || `${label} trend`}>
            <ResponsiveContainer width="100%" height={60}>
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} opacity={0.8} isAnimationActive={false} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
