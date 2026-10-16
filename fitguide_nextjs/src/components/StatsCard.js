/**
 * Stats Card Component
 * Display metrics and statistics with icons
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
export const StatsCard = ({ icon, label, value, change, suffix, color = '#00C4B4', sparkline, }) => {
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
    return (<div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 hover:border-white-30/30 transition-all group">
      {/* Header: Icon and Change */}
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${color}20` }}>
          <div style={{ color }}>{icon}</div>
        </div>

        {/* Change Indicator */}
        {change !== undefined && (<div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-bold ${getTrendColor()}`}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
          </div>)}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-3xl font-extrabold text-white">
          {value}
        </span>
        {suffix && (<span className="text-lg font-bold text-white-50 ml-1">
            {suffix}
          </span>)}
      </div>

      {/* Label */}
      <p className="text-xs font-semibold text-white-50 uppercase tracking-wider">
        {label}
      </p>

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (<div className="mt-4 flex items-end gap-1 h-8">
          {sparkline.map((value, index) => (<div key={index} className="flex-1 rounded-sm transition-all hover:opacity-80" style={{
                    height: `${value}%`,
                    backgroundColor: `${color}60`,
                }}/>))}
        </div>)}
    </div>);
};
export const StatsBar = ({ stats }) => {
    return (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (<StatsCard key={index} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color}/>))}
    </div>);
};
