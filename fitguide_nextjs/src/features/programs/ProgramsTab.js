'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Flame, Target, TrendingUp, Clock, Filter, Search, LayoutGrid } from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutContext';

export const ProgramsTab = ({ onSelectWorkout }) => {
    const { workouts } = useWorkouts();
    const [selectedLevel, setSelectedLevel] = useState('All Levels');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [programData, setProgramData] = useState({
        'Beginner': [],
        'Intermediate': [],
        'Advanced': [],
    });

    // Organize workouts by difficulty level
    useEffect(() => {
        const organized = {
            'Beginner': workouts.filter(w => w.difficulty === 'Beginner'),
            'Intermediate': workouts.filter(w => w.difficulty === 'Intermediate'),
            'Advanced': workouts.filter(w => w.difficulty === 'Advanced'),
        };
        setProgramData(organized);
    }, [workouts]);

    // Filter workouts based on selected level, category, and search
    const getFilteredWorkouts = (level) => {
        let filtered = programData[level] || [];
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(w => w.category === selectedCategory);
        }
        if (searchQuery) {
            filtered = filtered.filter(w =>
                w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                w.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return filtered;
    };

    const categories = ['All', ...new Set(workouts.map(w => w.category))];
    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    // Determine which levels to display based on toggle
    const visibleLevels = selectedLevel === 'All Levels' ? levels : [selectedLevel];

    const getLevelColor = (level) =>
        level === 'Beginner' ? '#00C4B4' : level === 'Intermediate' ? '#3E25F5' : '#EF4444';
    const getLevelIcon = (level) =>
        level === 'Beginner' ? Zap : level === 'Intermediate' ? TrendingUp : Flame;

    return (
        <div className="space-y-0 -mt-8 md:-mt-10">
            {/* Hero Section */}
            <section className="-mx-6 md:-mx-12 -mt-8 md:-mt-10 mb-12">
                <div className="relative min-h-96 bg-gradient-to-br from-royal-nebula via-noir-eclipse to-noir-eclipse rounded-none md:rounded-3xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-lime-light/10 rounded-full blur-3xl -mr-48 -mt-48"/>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-royal-nebula/20 rounded-full blur-3xl -ml-32 -mb-32"/>
                    <div className="relative z-10 p-8 md:p-16 text-center">
                        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/20 text-lime-light border border-lime-light/30 mb-6">
                            Structured Training Paths
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
                            Personalized Workout Programs
                        </h1>
                        <p className="text-lg text-white-70 max-w-3xl mx-auto mb-8">
                            Choose your fitness level and customize your training journey. From foundational exercises to advanced conditioning, every program is designed to help you progress safely and effectively.
                        </p>
                        {/* Level Toggle Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                            {[
                                { level: 'All Levels', icon: LayoutGrid, desc: 'Show everything' },
                                { level: 'Beginner', icon: Zap, desc: 'Build foundations' },
                                { level: 'Intermediate', icon: TrendingUp, desc: 'Increase intensity' },
                                { level: 'Advanced', icon: Flame, desc: 'Peak performance' },
                            ].map(({ level, icon: Icon, desc }) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`p-4 rounded-2xl border transition-all transform hover:scale-105 ${
                                        selectedLevel === level
                                            ? 'bg-lime-light text-noir-eclipse border-lime-light'
                                            : 'bg-white/10 text-white border-white/20 hover:border-lime-light/50'
                                    }`}
                                >
                                    <Icon className="w-8 h-8 mx-auto mb-2"/>
                                    <div className="font-bold text-sm uppercase tracking-wider">{level}</div>
                                    <div className={`text-xs mt-1 ${selectedLevel === level ? 'text-noir-eclipse/70' : 'text-white-70'}`}>{desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="section-transition"/>

            {/* Filters */}
            <section className="section-container section-reveal py-12 md:py-14">
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white-50 w-5 h-5"/>
                        <input
                            type="text"
                            placeholder="Search programs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-obsidian-wave border border-white-30/20 rounded-xl text-white placeholder-white-50 focus:outline-none focus:border-lime-light/50 focus:ring-2 focus:ring-lime-light/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-white-70 uppercase tracking-wider mb-3 block">
                            <Filter className="w-4 h-4 inline mr-2"/>
                            Filter by Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-lime-light text-noir-eclipse'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="section-transition"/>

            {/* Program Sections — filtered by selected level */}
            <section className="section-container section-reveal py-12 md:py-14 space-y-16">
                {workouts.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white-70 mb-4">No workouts available yet. The database may still be loading.</p>
                    </div>
                ) : (
                    <>
                        {visibleLevels.map((level) => {
                            const levelWorkouts = getFilteredWorkouts(level);
                            const levelColor = getLevelColor(level);
                            const LevelIcon = getLevelIcon(level);
                            return (
                                <div key={level} className="section-reveal">
                                    {/* Level Header */}
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <LevelIcon className="w-6 h-6" style={{ color: levelColor }}/>
                                            <h2 className="text-3xl font-extrabold text-white">{level} Programs</h2>
                                            <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white-70">
                                                {levelWorkouts.length} programs
                                            </span>
                                        </div>
                                        <p className="text-white-70 ml-9">
                                            {level === 'Beginner'
                                                ? 'Perfect for those just starting their fitness journey. Build a strong foundation with basic movements and concepts.'
                                                : level === 'Intermediate'
                                                    ? 'Ready to challenge yourself? These programs build on fundamentals with increased intensity and complexity.'
                                                    : 'For experienced athletes. Advanced programs push your limits with complex movements and high intensity.'}
                                        </p>
                                    </div>

                                    {/* Programs Grid */}
                                    {levelWorkouts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {levelWorkouts.map((workout, index) => (
                                                <div
                                                    key={workout.id || workout._id || index}
                                                    className="section-reveal group relative rounded-2xl overflow-hidden border border-white-30/10 hover:border-white-30/30 bg-obsidian-wave backdrop-blur-sm transition-all hover:shadow-lg"
                                                    style={{ animationDelay: `${index * 0.05}s` }}
                                                >
                                                    <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                         style={{ background: `linear-gradient(90deg, ${levelColor}, transparent)` }}/>
                                                    <div className="p-6 h-full flex flex-col">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                                                                  style={{ background: `${levelColor}20`, color: levelColor, border: `1px solid ${levelColor}40` }}>
                                                                {workout.category}
                                                            </span>
                                                            <span className="text-xs font-bold text-white-50 uppercase">
                                                                {workout.intensity}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-extrabold text-white mb-2 group-hover:text-lime-light transition-colors">
                                                            {workout.title}
                                                        </h3>
                                                        <p className="text-sm text-white-70 mb-4 line-clamp-2">
                                                            {workout.description}
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-3 mb-4 text-center text-xs">
                                                            <div>
                                                                <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: levelColor }}/>
                                                                <div className="font-bold text-white">{workout.duration}m</div>
                                                                <div className="text-white-50">Duration</div>
                                                            </div>
                                                            <div>
                                                                <Flame className="w-4 h-4 mx-auto mb-1" style={{ color: levelColor }}/>
                                                                <div className="font-bold text-white">{workout.calories}</div>
                                                                <div className="text-white-50">Calories</div>
                                                            </div>
                                                            <div>
                                                                <Target className="w-4 h-4 mx-auto mb-1" style={{ color: levelColor }}/>
                                                                <div className="font-bold text-white">{workout.targetMuscles?.length || 0}</div>
                                                                <div className="text-white-50">Muscles</div>
                                                            </div>
                                                        </div>
                                                        <div className="mb-4">
                                                            <div className="text-xs font-bold text-white-70 uppercase mb-2">Target Muscles</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(workout.targetMuscles || []).slice(0, 3).map((muscle) => (
                                                                    <span key={muscle} className="px-2 py-1 rounded-md text-xs font-semibold bg-white/5 text-white-70">
                                                                        {muscle}
                                                                    </span>
                                                                ))}
                                                                {(workout.targetMuscles?.length || 0) > 3 && (
                                                                    <span className="px-2 py-1 text-xs font-semibold text-white-50">
                                                                        +{workout.targetMuscles.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => onSelectWorkout(workout.slug, levelColor)}
                                                            className="w-full mt-auto px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all text-noir-eclipse"
                                                            style={{ background: levelColor, boxShadow: `0 0 20px ${levelColor}40` }}
                                                            onMouseEnter={(e) => { e.target.style.boxShadow = `0 0 30px ${levelColor}80`; }}
                                                            onMouseLeave={(e) => { e.target.style.boxShadow = `0 0 20px ${levelColor}40`; }}
                                                        >
                                                            Start Program →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-white-70">
                                                No {level} programs found matching your filters. Try adjusting your search criteria.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </section>

            <div className="section-transition"/>

            {/* CTA Section */}
            <section className="section-container section-reveal relative rounded-3xl overflow-hidden bg-gradient-to-br from-lime-light/10 to-royal-nebula/10 border border-white-30/20 p-12 md:p-16 text-center py-16">
                <div className="relative z-10">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/20 text-lime-light border border-lime-light/30 mb-6">
                        Ready to Progress
                    </span>
                    <h2 className="text-4xl font-extrabold text-white mb-4">Customize Your Training Path</h2>
                    <p className="text-lg text-white-70 max-w-2xl mx-auto mb-8">
                        Each program can be personalized based on your goals, available equipment, and time commitment. Start with your level and progress as you grow stronger.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="px-8 py-4 bg-lime-light text-noir-eclipse font-extrabold rounded-xl hover:bg-lime-light/90 transition-all uppercase tracking-wider cursor-pointer border border-lime-light/30">
                            Create Your Program
                        </button>
                        <button className="px-8 py-4 bg-white/10 text-white border border-white/20 font-extrabold rounded-xl hover:bg-white/20 transition-all uppercase tracking-wider">
                            Learn More
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime-light/5 rounded-full blur-3xl -mr-48 -mt-48"/>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-royal-nebula/5 rounded-full blur-3xl -ml-32 -mb-32"/>
            </section>
        </div>
    );
};
