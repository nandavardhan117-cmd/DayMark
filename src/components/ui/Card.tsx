import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Removes the default padding when you want full-bleed children. */
  flush?: boolean
}

export function Card({ flush = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('card', !flush && 'p-5', 'animate-fade-up', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
