import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetTierDialog } from './set-tier-dialog'

describe('SetTierDialog', () => {
  it('切换目标用户后应同步表单等级，避免沿用旧值', () => {
    const handleSubmit = vi.fn()
    const handleOpenChange = vi.fn()

    const { rerender } = render(
      <SetTierDialog
        open={true}
        onOpenChange={handleOpenChange}
        currentTier="free"
        onSubmit={handleSubmit}
      />
    )

    rerender(
      <SetTierDialog
        open={true}
        onOpenChange={handleOpenChange}
        currentTier="pro"
        onSubmit={handleSubmit}
      />
    )

    expect(screen.getByRole('combobox')).toHaveTextContent('专业会员')
  })
})
