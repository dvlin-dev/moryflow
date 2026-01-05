import en from './en'

const ja = {
  generic: 'エラーが発生しました',
  network: 'ネットワークエラー',
  server: 'サーバーエラー',
  client: 'クライアントエラー',
  validation: 'バリデーションエラー',
  authentication: '認証エラー',
  authorization: '認可エラー',
  notFound: '見つかりません',
  conflict: '競合エラー',
  rateLimit: 'レート制限を超過しました',
  maintenance: 'サービスはメンテナンス中です',
  unknown: '不明なエラー',
  // UIエラー境界の追加
  appErrorDescription: '申し訳ございませんが、アプリケーションで予期しないエラーが発生しました。この問題はログに記録されました。',
  devErrorDetails: 'エラーの詳細（開発環境）：',
  viewStackTrace: 'スタックトレースを表示',
  viewComponentStack: 'コンポーネントスタックを表示',
  resolutionIntro: '以下の方法で解決を試すことができます：',
  resolutionActionRetry: '"再試行"をクリックしてアプリの使用を継続する',
  resolutionActionRefresh: 'ページを更新してアプリを再読み込みする',
  resolutionActionGoHome: 'ホームページに戻って最初からやり直す',
  resolutionActionContact: '問題が解決しない場合は、サポートにお問い合わせください',

  // OSS サービスエラー
  ossSecretNotConfigured: 'EXPO_PUBLIC_OSS_SECRETが設定されていません',
  uploadFailed: 'アップロードに失敗しました',
  transferFailed: '転送に失敗しました',
} as const satisfies Record<keyof typeof en, string>

export default ja