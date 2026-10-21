import { useId } from 'react';
import './chili-progress-bar.css';

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);

export function ChiliProgressBar({
  value,
  label,
  valueText,
  testId,
}: {
  value: number;
  label: string;
  valueText?: string;
  testId?: string;
}) {
  const pct = clamp(value);
  const uid = useId().replace(/:/g, '');
  return <div
    className="chili-progress"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(pct)}
    aria-valuetext={valueText ?? `${Math.round(pct)}%`}
    data-testid={testId}
    style={{ ['--chili-pct' as string]: pct / 100 }}
  >
    <div className="chili-progress-track">
      <div className="chili-progress-fill">
        <div className="chili-progress-gradient" />
      </div>
    </div>
    <div className="chili-progress-marker" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="chili-progress-svg" focusable="false">
        <defs>
          <linearGradient id={`flame-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff5a1f" />
            <stop offset="1" stopColor="#ffc233" />
          </linearGradient>
          <linearGradient id={`pepper-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ef4a2b" />
            <stop offset="1" stopColor="#b3200f" />
          </linearGradient>
        </defs>
        <path d="M14 20c-4-4-3-10 2-15 1 4 4 5 5 9 1-2 1-4 0-6 5 3 8 9 5 14-1 2-3 3-5 3H17c-2 0-3-2-3-5Z" fill={`url(#flame-${uid})`} stroke="#fffaf4" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M24.6 15.2c-3.2-.6-6.2.9-8.3 3.9-2.6 3.7-3.6 8-1.3 10.4 2.1 2.2 6.3 2.2 10-.1 3.8-2.3 6.4-6.2 5.3-9.6-.8-2.5-3.1-4.3-5.7-4.6Z" fill={`url(#pepper-${uid})`} stroke="#fffaf4" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M24.4 15.4c-.7-1.9-.2-3.7 1.2-5 1.2 1.3 1.6 3 .6 5.1" fill="none" stroke="#5f8a3a" strokeWidth="2" strokeLinecap="round" />
        <path d="M18.8 21c1.4-1.8 3.4-2.9 5.5-3" fill="none" stroke="#ff9a82" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
      </svg>
    </div>
  </div>;
}
