import en from './en'

const ja = {
  online: 'オンライン',
  offline: 'オフライン',
  away: '離席中',
  busy: '取り込み中',
  available: '利用可能',
  connecting: '接続中...',
  disconnected: '切断',
  error: 'エラー',
  loading: '読み込み中',
  syncing: '同期中',
  uploading: 'アップロード中',
  downloading: 'ダウンロード中',
  processing: '処理中',
} as const satisfies Record<keyof typeof en, string>

export default ja