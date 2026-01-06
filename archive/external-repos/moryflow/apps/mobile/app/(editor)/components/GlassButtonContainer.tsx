import { GlassButtonContainer as BaseGlassButtonContainer } from '@/components/ui/glass-button-container'
import { FLOATING_BUTTON_SIZE } from '../const'

/**
 * Editor 专用玻璃按钮容器（固定尺寸）
 */
export function GlassButtonContainer({ children }: { children: React.ReactNode }) {
  return <BaseGlassButtonContainer size={FLOATING_BUTTON_SIZE}>{children}</BaseGlassButtonContainer>
}
