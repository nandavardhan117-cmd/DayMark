import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover active:translate-y-px shadow-sm disabled:bg-brand/50',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2 active:translate-y-px',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  danger:
    'bg-danger text-white hover:opacity-90 active:translate-y-px disabled:opacity-50',
  soft: 'bg-brand-soft text-brand hover:opacity-85 active:translate-y-px',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /** Icon rendered before the label. */
  icon?: ReactNode
  /** Icon rendered after the label. */
  trailing?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  trailing,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'disabled:cursor-not-allowed select-none whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {trailing}
    </button>
  )
}
