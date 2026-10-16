'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Timer, Dumbbell, Sparkles, Activity, Play, Bookmark, X, SlidersHorizontal, Trash2, ChevronRight, Layers, BookOpen, AlertCircle, RefreshCw, Zap, ShieldCheck, Info } from 'lucide-react';
import { useWorkouts } from '../../../context/WorkoutContext';
import { BodyMap } from './BodyMap';
import { useWorkoutImage } from '../../../hooks/useWorkoutImage';
import { getWorkoutXExercises, getWorkoutXCacheInfo, clearWorkoutXCache } from '../../../services/workoutXService';

// ─── Constants ────────────────────────────────────────────────────────────────
const BODY_PART_CHIPS = [
    { label: 'All', icon: '🏋️' },
    { label: 'Chest', icon: '🫁' },
    { label: 'Back', icon: '🔙' },
    { label: 'Shoulders', icon: '🤸' },
    { label: 'Arms', icon: '💪' },
    { label: 'Legs', icon: '🦵' },
];

const EQUIPMENT_OPTIONS = [
    { label: 'All Equipment', id: '' },
    { label: 'Barbell', id: 'Barbell' },
    { label: 'Dumbbell', id: 'Dumbbell' },
    { label: 'Cable Machine', id: 'Cable Machine' },
    { label: 'Pull-Up Bar', id: 'Pull-Up Bar' },
    { label: 'Bodyweight', id: 'Bodyweight' },
];

const colorMap = {
    'HIIT': '#00C4B4',
    'Yoga': '#3E25F5',
    'Strength': '#C084FC',
    'Cardio': '#FB923C',
    'Flexibility': '#14B8A6',
    'Pilates': '#EC4899',
    'CrossFit': '#EF4444',
    'Dance': '#F59E0B',
    'Martial Arts': '#10B981',
    'Swimming': '#06B6D4',
};

