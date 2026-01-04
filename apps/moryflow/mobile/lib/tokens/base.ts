/**
 * Design Tokens - Notion 风格
 *
 * 设计原则：
 * 1. 通用优先：使用语义化命名，避免模块特定命名
 * 2. 黑白灰为主：彩色仅用于状态和强调
 * 3. 微妙层次：通过透明度和灰度变化创造层次
 * 4. 暗黑适配：每个 token 都有 light/dark 两种值
 */

export type ThemeMode = 'light' | 'dark'

type TokenFormat = 'hsl' | 'raw'

type TokenDefinition = {
  readonly cssVariable?: string
  readonly format?: TokenFormat
  readonly includeInTheme?: boolean
  readonly values: Readonly<Record<ThemeMode, string>>
}

const TOKEN_DEFINITIONS = {
  // ═══════════════════════════════════════════════════════════
  // 基础语义色板（同步 global.css / tailwind）
  // ═══════════════════════════════════════════════════════════

  background: {
    cssVariable: 'background',
    format: 'hsl',
    values: { light: '0 0% 97.3%', dark: '0 0% 3.9%' },
  },
  foreground: {
    cssVariable: 'foreground',
    format: 'hsl',
    values: { light: '0 0% 3.9%', dark: '0 0% 98%' },
  },
  card: {
    cssVariable: 'card',
    format: 'hsl',
    values: { light: '0 0% 100%', dark: '0 0% 3.9%' },
  },
  cardForeground: {
    cssVariable: 'card-foreground',
    format: 'hsl',
    values: { light: '0 0% 3.9%', dark: '0 0% 98%' },
  },
  popover: {
    cssVariable: 'popover',
    format: 'hsl',
    values: { light: '0 0% 100%', dark: '0 0% 3.9%' },
  },
  popoverForeground: {
    cssVariable: 'popover-foreground',
    format: 'hsl',
    values: { light: '0 0% 3.9%', dark: '0 0% 98%' },
  },
  primary: {
    cssVariable: 'primary',
    format: 'hsl',
    values: { light: '0 0% 9%', dark: '0 0% 98%' },
  },
  primaryForeground: {
    cssVariable: 'primary-foreground',
    format: 'hsl',
    values: { light: '0 0% 98%', dark: '0 0% 9%' },
  },
  secondary: {
    cssVariable: 'secondary',
    format: 'hsl',
    values: { light: '0 0% 96.1%', dark: '0 0% 14.9%' },
  },
  secondaryForeground: {
    cssVariable: 'secondary-foreground',
    format: 'hsl',
    values: { light: '0 0% 9%', dark: '0 0% 98%' },
  },
  muted: {
    cssVariable: 'muted',
    format: 'hsl',
    values: { light: '0 0% 96.1%', dark: '0 0% 14.9%' },
  },
  mutedForeground: {
    cssVariable: 'muted-foreground',
    format: 'hsl',
    values: { light: '0 0% 45.1%', dark: '0 0% 63.9%' },
  },
  accent: {
    cssVariable: 'accent',
    format: 'hsl',
    values: { light: '0 0% 96.1%', dark: '0 0% 14.9%' },
  },
  accentForeground: {
    cssVariable: 'accent-foreground',
    format: 'hsl',
    values: { light: '0 0% 9%', dark: '0 0% 98%' },
  },
  destructive: {
    cssVariable: 'destructive',
    format: 'hsl',
    values: { light: '0 84.2% 60.2%', dark: '0 70.9% 59.4%' },
  },
  destructiveForeground: {
    cssVariable: 'destructive-foreground',
    format: 'hsl',
    values: { light: '0 0% 98%', dark: '0 0% 98%' },
  },
  border: {
    cssVariable: 'border',
    format: 'hsl',
    values: { light: '0 0% 89.8%', dark: '0 0% 14.9%' },
  },
  input: {
    cssVariable: 'input',
    format: 'hsl',
    values: { light: '0 0% 89.8%', dark: '0 0% 14.9%' },
  },
  ring: {
    cssVariable: 'ring',
    format: 'hsl',
    values: { light: '0 0% 63%', dark: '300 0% 45%' },
  },
  radius: {
    cssVariable: 'radius',
    values: { light: '0.625rem', dark: '0.625rem' },
  },

  // ═══════════════════════════════════════════════════════════
  // 通用 UI 元素（Notion 风格）
  // ═══════════════════════════════════════════════════════════

  // -- 图标 --
  icon: {
    values: { light: '#000000', dark: '#ffffff' },
  },
  iconMuted: {
    values: { light: '#6b7280', dark: '#9ca3af' },
  },
  iconDisabled: {
    values: { light: '#9ca3af', dark: '#4b5563' },
  },

  // -- 文字 --
  textPrimary: {
    values: { light: '#000000', dark: '#ffffff' },
  },
  textSecondary: {
    values: { light: '#6b7280', dark: '#9ca3af' },
  },
  textTertiary: {
    values: { light: '#9ca3af', dark: '#6b7280' },
  },
  textInverse: {
    values: { light: '#ffffff', dark: '#000000' },
  },

  // -- 表面/容器 --
  pageBackground: {
    cssVariable: 'page-background',
    values: { light: '#f8f8f8', dark: 'rgb(10, 10, 12)' },
  },
  surfacePrimary: {
    cssVariable: 'surface-primary',
    values: { light: '#ffffff', dark: '#1c1c1e' },
  },
  surfaceSecondary: {
    cssVariable: 'surface-secondary',
    values: { light: '#f5f5f5', dark: '#2c2c2e' },
  },
  surfaceElevated: {
    cssVariable: 'surface-elevated',
    values: { light: '#ffffff', dark: '#2c2c2e' },
  },
  surfaceHover: {
    cssVariable: 'surface-hover',
    values: { light: 'rgba(0, 0, 0, 0.03)', dark: 'rgba(255, 255, 255, 0.05)' },
  },
  surfacePressed: {
    cssVariable: 'surface-pressed',
    values: { light: 'rgba(0, 0, 0, 0.06)', dark: 'rgba(255, 255, 255, 0.08)' },
  },
  surfaceSelected: {
    cssVariable: 'surface-selected',
    values: { light: 'rgba(0, 0, 0, 0.05)', dark: 'rgba(255, 255, 255, 0.06)' },
  },
  surface: {
    values: { light: '#ffffff', dark: '#1c1c1e' },
  },

  // -- 边框/分割线 --
  borderLight: {
    values: { light: 'rgba(0, 0, 0, 0.06)', dark: 'rgba(255, 255, 255, 0.06)' },
  },
  borderMedium: {
    values: { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
  },
  borderStrong: {
    values: { light: '#e5e5e5', dark: '#3a3a3c' },
  },
  separator: {
    values: { light: '#e5e7eb', dark: '#333333' },
  },

  // -- 透明覆盖层 --
  overlay: {
    values: { light: 'rgba(0, 0, 0, 0.5)', dark: 'rgba(0, 0, 0, 0.7)' },
  },
  overlayLight: {
    values: { light: 'rgba(0, 0, 0, 0.05)', dark: 'rgba(255, 255, 255, 0.05)' },
  },
  overlayMedium: {
    values: { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
  },

  // -- 阴影 --
  shadow: {
    values: { light: '#000000', dark: '#000000' },
  },

  // -- 玻璃效果 --
  glassBackground: {
    cssVariable: 'glass-background',
    values: { light: 'rgba(255, 255, 255, 0.8)', dark: 'rgba(28, 28, 30, 0.8)' },
  },
  glassBorder: {
    cssVariable: 'glass-border',
    values: { light: 'rgba(0, 0, 0, 0.08)', dark: 'rgba(255, 255, 255, 0.12)' },
  },
  glass: {
    values: { light: 'rgba(255, 255, 255, 0.8)', dark: 'rgba(0, 0, 0, 0.5)' },
  },
  // 液态玻璃导航栏专用
  glassNavBackground: {
    values: { light: 'rgba(255, 255, 255, 0.7)', dark: 'rgba(28, 28, 30, 0.8)' },
  },
  glassNavBorder: {
    values: { light: 'rgba(0, 0, 0, 0.08)', dark: 'rgba(255, 255, 255, 0.12)' },
  },
  glassNavTint: {
    values: { light: 'rgba(0, 0, 0, 0.03)', dark: 'rgba(255, 255, 255, 0.05)' },
  },
  // AI 按钮专用（液态玻璃 + 主色调）
  glassAiButton: {
    values: { light: 'rgba(59, 130, 246, 0.9)', dark: 'rgba(96, 165, 250, 0.9)' },
  },
  glassAiButtonBorder: {
    values: { light: 'rgba(59, 130, 246, 0.3)', dark: 'rgba(96, 165, 250, 0.3)' },
  },
  glassAiButtonIcon: {
    values: { light: '#ffffff', dark: '#ffffff' },
  },

  // ═══════════════════════════════════════════════════════════
  // 功能色（语义化）
  // ═══════════════════════════════════════════════════════════

  success: {
    values: { light: '#22c55e', dark: '#4ade80' },
  },
  successStrong: {
    values: { light: '#10b981', dark: '#34d399' },
  },
  successBg: {
    values: { light: 'rgba(16, 185, 129, 0.15)', dark: 'rgba(52, 211, 153, 0.2)' },
  },
  warning: {
    values: { light: '#f59e0b', dark: '#fbbf24' },
  },
  warningBg: {
    values: { light: 'rgba(245, 158, 11, 0.15)', dark: 'rgba(251, 191, 36, 0.2)' },
  },
  error: {
    values: { light: '#ef4444', dark: '#f87171' },
  },
  errorBg: {
    values: { light: 'rgba(239, 68, 68, 0.15)', dark: 'rgba(248, 113, 113, 0.2)' },
  },
  info: {
    values: { light: '#3b82f6', dark: '#60a5fa' },
  },
  infoBg: {
    values: { light: 'rgba(59, 130, 246, 0.15)', dark: 'rgba(96, 165, 250, 0.2)' },
  },

  // ═══════════════════════════════════════════════════════════
  // 会员等级色（Notion 风格徽章）
  // ═══════════════════════════════════════════════════════════

  tierFree: {
    cssVariable: 'tier-free',
    values: { light: '#6b7280', dark: '#9ca3af' },
  },
  tierFreeBg: {
    cssVariable: 'tier-free-bg',
    values: { light: 'rgba(107, 114, 128, 0.15)', dark: 'rgba(156, 163, 175, 0.2)' },
  },
  tierBasic: {
    cssVariable: 'tier-basic',
    values: { light: '#3b82f6', dark: '#60a5fa' },
  },
  tierBasicBg: {
    cssVariable: 'tier-basic-bg',
    values: { light: 'rgba(59, 130, 246, 0.15)', dark: 'rgba(96, 165, 250, 0.2)' },
  },
  tierPro: {
    cssVariable: 'tier-pro',
    values: { light: '#8b5cf6', dark: '#a78bfa' },
  },
  tierProBg: {
    cssVariable: 'tier-pro-bg',
    values: { light: 'rgba(139, 92, 246, 0.15)', dark: 'rgba(167, 139, 250, 0.2)' },
  },
  tierLicense: {
    cssVariable: 'tier-license',
    values: { light: '#f59e0b', dark: '#fbbf24' },
  },
  tierLicenseBg: {
    cssVariable: 'tier-license-bg',
    values: { light: 'rgba(245, 158, 11, 0.15)', dark: 'rgba(251, 191, 36, 0.2)' },
  },

  // ═══════════════════════════════════════════════════════════
  // 代码/Markdown 样式
  // ═══════════════════════════════════════════════════════════

  codeText: {
    values: { light: '#c7254e', dark: '#f87171' },
  },
  codeBg: {
    values: { light: '#f5f5f5', dark: '#1e1e1e' },
  },
  codeBorder: {
    values: { light: '#e5e5e5', dark: '#404040' },
  },
  link: {
    values: { light: '#2563eb', dark: '#60a5fa' },
  },
  quoteBorder: {
    values: { light: '#d1d5db', dark: '#4b5563' },
  },
  quoteText: {
    values: { light: '#6b7280', dark: '#9ca3af' },
  },

  // ═══════════════════════════════════════════════════════════
  // 高亮色（编辑器/标记）
  // ═══════════════════════════════════════════════════════════

  highlightYellow: {
    values: { light: '#fef3c7', dark: 'rgba(254, 243, 199, 0.3)' },
  },
  highlightGreen: {
    values: { light: '#d1fae5', dark: 'rgba(209, 250, 229, 0.3)' },
  },
  highlightBlue: {
    values: { light: '#dbeafe', dark: 'rgba(219, 234, 254, 0.3)' },
  },
  highlightPink: {
    values: { light: '#fce7f3', dark: 'rgba(252, 231, 243, 0.3)' },
  },
  highlightGray: {
    values: { light: '#f3f4f6', dark: 'rgba(55, 65, 81, 0.5)' },
  },

  // ═══════════════════════════════════════════════════════════
  // 加载指示器
  // ═══════════════════════════════════════════════════════════

  spinner: {
    values: { light: '#6b7280', dark: '#9ca3af' },
  },
  spinnerOnPrimary: {
    values: { light: '#ffffff', dark: '#000000' },
  },

  // ═══════════════════════════════════════════════════════════
  // 图表色板（仅 CSS 变量）
  // ═══════════════════════════════════════════════════════════

  chart1: {
    cssVariable: 'chart-1',
    format: 'hsl',
    includeInTheme: false,
    values: { light: '12 76% 61%', dark: '220 70% 50%' },
  },
  chart2: {
    cssVariable: 'chart-2',
    format: 'hsl',
    includeInTheme: false,
    values: { light: '173 58% 39%', dark: '160 60% 45%' },
  },
  chart3: {
    cssVariable: 'chart-3',
    format: 'hsl',
    includeInTheme: false,
    values: { light: '197 37% 24%', dark: '30 80% 55%' },
  },
  chart4: {
    cssVariable: 'chart-4',
    format: 'hsl',
    includeInTheme: false,
    values: { light: '43 74% 66%', dark: '280 65% 60%' },
  },
  chart5: {
    cssVariable: 'chart-5',
    format: 'hsl',
    includeInTheme: false,
    values: { light: '27 87% 67%', dark: '340 75% 55%' },
  },
} as const

// ═══════════════════════════════════════════════════════════
// 类型和工具函数
// ═══════════════════════════════════════════════════════════

const tokenDefinitionsCheck: Record<string, TokenDefinition> = TOKEN_DEFINITIONS
void tokenDefinitionsCheck

type TokenDefinitions = typeof TOKEN_DEFINITIONS

type ThemeTokenName = {
  [K in keyof TokenDefinitions]: TokenDefinitions[K] extends { includeInTheme: false }
    ? never
    : K
}[keyof TokenDefinitions]

type CssVariableName = {
  [K in keyof TokenDefinitions]: TokenDefinitions[K] extends { cssVariable: infer T extends string }
    ? T
    : never
}[keyof TokenDefinitions]

export type ThemeTokens = { readonly [K in ThemeTokenName]: string }

type CssVariableTokens = { readonly [K in CssVariableName]: string }

const HSL_FORMAT: TokenFormat = 'hsl'

function getTokenEntries() {
  return Object.keys(TOKEN_DEFINITIONS) as Array<keyof TokenDefinitions>
}

function getDefinition(tokenKey: keyof TokenDefinitions): TokenDefinition {
  return TOKEN_DEFINITIONS[tokenKey] as TokenDefinition
}

function buildThemeTokens(mode: ThemeMode): ThemeTokens {
  const result: Record<string, string> = {}

  for (const tokenKey of getTokenEntries()) {
    const definition = getDefinition(tokenKey)
    if (definition.includeInTheme === false) {
      continue
    }

    const value = definition.values[mode]
    if ((definition.format ?? 'raw') === HSL_FORMAT) {
      result[tokenKey as string] = `hsl(${value})`
    } else {
      result[tokenKey as string] = value
    }
  }

  return result as ThemeTokens
}

function buildCssVariables(mode: ThemeMode): CssVariableTokens {
  const result: Record<string, string> = {}

  for (const tokenKey of getTokenEntries()) {
    const definition = getDefinition(tokenKey)
    const cssVariable = definition.cssVariable
    if (!cssVariable) {
      continue
    }

    result[cssVariable] = definition.values[mode]
  }

  return result as CssVariableTokens
}

export const themeTokensByMode = {
  light: buildThemeTokens('light'),
  dark: buildThemeTokens('dark'),
} as const satisfies Record<ThemeMode, ThemeTokens>

export const cssVariablesByMode = {
  light: buildCssVariables('light'),
  dark: buildCssVariables('dark'),
} as const satisfies Record<ThemeMode, CssVariableTokens>

export { TOKEN_DEFINITIONS as tokenDefinitions }
