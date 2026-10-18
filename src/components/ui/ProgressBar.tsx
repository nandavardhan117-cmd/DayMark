import { cn } from '@/lib/cn'

type ProgressBarProps = {
  /** 0–1 */
  value: number
  className?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  /** Height class, e.g. 'h-2'. */
  height?: string
}

const TONES = {
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function ProgressBar({
  value,
  className,
  tone = 'brand',
  height = 'h-2',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', height, className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          TONES[tone],
        )}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}
