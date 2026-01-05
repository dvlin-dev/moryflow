import en from './en'

const ja = {
  profile: 'プロフィール',
  settings: '設定',
  account: 'アカウント',
  preferences: '設定',
  notifications: '通知',
  privacy: 'プライバシー',
  security: 'セキュリティ',
  language: '言語',
  theme: 'テーマ',
  name: '名前',
  bio: '自己紹介',
  changePassword: 'パスワードを変更',
  twoFactorAuth: '二要素認証',
  deleteAccount: 'アカウントを削除',
  exportData: 'データをエクスポート',
  // エラーメッセージ
  updateFailed: 'プロフィールの更新に失敗しました',
  uploadFailed: 'ファイルのアップロードに失敗しました',
  deleteFailed: 'アカウントの削除に失敗しました',
  usernameRequired: 'ユーザー名は必須です',
  usernameTooShort: 'ユーザー名は3文字以上である必要があります',
  usernameTooLong: 'ユーザー名は20文字以下である必要があります',
  usernameInvalidFormat: 'ユーザー名は文字、数字、アンダースコア、ハイフンのみ使用可能',
  currentPasswordRequired: '現在のパスワードを入力してください',
  newPasswordRequired: '新しいパスワードを入力してください',
  confirmPasswordRequired: '新しいパスワードを確認してください',
  passwordTooShort: 'パスワードは6文字以上である必要があります',
  passwordMismatch: 'パスワードが一致しません',
  verificationCodeRequired: '認証コードを入力してください',
  verificationCodeInvalidLength: '認証コードは6桁である必要があります',
  verificationCodeSendFailed: '認証コードの送信に失敗しました。再試行してください',
  passwordChangeFailed: 'パスワードの変更に失敗しました。再試行してください',
  emailUnavailable: 'メールアドレスは利用できません',
  emailInvalid: '有効なメールアドレスを入力してください',
  // 成功メッセージ
  profileUpdated: 'プロフィールを更新しました',
  passwordChanged: 'パスワードを変更しました',
  accountDeleted: 'アカウントを削除しました',
  dataExported: 'データをエクスポートしました',
  // 新規追加のモバイルユーザー関連
  defaultUsername: 'ユーザー',
  noEmail: 'メールなし',

  // 補足の不足しているキー
  usernameInputPlaceholder: 'ユーザー名を入力（{{min}}-{{max}}文字）',
  usernameMinLengthError: 'ユーザー名は最低{{min}}文字必要です（現在{{current}}文字）',
  usernameFormatHint: '文字、数字、アンダースコア、ハイフンが使用可能',
  emailNotEditable: 'メールアドレスは変更できません',
  username: 'ユーザー名',
} as const satisfies Record<keyof typeof en, string>

export default ja