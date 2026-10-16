/**
 * Enhanced Stats Card Component with Recharts
 * Professional, modern, and captivating data visualization
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
export const EnhancedStatsCard = ({ icon, label, value, change, suffix, color = '#00C4B4', data = [], chartType = 'area', target, comparison, }) => {
    // Transform data for Recharts
    const chartData = data.map((value, index) => ({
        index,
        value,
    }));
    const getTrendIcon = () => {
        if (change === undefined)
            return null;
        if (change > 0)
            return <TrendingUp className="w-4 h-4 text-green-400"/>;
        if (change < 0)
            return <TrendingDown className="w-4 h-4 text-red-400"/>;
        return <Minus className="w-4 h-4 text-white-50"/>;
    };
    const getTrendColor = () => {
        if (change === undefined)
            return 'text-white-50';
        if (change > 0)
            return 'text-green-400';
        if (change < 0)
            return 'text-red-400';
        return 'text-white-50';
    };
    const renderChart = () => {
        if (!data || data.length === 0)
            return null;
        const commonProps = {
            stroke: color,
            strokeWidth: 2,
            dot: false,
            animationDuration: 1000,
        };
        switch (chartType) {
            case 'area':
                return (<ResponsiveContainer width="100%" height={60}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" {...commonProps} fill={`url(#gradient-${label})`}/>
            </AreaChart>
          </ResponsiveContainer>);
            case 'line':
                return (<ResponsiveContainer width="100%" height={60}>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="value" {...commonProps}/>
            </LineChart>
          </ResponsiveContainer>);
            case 'bar':
                return (<ResponsiveContainer width="100%" height={60}>
            <BarChart data={chartData}>
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} opacity={0.8}/>
            </BarChart>
          </ResponsiveContainer>);
            default:
                return null;
        }
    };
    return (<div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 hover:border-white-30/30 hover:shadow-lg transition-all group relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 opacity-5" style={{
            background: `radial-gradient(circle at top right, ${color}, transparent 70%)`,
        }}/>

      <div className="relative z-10">
        {/* Header: Icon and Change */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg" style={{
            background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        }}>
            <div style={{ color }}>{icon}</div>
          </div>

          {/* Change Indicator */}
          {change !== undefined && (<div className="flex flex-col items-end">
              <div className="flex items-center gap-1 mb-1">
                {getTrendIcon()}
                <span className={`text-sm font-bold ${getTrendColor()}`}>
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              </div>
              {comparison && (<span className="text-[10px] text-white-30">
                  vs {comparison.label}
                </span>)}
            </div>)}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className="text-4xl font-extrabold text-white">
            {value}
          </span>
          {suffix && (<span className="text-xl font-bold text-white-50 ml-1">
              {suffix}
            </span>)}
        </div>

        {/* Label */}
        <p className="text-xs font-semibold text-white-50 uppercase tracking-wider mb-4">
          {label}
        </p>

        {/* Target Progress Bar (if target provided) */}
        {target && typeof value === 'number' && (<div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-white-30 uppercase">Progress</span>
              <span className="text-[10px] font-bold text-white-50">
                {Math.round((value / target) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-white-30/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{
                width: `${Math.min((value / target) * 100, 100)}%`,
                background: `linear-gradient(90deg, ${color}, ${color}CC)`,
            }}/>
            </div>
          </div>)}

        {/* Chart */}
        {data && data.length > 0 && (<div className="mt-4 -mx-2">
            {renderChart()}
          </div>)}
      </div>
    </div>);
};
export const WeeklyActivityCard = ({ data, color = '#00C4B4', title = 'Weekly Activity', }) => {
    return (<div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 hover:border-white-30/30 transition-all">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs text-white-50">Last 7 Days</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} opacity={0.8}/>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex justify-between mt-4">
        {data.map((item, index) => (<div key={index} className="text-center">
            <span className="text-xs text-white-50 font-medium block">
              {item.day}
            </span>
          </div>))}
      </div>
    </div>);
};
