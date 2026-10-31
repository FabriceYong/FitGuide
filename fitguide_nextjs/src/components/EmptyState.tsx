import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** What a section shows when there's nothing in it yet: what it's for and how to start. */
export function EmptyState({ icon: Icon, title, text, color = '#00C4B4', action, compact = false }: {
  icon: LucideIcon;
  title: string;
  text: string;
  color?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-6 gap-2' : 'py-12 gap-3'} px-4 rounded-2xl border border-dashed border-white-30/20`}>
      <span className={`${compact ? 'w-11 h-11' : 'w-14 h-14'} rounded-2xl flex items-center justify-center`} style={{ backgroundColor: `${color}1F` }} aria-hidden="true">
        <Icon className={compact ? 'w-5 h-5' : 'w-6 h-6'} style={{ color }} />
      </span>
      <p className="font-bold text-white">{title}</p>
      <p className="text-sm text-white-70 max-w-sm">{text}</p>
      {action}
    </div>
  );
}
