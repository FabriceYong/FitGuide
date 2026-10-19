import Link from 'next/link';
import { CalendarDays, Clock, Target } from 'lucide-react';

export const LEVEL_COLORS = {
    'Beginner': '#00C4B4',
    'Intermediate': '#FB923C',
    'Advanced': '#EF4444',
    'All Levels': '#C084FC',
};

/** Summary card linking to /programs/[slug]. Works in server and client components. */
export function ProgramCard({ program, badge }) {
    const color = LEVEL_COLORS[program.level] || '#00C4B4';
    return (
        <Link
            href={`/programs/${program.slug}`}
            className="block h-full bg-obsidian-wave border border-white-30/10 hover:border-white-30/40 rounded-2xl p-6 transition-colors relative overflow-hidden"
        >
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
            <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                    {program.level}
                </span>
                {badge && <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-lime-light text-noir-eclipse">{badge}</span>}
            </div>
            <h3 className="text-xl font-extrabold text-white mt-3">{program.title}</h3>
            <p className="text-sm text-white-70 mt-2 line-clamp-3">{program.description}</p>
            <div className="flex flex-wrap gap-4 mt-5 text-xs text-white-70">
                <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{program.weeks} weeks · {program.daysPerWeek} days/week</span>
                {program.averageMinutes ? <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />~{program.averageMinutes} min/session</span> : null}
                <span className="flex items-center gap-1.5"><Target className="w-4 h-4" />{program.goal}</span>
            </div>
        </Link>
    );
}
