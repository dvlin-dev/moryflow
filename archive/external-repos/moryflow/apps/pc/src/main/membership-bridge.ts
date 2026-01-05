import type { MembershipConfig } from '@moryflow/agents-runtime'
import { MEMBERSHIP_API_URL } from '@moryflow/shared-api'

/** 会员模型状态 */
interface MembershipState {
  enabled: boolean
  token: string | null
}

/** 会员桥接模块 - 管理 main 进程中的会员状态 */
class MembershipBridge {
  private state: MembershipState = {
    enabled: true,
    token: null,
  }
  private listeners: Set<() => void> = new Set()

  /** 获取当前会员配置 */
  getConfig(): MembershipConfig {
    return {
      enabled: this.state.enabled,
      apiUrl: MEMBERSHIP_API_URL,
      token: this.state.token,
    }
  }

  /** 同步 token（由 renderer 调用） */
  syncToken(token: string | null): void {
    const changed = this.state.token !== token
    this.state.token = token
    if (changed) {
      this.notifyListeners()
    }
  }

  /** 设置启用状态 */
  setEnabled(enabled: boolean): void {
    const changed = this.state.enabled !== enabled
    this.state.enabled = enabled
    if (changed) {
      this.notifyListeners()
    }
  }

  /** 添加状态变更监听器 */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 通知所有监听器 */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (error) {
        console.error('[membership-bridge] listener error:', error)
      }
    }
  }
}

/** 单例实例 */
export const membershipBridge = new MembershipBridge()