const ExerciseDrawer = ({ exercise, onClose }) => {
    if (!exercise) return null;
    const catColor = '#00C4B4';
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md"/>
        
        {/* Drawer Panel */}
        <div className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto bg-obsidian-wave border border-white-30/20 rounded-t-3xl md:rounded-3xl p-6 md:p-8 space-y-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-noir-eclipse flex items-center justify-center text-white-70 hover:text-white transition-colors border border-white-30/10 cursor-pointer">
            <X className="w-5 h-5"/>
          </button>

          {/* Exercise Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#00C4B4]/20 text-[#00C4B4] border border-[#00C4B4]/40">
              {exercise.bodyPart || 'Exercise'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {exercise.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {exercise.force || exercise.forceType || 'push'} • {exercise.mechanic || exercise.mechanics || 'compound'}
            </span>
            {exercise.isUnilateral && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Unilateral (Single Side)
              </span>
            )}
          </div>

          <h2 className="text-3xl font-extrabold text-white leading-tight">{exercise.name}</h2>

          {/* Description Paragraph */}
          {exercise.description && (
            <p className="text-xs md:text-sm text-white/70 bg-noir-eclipse p-3.5 rounded-xl border border-white-30/10 leading-relaxed italic">
              "{exercise.description}"
            </p>
          )}

          {/* GIF Animation Preview Card */}
          {exercise.gifUrl && (
            <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-white-30/20 bg-noir-eclipse group">
              <img 
                src={exercise.gifUrl} 
                alt={exercise.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-noir-eclipse via-transparent to-transparent opacity-80"/>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00C4B4] bg-[#00C4B4]/20 px-2.5 py-1 rounded-md border border-[#00C4B4]/30">WORKOUTX MOTION DATA</span>
                  <p className="text-xs text-white/70 mt-1">High-Definition Technique Animation</p>
                </div>
                {exercise.popularityRank && (
                  <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/30">
                    ⭐ Popularity Rank #{exercise.popularityRank}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Extended Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-noir-eclipse/80 p-4 rounded-2xl border border-white-30/10 text-left">
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Target Muscle</p>
              <p className="text-xs font-bold text-lime-light mt-0.5">{exercise.target}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Equipment</p>
              <p className="text-xs font-bold text-purple-300 mt-0.5">{exercise.equipment}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Prescribed Dose</p>
              <p className="text-xs font-bold text-amber-300 mt-0.5">{exercise.recommendedSets || '3'} sets × {exercise.recommendedReps || '10-15'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Metabolic Rate</p>
              <p className="text-xs font-bold text-orange-400 mt-0.5">{exercise.met || 3.5} METs ({exercise.caloriesPerMinute || exercise.caloriesBurnedPerMin || 4.3} cal/m)</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Joint Focus</p>
              <p className="text-xs font-bold text-blue-300 mt-0.5 capitalize">{exercise.joint_focus ? exercise.joint_focus.replace('_', ' ') : 'General'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white-40 uppercase tracking-wider">Intensity</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5 capitalize">{exercise.intensity_level || 'Moderate'}</p>
            </div>
          </div>

          {/* Movement Tags */}
          {exercise.movement_tags && exercise.movement_tags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-2">Movement Characteristics & Attributes</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.movement_tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-[#00C4B4]/10 border border-[#00C4B4]/25 rounded-full text-xs font-medium text-[#00C4B4]">
                    🏷️ {tag.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Muscles */}
          {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-2">Secondary Muscles Engaged</p>
              <div className="flex flex-wrap gap-2">
                {exercise.secondaryMuscles.map((m, i) => (
                  <span key={i} className="px-3 py-1 bg-white-30/10 border border-white-30/20 rounded-full text-xs font-semibold text-white-70">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-2">Step-by-Step Execution Guide</p>
              <div className="space-y-2 bg-noir-eclipse rounded-2xl p-4 border border-white-30/10">
                {exercise.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00C4B4]/20 text-[#00C4B4] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs md:text-sm text-white/80 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Form & Safety Tips */}
          {exercise.tips && exercise.tips.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-2">Form & Safety Tips</p>
              <div className="bg-[#00C4B4]/5 border border-[#00C4B4]/20 rounded-2xl p-4 space-y-1.5">
                {exercise.tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-white/80 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00C4B4] flex-shrink-0 mt-0.5"/>
                    <span>{tip}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Alternatives Swaps */}
          {exercise.alternatives && exercise.alternatives.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-2">Alternative Exercise Swaps</p>
              <div className="flex flex-wrap gap-2">
                {exercise.alternatives.map((alt, i) => (
                  <span key={i} className="px-3 py-1 bg-royal-nebula/10 border border-royal-nebula/30 rounded-full text-xs font-semibold text-purple-300">
                    🔄 {alt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer attribution */}
          <div className="pt-2 border-t border-white-30/10 flex justify-between items-center text-[10px] text-white-30">
            <span>Powered by WorkoutX API Platform</span>
            <span>ID: {exercise.id}</span>
          </div>
        </div>
      </div>
    );
};

// ─── Exercise Library (WorkoutX API Integration with 3-Day Rate-Limit Cache) ──────────────────
const ExerciseLibrary = () => {
    const [exercises, setExercises] = useState([]);
    const [filteredExercises, setFilteredExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBodyPart, setSelectedBodyPart] = useState(0);
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [telemetry, setTelemetry] = useState(null);

    const loadData = useCallback(async (force = false) => {
        if (force) setSyncing(true);
        else setLoading(true);
        setError(null);

        try {
            const result = await getWorkoutXExercises(force);
            if (result.success) {
                setExercises(result.exercises);
                setFilteredExercises(result.exercises);
            }
            const info = getWorkoutXCacheInfo();
            setTelemetry(info);
        } catch (err) {
            setError(err.message || 'Failed to load WorkoutX exercises');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, []);

    useEffect(() => {
        loadData(false);
    }, [loadData]);

    // Apply Client-Side Filters
    useEffect(() => {
        let list = [...exercises];

        // Body part chip filter
        const chip = BODY_PART_CHIPS[selectedBodyPart];
        if (chip && chip.label !== 'All') {
            list = list.filter(ex => ex.bodyPart.toLowerCase() === chip.label.toLowerCase());
        }

        // Equipment filter
        if (selectedEquipment) {
            list = list.filter(ex => ex.equipment.toLowerCase() === selectedEquipment.toLowerCase());
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(ex => 
                ex.name.toLowerCase().includes(q) ||
                ex.bodyPart.toLowerCase().includes(q) ||
                ex.target.toLowerCase().includes(q) ||
                ex.equipment.toLowerCase().includes(q) ||
                ex.secondaryMuscles.some(m => m.toLowerCase().includes(q))
            );
        }

        setFilteredExercises(list);
    }, [searchQuery, selectedBodyPart, selectedEquipment, exercises]);

    const handleForceSync = () => {
        clearWorkoutXCache();
        loadData(true);
    };

    return (
      <div className="space-y-5">
        {/* WorkoutX Rate-Limit & Caching Telemetry Banner */}
        <div className="bg-gradient-to-r from-obsidian-wave via-noir-eclipse to-obsidian-wave border border-white-30/15 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00C4B4]/15 border border-[#00C4B4]/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-[#00C4B4]"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">WorkoutX API Platform Cache Engine</span>
                <span className="px-2 py-0.5 bg-[#00C4B4]/20 text-[#00C4B4] rounded text-[10px] font-bold uppercase tracking-wider">
                  3-Day Throttle Active
                </span>
              </div>
              <p className="text-white-50 mt-0.5">
                {telemetry ? telemetry.status : 'Mass dataset cached locally to prevent API rate limits.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {telemetry && (
              <div className="text-right text-[11px] hidden lg:block">
                <p className="text-white/70 font-semibold">{telemetry.count} exercises loaded</p>
                <p className="text-white-40">Source: {telemetry.source}</p>
              </div>
            )}
            <button 
              onClick={handleForceSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C4B4] text-[#0a0a0f] rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 cursor-pointer text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}/>
              {syncing ? 'Syncing...' : 'Force Re-Sync'}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center bg-obsidian-wave border border-white-30/50 rounded-2xl px-4 py-3.5 focus-within:border-lime-light transition-colors">
          <Search className="w-5 h-5 text-white-30 mr-3 flex-shrink-0"/>
          <input 
            type="text" 
            placeholder="Search WorkoutX exercises by name, muscle, equipment..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="bg-transparent text-white w-full focus:outline-none placeholder-white-30 text-sm font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="ml-2 text-white-30 hover:text-white">
              <X className="w-4 h-4"/>
            </button>
          )}
        </div>

        {/* Body Part Chips */}
        <div>
          <p className="text-[10px] font-bold text-white-50 uppercase tracking-wider mb-3">Filter by Body Part</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {BODY_PART_CHIPS.map((chip, i) => (
              <button 
                key={chip.label} 
                onClick={() => setSelectedBodyPart(i)} 
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  selectedBodyPart === i
                    ? 'bg-[#00C4B4] text-noir-eclipse border-[#00C4B4]'
                    : 'bg-obsidian-wave text-white border-white-30/30 hover:border-white-30'
                }`}
              >
                <span>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment Filter & Reset */}
        <div className="flex items-center gap-3">
          <select 
            value={selectedEquipment} 
            onChange={e => setSelectedEquipment(e.target.value)} 
            className="bg-obsidian-wave border border-white-30/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-light cursor-pointer"
          >
            {EQUIPMENT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          {(selectedBodyPart !== 0 || selectedEquipment || searchQuery) && (
            <button 
              onClick={() => { setSelectedBodyPart(0); setSelectedEquipment(''); setSearchQuery(''); }} 
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5"/> Reset
            </button>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-obsidian-wave rounded-2xl animate-pulse border border-white-30/10"/>
            ))}
          </div>
        )}

        {/* Exercise Grid */}
        {!loading && filteredExercises.length > 0 && (
          <>
            <p className="text-xs text-white-50">
              Showing {filteredExercises.length} WorkoutX exercises with full parameter metadata
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map(ex => (
                <button 
                  key={ex.id} 
                  onClick={() => setSelectedExercise(ex)} 
                  className="text-left bg-obsidian-wave border border-white-30/10 rounded-2xl p-5 hover:border-[#00C4B4]/50 transition-all group relative overflow-hidden cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#00C4B4]/20 text-[#00C4B4] border border-[#00C4B4]/40">
                      {ex.bodyPart}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white-30 group-hover:text-[#00C4B4] transition-colors mt-0.5"/>
                  </div>

                  <h3 className="font-extrabold text-white text-base leading-tight mb-2 group-hover:text-[#00C4B4] transition-colors line-clamp-1">
                    {ex.name}
                  </h3>

                  <p className="text-xs font-semibold text-white/70 mb-3">
                    Target: <span className="text-lime-light">{ex.target}</span>
                  </p>

                  <div className="flex flex-wrap gap-1.5 items-center text-[10px] text-white/50">
                    <span className="px-2 py-0.5 bg-royal-nebula/10 border border-royal-nebula/20 rounded-md text-purple-300 font-medium">
                      {ex.equipment}
                    </span>
                    <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-orange-300 font-medium">
                      ~{ex.caloriesBurnedPerMin} cal/min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && filteredExercises.length === 0 && (
          <div className="text-center py-16 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-white-30"/>
            <p className="text-white-70 font-semibold">No WorkoutX exercises match your search</p>
            <p className="text-sm text-white-50 mt-1">Try clearing filters or adjusting your search phrase</p>
          </div>
        )}

        {/* Detailed Exercise Drawer */}
        <ExerciseDrawer exercise={selectedExercise} onClose={() => setSelectedExercise(null)}/>
      </div>
    );
};

// ─── Main ExploreTab ──────────────────────────────────────────────────────────
export const ExploreTab = ({ onSelectWorkout }) => {
    const { workouts: allWorkouts, loading } = useWorkouts();
    const [displayedWorkouts, setDisplayedWorkouts] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [viewMode, setViewMode] = useState('workouts');
    // MuscleWiki Filter States
    const [selectedMuscles, setSelectedMuscles] = useState([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [showFiltersPanel, setShowFiltersPanel] = useState(false);
    const categories = [
        { label: 'HIIT', icon: Timer, color: 'text-lime-light', border: 'hover:border-lime-light/50' },
        { label: 'Yoga', icon: Sparkles, color: 'text-royal-nebula', border: 'hover:border-royal-nebula/50' },
        { label: 'Strength', icon: Dumbbell, color: 'text-purple-400', border: 'hover:border-purple-400/50' },
        { label: 'Cardio', icon: Activity, color: 'text-orange-400', border: 'hover:border-orange-400/50' },
    ];
    useEffect(() => { applyFilters(); }, [searchQuery, selectedCategory, selectedMuscles, selectedDifficulty, selectedEquipment, allWorkouts]);
    const applyFilters = () => {
        let filtered = [...allWorkouts];
        if (selectedCategory)
            filtered = filtered.filter(w => w.category === selectedCategory);
        if (selectedDifficulty)
            filtered = filtered.filter(w => w.difficulty === selectedDifficulty);
        if (selectedEquipment)
            filtered = filtered.filter(w => w.equipment.some(eq => eq.toLowerCase().includes(selectedEquipment.toLowerCase())));
        if (selectedMuscles.length > 0) {
            filtered = filtered.filter(w => w.targetMuscles.some(m => selectedMuscles.some(sm => m.toLowerCase().includes(sm.toLowerCase()) || sm.toLowerCase().includes(m.toLowerCase()))));
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(w => w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || w.shortDescription?.toLowerCase().includes(q) || w.tags?.some(tag => tag.toLowerCase().includes(q)));
        }
        setDisplayedWorkouts(showAllModal ? filtered : filtered.slice(0, 6));
    };
    const getWorkoutColor = (category) => colorMap[category] || '#00C4B4';
    const clearAllFilters = () => {
        setSelectedMuscles([]);
        setSelectedDifficulty('');
        setSelectedEquipment('');
        setSelectedCategory(null);
        setSearchQuery('');
    };
    const hasActiveFilters = selectedMuscles.length > 0 || selectedDifficulty !== '' || selectedEquipment !== '' || selectedCategory !== null || searchQuery !== '';
    return (<div className="space-y-6 pb-10 text-left w-full mx-auto px-0 md:px-4 lg:px-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-white">Explore</h1>
        {hasActiveFilters && viewMode === 'workouts' && (<button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5"/> Reset All
          </button>)}
      </div>

      {/* ── View Mode Toggle (Workouts / Exercise Library) ── */}
      <div className="flex bg-obsidian-wave p-1 rounded-2xl border border-white-30/20 gap-1">
        <button onClick={() => setViewMode('workouts')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'workouts' ? 'bg-lime-light text-noir-eclipse border border-lime-light/40' : 'text-white-70 hover:text-white'}`}>
          <Layers className="w-4 h-4"/>
          Workouts
        </button>
        <button onClick={() => setViewMode('exercises')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === 'exercises' ? 'bg-lime-light text-noir-eclipse border border-lime-light/40' : 'text-white-70 hover:text-white'}`}>
          <BookOpen className="w-4 h-4"/>
          Exercise Library
          <span className="px-1.5 py-0.5 bg-lime-light/20 text-lime-light rounded-md text-[9px] font-black tracking-wide border border-lime-light/30">NEW</span>
        </button>
      </div>

      {/* ══════════ WORKOUTS VIEW ══════════ */}
      {viewMode === 'workouts' && (<div className="space-y-6 animate-fade-in">
          {/* Search Bar & Advanced Toggle */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-obsidian-wave border border-white-30/50 rounded-2xl px-4 py-3.5 focus-within:border-lime-light transition-colors">
              <Search className="w-5 h-5 text-white-30 mr-3"/>
              <input type="text" placeholder="Search workouts, categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-white w-full focus:outline-none placeholder-white-30 text-sm font-medium"/>
            </div>
            <button onClick={() => setShowFiltersPanel(!showFiltersPanel)} className={`px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${showFiltersPanel || selectedDifficulty || selectedEquipment || selectedMuscles.length > 0 ? 'bg-lime-light/20 border-lime-light text-lime-light' : 'bg-obsidian-wave border-white-30/50 text-white hover:border-white-30'}`}>
              <SlidersHorizontal className="w-5 h-5"/>
              <span className="text-xs font-bold hidden sm:inline">Anatomy & Filters</span>
            </button>
          </div>

          {/* Expandable Filters */}
          {(showFiltersPanel || selectedMuscles.length > 0) && (<div className="space-y-6 animate-fade-in">
              <BodyMap selectedMuscles={selectedMuscles} onToggleMuscle={m => setSelectedMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} onClear={() => setSelectedMuscles([])}/>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-obsidian-wave border border-white-30/20 rounded-2xl p-4">
                  <label className="block text-xs font-bold text-white-50 uppercase tracking-wider mb-2">Filter by Equipment</label>
                  <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-lime-light cursor-pointer">
                    <option value="">All Equipment</option>
                    <option value="None">None (Bodyweight)</option>
                    <option value="Dumbbell">Dumbbells</option>
                    <option value="Barbell">Barbell</option>
                    <option value="Kettlebell">Kettlebell</option>
                    <option value="Mat">Yoga Mat</option>
                    <option value="Ropes">Battle Ropes</option>
                    <option value="Band">Resistance Bands</option>
                    <option value="Pull-up Bar">Pull-up Bar</option>
                  </select>
                </div>
                <div className="bg-obsidian-wave border border-white-30/20 rounded-2xl p-4">
                  <label className="block text-xs font-bold text-white-50 uppercase tracking-wider mb-2">Difficulty Level</label>
                  <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="w-full bg-noir-eclipse border border-white-30/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-lime-light cursor-pointer">
                    <option value="">All Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>)}

          {/* Categories */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-widest text-white uppercase">Browse by Category</h2>
            <div className="flex overflow-x-auto no-scrollbar gap-3 py-1">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.label;
                return (<button key={cat.label} onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)} className={`flex items-center flex-shrink-0 px-4 py-3 bg-obsidian-wave rounded-full transition-all cursor-pointer ${isActive ? 'border-2 border-lime-light' : 'border border-white-30/30 ' + cat.border}`}>
                    <Icon className={`w-4 h-4 mr-2 ${cat.color}`}/>
                    <span className="text-xs font-bold text-white">{cat.label}</span>
                  </button>);
            })}
            </div>
          </div>

          {/* Workout Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">{selectedCategory ? `${selectedCategory} Workouts` : 'Popular Workouts'}</h2>
              <button onClick={() => setShowAllModal(true)} className="text-sm font-semibold text-lime-light cursor-pointer hover:underline">See All</button>
            </div>
            {loading && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-obsidian-wave rounded-[24px] animate-pulse"/>)}
              </div>)}
            {!loading && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedWorkouts.map(workout => (<WorkoutCard key={workout.id} workout={workout} color={getWorkoutColor(workout.category)} onSelect={() => onSelectWorkout(workout.slug, getWorkoutColor(workout.category))}/>))}
              </div>)}
            {!loading && displayedWorkouts.length === 0 && (<div className="text-center py-12 bg-obsidian-wave/50 rounded-2xl border border-white-30/10">
                <p className="text-white-70">No workouts found matching current selections.</p>
              </div>)}
          </div>
        </div>)}

      {/* ══════════ EXERCISE LIBRARY VIEW ══════════ */}
      {viewMode === 'exercises' && (<div className="animate-fade-in">
          <div className="mb-5">
            <p className="text-sm text-white-70">
              Browse <span className="text-white font-bold">800+ exercises</span> with muscle group tags, equipment requirements, and step-by-step instructions — powered by the free <span className="text-lime-light font-bold">Wger</span> fitness database.
            </p>
          </div>
          <ExerciseLibrary />
        </div>)}

      {/* See All Modal */}
      {showAllModal && viewMode === 'workouts' && (<AllWorkoutsModal workouts={displayedWorkouts} onClose={() => setShowAllModal(false)} onSelectWorkout={workout => { setShowAllModal(false); onSelectWorkout(workout.slug, getWorkoutColor(workout.category)); }} getWorkoutColor={getWorkoutColor}/>)}
    </div>);
};
const WorkoutCard = ({ workout, color, onSelect }) => {
    const { imageUrl, isLoading, photographer, photographerUrl } = useWorkoutImage({
        workoutId: workout.id, category: workout.category, title: workout.title, size: 'small', useDynamicImages: true,
    });
    return (<div onClick={onSelect} className="h-40 relative rounded-[24px] overflow-hidden cursor-pointer border-2 transition-all duration-300" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }} onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 32px ${color}60`; e.currentTarget.style.borderColor = `${color}60`; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${color}30`; }}>
      <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-500" style={{ backgroundImage: `url(${imageUrl})`, opacity: isLoading ? 0.5 : 1 }}>
        <div className="absolute inset-0" style={{ backgroundColor: `${color}70` }}/>
      </div>
      {isLoading && <div className="absolute inset-0 flex items-center justify-center z-5"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"/></div>}
      {photographer && photographerUrl && (<a href={photographerUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="absolute bottom-1 left-1 z-10 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white/80 hover:text-white transition-colors">{photographer}</a>)}
      <div className="absolute top-4 left-4 z-10">
        <span className="px-2 py-1 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: `${color}80` }}>{workout.category}</span>
      </div>
      <button onClick={e => e.stopPropagation()} className="absolute top-4 right-4 text-white-70 hover:text-white hover:scale-105 transition-all z-10">
        <Bookmark className="w-5 h-5"/>
      </button>
      <div className="absolute bottom-4 left-4 right-4 flex flex-col items-start z-10">
        <div className="w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center mb-2" style={{ backgroundColor: `${color}80` }}>
          <Play className="w-4 h-4 fill-current text-white"/>
        </div>
        <h3 className="font-extrabold text-white text-base leading-tight truncate w-full drop-shadow-lg">{workout.title}</h3>
        <p className="text-xs text-white mt-1 drop-shadow-md">{workout.duration} Min • {workout.difficulty}</p>
      </div>
    </div>);
};
const AllWorkoutsModal = ({ workouts, onClose, onSelectWorkout, getWorkoutColor }) => (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-obsidian-wave rounded-3xl w-full max-w-[90%] max-h-[90vh] overflow-hidden border border-white-30/20">
      <div className="flex items-center justify-between p-6 border-b border-white-30/10">
        <div>
          <h2 className="text-2xl font-bold text-white">All Workouts</h2>
          <p className="text-sm text-white-70 mt-1">{workouts.length} workouts available</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-noir-eclipse flex items-center justify-center text-white-70 hover:text-white hover:bg-white-30/10 transition-all">
          <X className="w-5 h-5"/>
        </button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workouts.map(workout => (<WorkoutCard key={workout.id} workout={workout} color={getWorkoutColor(workout.category)} onSelect={() => onSelectWorkout(workout)}/>))}
        </div>
      </div>
    </div>
  </div>);
