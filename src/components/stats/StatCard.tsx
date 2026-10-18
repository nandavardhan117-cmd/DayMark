import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'

const TONES: Record<Tone, { box: string; icon: string }> = {
  brand: { box: 'bg-brand-soft', icon: 'text-brand' },
  success: { box: 'bg-success-soft', icon: 'text-success' },
  warning: { box: 'bg-warning-soft', icon: 'text-warning' },
  danger: { box: 'bg-danger-soft', icon: 'text-danger' },
  neutral: { box: 'bg-surface-2', icon: 'text-ink-3' },
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = 'neutral',
  className,
}: {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  icon: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <div
      className={cn(
        'card flex items-start gap-3.5 p-4 transition-all duration-200 sm:p-5',
        'hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
          TONES[tone].box,
          TONES[tone].icon,
        )}
      >
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {label}
        </p>
        <p className="mt-1 text-[24px] font-bold leading-none tracking-tight text-ink">{value}</p>
        {caption ? (
          <p className="mt-1.5 truncate text-[12.5px] leading-snug text-ink-3">{caption}</p>
        ) : null}
      </div>
    </div>
  )
}
