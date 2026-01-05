/**
 * 健康状态显示正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 3: 健康状态显示正确性**
 * **Validates: Requirements 3.2**
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

/** 健康状态类型 */
type HealthStatusValue = 'healthy' | 'degraded' | 'unhealthy'

/** 健康状态颜色映射 */
const HEALTH_COLORS: Record<HealthStatusValue, string> = {
  healthy: 'text-green-600 dark:text-green-400',
  degraded: 'text-yellow-600 dark:text-yellow-400',
  unhealthy: 'text-red-600 dark:text-red-400',
}

/** 健康状态指示器颜色 */
const HEALTH_INDICATOR: Record<HealthStatusValue, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
}

/** 健康状态文本 */
const HEALTH_TEXT: Record<HealthStatusValue, string> = {
  healthy: '正常',
  degraded: '降级',
  unhealthy: '异常',
}

/**
 * 获取健康状态对应的颜色类
 */
function getHealthColor(status: HealthStatusValue): string {
  return HEALTH_COLORS[status]
}

/**
 * 获取健康状态对应的指示器颜色
 */
function getHealthIndicator(status: HealthStatusValue): string {
  return HEALTH_INDICATOR[status]
}

/**
 * 获取健康状态对应的文本
 */
function getHealthText(status: HealthStatusValue): string {
  return HEALTH_TEXT[status]
}

describe('属性 3: 健康状态显示正确性', () => {
  it('对于任意 healthy 状态，应返回绿色相关样式', () => {
    const color = getHealthColor('healthy')
    const indicator = getHealthIndicator('healthy')
    const text = getHealthText('healthy')

    expect(color).toContain('green')
    expect(indicator).toContain('green')
    expect(text).toBe('正常')
  })

  it('对于任意 degraded 状态，应返回黄色相关样式', () => {
    const color = getHealthColor('degraded')
    const indicator = getHealthIndicator('degraded')
    const text = getHealthText('degraded')

    expect(color).toContain('yellow')
    expect(indicator).toContain('yellow')
    expect(text).toBe('降级')
  })

  it('对于任意 unhealthy 状态，应返回红色相关样式', () => {
    const color = getHealthColor('unhealthy')
    const indicator = getHealthIndicator('unhealthy')
    const text = getHealthText('unhealthy')

    expect(color).toContain('red')
    expect(indicator).toContain('red')
    expect(text).toBe('异常')
  })

  it('对于任意健康状态，颜色映射应保持一致性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<HealthStatusValue>('healthy', 'degraded', 'unhealthy'),
        (status) => {
          const color = getHealthColor(status)
          const indicator = getHealthIndicator(status)
          const text = getHealthText(status)

          // 颜色和指示器应该使用相同的颜色系
          const colorMap: Record<HealthStatusValue, string> = {
            healthy: 'green',
            degraded: 'yellow',
            unhealthy: 'red',
          }

          const expectedColor = colorMap[status]
          return (
            color.includes(expectedColor) &&
            indicator.includes(expectedColor) &&
            text.length > 0
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意健康状态，所有映射应该有对应的值', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<HealthStatusValue>('healthy', 'degraded', 'unhealthy'),
        (status) => {
          return (
            HEALTH_COLORS[status] !== undefined &&
            HEALTH_INDICATOR[status] !== undefined &&
            HEALTH_TEXT[status] !== undefined
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('健康状态映射应该是完整的（覆盖所有状态）', () => {
    const allStatuses: HealthStatusValue[] = ['healthy', 'degraded', 'unhealthy']

    expect(Object.keys(HEALTH_COLORS)).toHaveLength(allStatuses.length)
    expect(Object.keys(HEALTH_INDICATOR)).toHaveLength(allStatuses.length)
    expect(Object.keys(HEALTH_TEXT)).toHaveLength(allStatuses.length)

    allStatuses.forEach((status) => {
      expect(HEALTH_COLORS).toHaveProperty(status)
      expect(HEALTH_INDICATOR).toHaveProperty(status)
      expect(HEALTH_TEXT).toHaveProperty(status)
    })
  })
})
