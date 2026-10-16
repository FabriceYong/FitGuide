import React from 'react';
import { Footprints, Flame, Timer, MoreHorizontal } from 'lucide-react';
export const ProgressCard = () => {
    return (<div className="bg-obsidian-wave p-6 rounded-[24px] w-full text-left">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold tracking-widest text-white-70 uppercase">
          Progress
        </span>
        <button className="text-white-30 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5"/>
        </button>
      </div>

      <div className="text-4xl font-extrabold text-white mb-6">
        15,160
      </div>

      <div className="flex justify-center items-center gap-2 py-2">
        <CompactStat label="STEPS" value="5,440" progress={0.6} color="text-lime-light" strokeColor="#00C4B4" icon={Footprints}/>
        <CompactStat label="CALORIES" value="482" progress={0.8} color="text-royal-nebula" strokeColor="#3E25F5" icon={Flame}/>
        <CompactStat label="EXERCISES" value="57 MIN" progress={0.4} color="text-purple-400" strokeColor="#C084FC" icon={Timer}/>
      </div>
    </div>);
};
const CompactStat = ({ label, value, progress, color, strokeColor, icon: Icon }) => {
    const radius = 42; // Circle radius
    const stroke = 8; // Stroke width
    const normalizedRadius = radius - stroke / 2; // Adjust for stroke
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;
    const svgSize = (radius + stroke) * 2; // Total SVG size including stroke
    return (<div className="flex flex-col items-center justify-center select-none flex-1">
      {/* Radial Progress Circle */}
      <div className="relative flex items-center justify-center mb-2" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="transform -rotate-90">
          {/* Background Circle */}
          <circle stroke="rgba(255,255,255,0.06)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={svgSize / 2} cy={svgSize / 2}/>
          {/* Active Circle */}
          <circle stroke={strokeColor} fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" r={normalizedRadius} cx={svgSize / 2} cy={svgSize / 2} className="transition-all duration-500 ease-out"/>
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${color}`}>
          <Icon className="w-8 h-8"/>
        </div>
      </div>

      <span className="text-[10px] font-bold text-white-30 tracking-wider mb-1.5">
        {label}
      </span>
      <span className="text-base font-bold text-white leading-none text-center">
        {value}
      </span>
    </div>);
};
