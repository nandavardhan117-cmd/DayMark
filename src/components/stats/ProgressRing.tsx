import { cn } from '@/lib/cn'

/**
 * SVG donut progress indicator.
 * Pure CSS transitions on stroke-dashoffset give a smooth fill animation.
 */
export function ProgressRing({
  /** 0–1 */
  value,
  size = 92,
  strokeWidth = 8,
  label,
  sublabel,
  tone = 'brand',
  className,
}: {
  value: number
  size?: number
  strokeWidth?: number
  label?: React.ReactNode
  sublabel?: React.ReactNode
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const radius = 50 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)

  const stroke =
    tone === 'success'
      ? 'var(--dm-success)'
      : tone === 'warning'
        ? 'var(--dm-warning)'
        : tone === 'danger'
          ? 'var(--dm-danger)'
          : 'var(--dm-brand)'

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--dm-surface-2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        {label ? (
          <span className="text-[20px] font-bold leading-none tracking-tight text-ink">{label}</span>
        ) : null}
        {sublabel ? (
          <span className="mt-1 text-[11px] font-medium text-ink-3">{sublabel}</span>
        ) : null}
      </div>
    </div>
  )
}
