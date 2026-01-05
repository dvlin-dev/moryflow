import type { ReactNode } from 'react'
import { cn } from '@memai/ui/lib'

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: 'default' | 'wide' | 'narrow'
}

const sizeClasses = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-4xl',
}

export function Container({
  children,
  className,
  size = 'default',
}: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 md:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </div>
  )
}
