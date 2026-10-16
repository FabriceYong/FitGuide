import React from 'react';
import { Scale, Bed, Heart, Flame } from 'lucide-react';
export const ProgressTab = () => {
    const weeklyData = [
        { label: 'Mon', value: 0.4 },
        { label: 'Tue', value: 0.6 },
        { label: 'Wed', value: 0.8, isActive: true },
        { label: 'Thu', value: 0.3 },
        { label: 'Fri', value: 0.7 },
        { label: 'Sat', value: 0.5 },
        { label: 'Sun', value: 0.2 },
    ];
    const stats = [
        {
            title: 'Weight',
            value: '72 kg',
            subtitle: '-2.1%',
            icon: Scale,
            color: 'text-royal-nebula',
            accentColor: '#3E25F5',
            reinforce: true, // green text reinforcement
        },
        {
            title: 'Sleep',
            value: '7h 30m',
            subtitle: '+5%',
            icon: Bed,
            color: 'text-purple-400',
            accentColor: '#C084FC',
            reinforce: false,
        },
        {
            title: 'Heart Rate',
            value: '72 bpm',
            subtitle: 'Avg',
            icon: Heart,
            color: 'text-red-400',
            accentColor: '#F87171',
            reinforce: true,
        },
        {
            title: 'Calories',
            value: '2,400',
            subtitle: 'Daily',
            icon: Flame,
            color: 'text-orange-400',
            accentColor: '#FB923C',
            reinforce: false,
        },
    ];
    return (<div className="space-y-8 pb-10 text-left">
      {/* Title */}
      <h1 className="text-3xl font-extrabold text-white">Your Progress</h1>

      {/* Weekly Activity Chart Container */}
      <div className="bg-obsidian-wave p-6 rounded-[24px] w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-base font-bold text-white leading-none">
            Weekly Activity
          </h2>
          <span className="text-xs text-white-30">Last 7 Days</span>
        </div>

        {/* Custom Bar Chart */}
        <div className="flex justify-between items-end h-40 px-2">
          {weeklyData.map((data, index) => (<div key={index} className="flex flex-col items-center flex-1">
              <div className="w-3.5 rounded-full transition-all duration-500 ease-out" style={{
                height: `${data.value * 120}px`,
                backgroundColor: data.isActive ? '#00C4B4' : 'rgba(255,255,255,0.08)',
                boxShadow: data.isActive ? '0 0 10px rgba(0, 196, 180,0.3)' : 'none',
            }}></div>
              <span className={`text-[11px] mt-3 font-medium transition-colors ${data.isActive ? 'text-white font-bold' : 'text-white-30'}`}>
                {data.label}
              </span>
            </div>))}
        </div>
      </div>

      {/* Statistics Header */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Statistics</h2>

        {/* Stats Grid: 2 columns on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (<div key={index} className="bg-obsidian-wave p-4 rounded-[20px] flex flex-col justify-between h-32 text-left border border-white-30/10">
                {/* Top Row */}
                <div className="flex justify-between items-start w-full">
                  <div className={`p-1.5 rounded-lg bg-noir-eclipse ${stat.color}`}>
                    <Icon className="w-5 h-5"/>
                  </div>
                  <span className={`text-[10px] font-bold ${stat.reinforce
                    ? 'text-emerald-400'
                    : 'text-white-30'}`}>
                    {stat.subtitle}
                  </span>
                </div>

                {/* Bottom Text */}
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-white leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-xs text-white-70">
                    {stat.title}
                  </div>
                </div>
              </div>);
        })}
        </div>
      </div>
    </div>);
};
