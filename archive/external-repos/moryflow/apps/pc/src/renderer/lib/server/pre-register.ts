/**
 * [PROVIDES]: preRegisterApi - 预注册 API 客户端
 * [DEPENDS]: const.ts
 * [POS]: PC 端预注册 API，用于注册前的邮箱验证流程
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { MEMBERSHIP_API_URL } from './const'
import { setStoredToken } from './client'

// ── 类型定义 ────────────────────────────────────────────────

export interface SendOtpParams {
  email: string
  name: string
  password: string
}

export interface VerifyParams {
  email: string
  otp: string
}

export interface VerifyResult {
  token: string
  user: {
    id: string
    email: string
    name: string
    tier: string
    isAdmin: boolean
  }
}

// ── API 实现 ─────────────────────────────────────────────────

/**
 * 预注册 API 客户端
 * 用于注册前的邮箱验证流程
 */
export const preRegisterApi = {
  /**
   * 发送预注册验证码
   * 发送验证码到用户邮箱，同时在服务端临时存储注册信息
   */
  async sendOtp(params: SendOtpParams): Promise<void> {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/pre-register/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      throw new Error((errorData.message as string) || 'Failed to send verification code')
    }
  },

  /**
   * 验证 OTP 并完成注册
   * 验证成功后创建用户账号并返回登录 token
   */
  async verify(params: VerifyParams): Promise<VerifyResult> {
    const response = await fetch(`${MEMBERSHIP_API_URL}/api/pre-register/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      throw new Error((errorData.message as string) || 'Failed to verify code')
    }

    const result = await response.json() as VerifyResult

    // 自动存储 token
    if (result.token) {
      setStoredToken(result.token)
    }

    return result
  },
}
