import { Check, Minus } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean
  /** Renders an indeterminate dash — used for "some tasks done" states. */
  indeterminate?: boolean
  size?: 'sm' | 'md'
  /** Accessible label; falls back to the parent list item context. */
  label?: string
}

/**
 * A styled button acting as a checkbox.
 * We use a <button> rather than <input type="checkbox"> so we can fully control
 * the visuals and animation while keeping native keyboard behaviour.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  size = 'md',
  label,
  className,
  ...rest
}: CheckboxProps) {
  const dimension = size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'
  const iconSize = size === 'sm' ? 12 : 13

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-md border transition-all duration-200',
        'hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        dimension,
        checked || indeterminate
          ? 'border-brand bg-brand text-white'
          : 'border-line-strong bg-surface text-transparent hover:bg-brand-soft',
        className,
      )}
      {...rest}
    >
      {indeterminate ? (
        <Minus size={iconSize} strokeWidth={3} className="transition-transform duration-200" />
      ) : (
        <Check
          size={iconSize}
          strokeWidth={3}
          className={cn(
            'transition-all duration-200',
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      )}
    </button>
  )
}
