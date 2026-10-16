'use client';

import React, { useState } from 'react';
import { Target, RotateCcw } from 'lucide-react';
export const BodyMap = ({ selectedMuscles, onToggleMuscle, onClear, }) => {
    const [view, setView] = useState('front');
    const isSelected = (muscle) => selectedMuscles.includes(muscle);
    // Returns inline style props for SVG path elements — Tailwind classes don't
    // work reliably for SVG fill/stroke, so we use inline styles instead.
    const getPathProps = (muscle) => {
        const selected = isSelected(muscle);
        return {
            onClick: () => onToggleMuscle(muscle),
            style: {
                fill: selected ? '#00C4B4' : 'rgba(255,255,255,0.12)',
                stroke: selected ? '#0d0d0d' : 'rgba(255,255,255,0.25)',
                strokeWidth: selected ? 1.5 : 1,
                filter: selected ? 'drop-shadow(0 0 6px rgba(0, 196, 180,0.7))' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            },
        };
    };
    const staticStyle = {
        fill: 'rgba(255,255,255,0.08)',
        stroke: 'rgba(255,255,255,0.18)',
        strokeWidth: 1,
    };
    const dividerStyle = {
        stroke: 'rgba(0,0,0,0.25)',
        strokeWidth: 1,
        pointerEvents: 'none',
    };
    return (<div className="bg-obsidian-wave border border-white-30/20 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
      {/* Controls panel */}
      <div className="flex-1 space-y-4 w-full text-left">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-lime-light"/>
          <h3 className="text-lg font-bold text-white">Target Muscle Map</h3>
        </div>
        <p className="text-xs text-white-50 leading-relaxed">
          Tap on specific muscles to filter workouts targeting those groups. Active selections glow green.
        </p>

        {/* View Switches */}
        <div className="flex gap-2">
          <button onClick={() => setView('front')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${view === 'front'
            ? 'bg-lime-light border-lime-light text-noir-eclipse'
            : 'bg-white-30/5 border-white-30/20 text-white hover:bg-white-30/10'}`}>
            Front View
          </button>
          <button onClick={() => setView('back')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${view === 'back'
            ? 'bg-lime-light border-lime-light text-noir-eclipse'
            : 'bg-white-30/5 border-white-30/20 text-white hover:bg-white-30/10'}`}>
            Back View
          </button>
        </div>

        {/* Selected list */}
        {selectedMuscles.length > 0 && (<div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white-50">Active Targets:</span>
              <button onClick={onClear} className="text-[11px] text-red-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                <RotateCcw className="w-3 h-3"/>
                Clear Map
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedMuscles.map((muscle) => (<span key={muscle} onClick={() => onToggleMuscle(muscle)} className="px-2.5 py-1 bg-lime-light/10 border border-lime-light/30 rounded-lg text-[10px] font-bold text-lime-light cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all">
                  {muscle} ×
                </span>))}
            </div>
          </div>)}

        {/* Legend */}
        {selectedMuscles.length === 0 && (<div className="flex flex-wrap gap-2 pt-1">
            {['Shoulders', 'Chest', 'Core', 'Arms', 'Legs', 'Back'].map((m) => (<button key={m} onClick={() => onToggleMuscle(m)} className="px-2 py-1 bg-white-30/5 border border-white-30/15 rounded-lg text-[10px] font-semibold text-white-50 hover:border-lime-light/40 hover:text-white transition-all cursor-pointer">
                {m}
              </button>))}
          </div>)}
      </div>

      {/* SVG Canvas */}
      <div className="flex items-center justify-center w-60 h-80 bg-noir-eclipse/40 rounded-2xl border border-white-30/10 p-4 relative overflow-hidden flex-shrink-0">
        <svg viewBox="0 0 200 320" className="w-full h-full select-none">
          {view === 'front' ? (<g>
              {/* Head & Neck */}
              <circle cx="100" cy="30" r="16" style={staticStyle}/>
              <path d="M92,46 L108,46 L106,58 L94,58 Z" style={staticStyle}/>

              {/* Shoulders */}
              <path d="M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z" {...getPathProps('Shoulders')}/>
              <path d="M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z" {...getPathProps('Shoulders')}/>

              {/* Chest */}
              <path d="M78,64 L122,64 C122,64 124,84 120,94 L80,94 C76,84 78,64 78,64 Z" {...getPathProps('Chest')}/>
              <line x1="100" y1="64" x2="100" y2="94" style={dividerStyle}/>

              {/* Abs / Core */}
              <path d="M80,97 L120,97 L114,136 L86,136 Z" {...getPathProps('Core')}/>
              <line x1="83" y1="110" x2="117" y2="110" style={dividerStyle}/>
              <line x1="84" y1="123" x2="116" y2="123" style={dividerStyle}/>
              <line x1="100" y1="97" x2="100" y2="136" style={dividerStyle}/>

              {/* Arms Left */}
              <path d="M58,82 L52,115 L44,115 L50,82 Z" {...getPathProps('Arms')}/>
              <path d="M43,117 L38,145 L32,143 L37,117 Z" {...getPathProps('Arms')}/>

              {/* Arms Right */}
              <path d="M142,82 L148,115 L156,115 L150,82 Z" {...getPathProps('Arms')}/>
              <path d="M157,117 L162,145 L168,143 L163,117 Z" {...getPathProps('Arms')}/>

              {/* Quads Left */}
              <path d="M85,142 L99,142 L97,215 L78,215 Z" {...getPathProps('Legs')}/>
              <path d="M79,222 L95,222 L91,285 C91,285 80,287 77,290 Z" {...getPathProps('Legs')}/>

              {/* Quads Right */}
              <path d="M115,142 L101,142 L103,215 L122,215 Z" {...getPathProps('Legs')}/>
              <path d="M121,222 L105,222 L109,285 C109,285 120,287 123,290 Z" {...getPathProps('Legs')}/>
            </g>) : (<g>
              {/* Head & Neck */}
              <circle cx="100" cy="30" r="16" style={staticStyle}/>
              <path d="M92,46 L108,46 L106,58 L94,58 Z" style={staticStyle}/>

              {/* Shoulders */}
              <path d="M74,58 C66,62 60,70 60,78 L72,82 L76,64 Z" {...getPathProps('Shoulders')}/>
              <path d="M126,58 C134,62 140,70 140,78 L128,82 L124,64 Z" {...getPathProps('Shoulders')}/>

              {/* Upper Back / Lats */}
              <path d="M78,64 L122,64 C122,64 126,88 116,108 L84,108 C74,88 78,64 78,64 Z" {...getPathProps('Back')}/>

              {/* Lower Back */}
              <path d="M84,111 L116,111 L114,136 L86,136 Z" {...getPathProps('Back')}/>

              {/* Glutes */}
              <path d="M85,138 L115,138 L120,165 L80,165 Z" {...getPathProps('Legs')}/>
              <line x1="100" y1="138" x2="100" y2="165" style={dividerStyle}/>

              {/* Arms Left */}
              <path d="M58,82 L52,115 L44,115 L50,82 Z" {...getPathProps('Arms')}/>
              <path d="M43,117 L38,145 L32,143 L37,117 Z" {...getPathProps('Arms')}/>

              {/* Arms Right */}
              <path d="M142,82 L148,115 L156,115 L150,82 Z" {...getPathProps('Arms')}/>
              <path d="M157,117 L162,145 L168,143 L163,117 Z" {...getPathProps('Arms')}/>

              {/* Hamstrings Left */}
              <path d="M85,168 L99,168 L97,222 L78,222 Z" {...getPathProps('Legs')}/>
              <path d="M79,228 L95,228 L91,285 C91,285 80,287 77,290 Z" {...getPathProps('Legs')}/>

              {/* Hamstrings Right */}
              <path d="M115,168 L101,168 L103,222 L122,222 Z" {...getPathProps('Legs')}/>
              <path d="M121,228 L105,228 L109,285 C109,285 120,287 123,290 Z" {...getPathProps('Legs')}/>
            </g>)}
        </svg>
      </div>
    </div>);
};
