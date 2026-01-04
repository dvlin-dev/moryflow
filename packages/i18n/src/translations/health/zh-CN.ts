import en from './en'

type HealthTranslation = typeof en
type DeepStringShape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? DeepStringShape<T[K]>
      : T[K]
}

const zhCN = {
  status: {
    title: 'Apple 健康',
    notSupportedTitle: '暂不可用',
    notSupportedDescription: '当前设备无法使用 Apple 健康，健康模块暂不可用。',
    notSupportedHint: '请在支持的 iPhone 上使用或检查系统设置。',
    permissionsTitle: '等待设置',
    permissionsDescription: '请授权我们读取健康数据，所有信息仅保存在本地。',
    partiallyConnectedTitle: '部分已连接',
    connectedDescription: '已同步 {{count}} 项健康指标。',
    connectedTitle: '一切就绪',
    syncing: '同步中…',
    loading: '正在加载健康数据…',
    errorLabel: '同步失败：{{message}}',
    lastSynced: '上次同步：{{relative}}',
    lastSyncedNever: '尚未同步',
    openHealthUnavailable: '无法打开“健康”App。',
  },
  actions: {
    allowAccess: '授权访问',
    managePermissions: '在“健康”App 中管理',
    syncNow: '立即同步',
    syncing: '同步中…',
  },
  overview: {
    highlightsTitle: '今日重点',
    empty: '今日暂无记录。',
    noTodayData: '收到最新数据后，我们会在此展示今日概览。',
  },
  summary: {
    viewDetail: '查看健康概览',
  },
  trend: {
    title: '趋势分析',
    subtitle: '{{metric}} 最近趋势',
    empty: '暂无趋势数据，可稍后下拉同步。',
    range: {
      7: '7 天',
      30: '30 天',
      90: '90 天',
    },
  },
  moodCheckin: {
    title: '心情记录',
    description: '回顾最近一次心情，持续记录属于自己的节奏。',
    lastRecorded: '最近记录：{{relative}}',
    noData: '尚未同步心情记录。',
    openHealth: '在“健康”App 记录',
    openHealthError: '无法打开“健康”App。',
    syncMood: '同步心情',
  },
  units: {
    steps: '步',
    kilometers: '公里',
    kcal: '千卡',
    bpm: '次/分',
    hourShort: '小时',
    minuteShort: '分钟',
  },
  metric: {
    noData: '暂无数据',
    sampleCount: '共 {{count}} 条记录',
    stepCount: {
      title: '步数',
    },
    distanceWalkingRunning: {
      title: '行走距离',
    },
    activeEnergyBurned: {
      title: '活动能量',
    },
    appleExerciseTime: {
      title: '锻炼分钟',
    },
    appleStandTime: {
      title: '站立分钟',
    },
    heartRate: {
      title: '心率',
      range: '范围 {{min}} - {{max}} 次/分',
    },
    restingHeartRate: {
      title: '静息心率',
    },
    hrvSdnn: {
      title: '心率变异性（SDNN）',
    },
    sleepAnalysis: {
      title: '睡眠时长',
    },
    mindfulSession: {
      title: '正念时长',
    },
    mood: {
      title: '心情',
    },
    defaultTitle: '健康指标',
  },
  moodClassificationPositive: '积极',
  moodClassificationNeutral: '平衡',
  moodClassificationNegative: '偏低',
  moodClassificationUnknown: '未记录',
  moodScore: '分数 {{value}}',
} as const satisfies DeepStringShape<HealthTranslation>

export default zhCN
