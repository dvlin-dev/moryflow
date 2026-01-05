import en from './en'

const zhCN = {
  online: '在线',
  offline: '离线',
  away: '离开',
  busy: '忙碌',
  available: '可用',
  connecting: '连接中...',
  disconnected: '已断开',
  error: '错误',
  loading: '加载中',
  syncing: '同步中',
  uploading: '上传中',
  downloading: '下载中',
  processing: '处理中',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
