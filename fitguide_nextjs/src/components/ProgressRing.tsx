import type { ReactNode } from 'react';

/**
 * A ring that fills with progress toward a goal (steps, calories, protein),
 * with whatever's passed as children in the middle. Over the goal, the ring
 * stays full. Decorative: say the numbers in text next to it.
 */
export function ProgressRing({ value, goal, color, size = 96, stroke = 9, children }: {
  value: number;
  goal: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0;
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {children && <span className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{children}</span>}
    </span>
  );
}
