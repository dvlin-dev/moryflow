import en from './en'

const ja = {
  required: 'この項目は必須です',
  email: '有効なメールアドレスを入力してください',
  url: '有効なURLを入力してください',
  number: '有効な数値を入力してください',
  integer: '有効な整数を入力してください',
  min: '値は{{min}}以上である必要があります',
  max: '値は{{max}}以下である必要があります',
  minLength: '{{min}}文字以上である必要があります',
  maxLength: '{{max}}文字以下である必要があります',
  pattern: '無効な形式です',
  unique: 'この値は既に存在します',
  confirmed: '値が一致しません',

  // 補足の不足しているキー
  emailRequired: 'メールアドレスは必須です',
  emailInvalid: '有効なメールアドレスを入力してください',
  passwordMinLength: 'パスワードは{{min}}文字以上である必要があります',
  passwordMismatch: 'パスワードが一致しません',
  usernameMinLengthError: 'ユーザー名は{{min}}文字以上である必要があります（現在{{current}}文字）',

  // ========== MCP/Provider 検証 ==========
  enterName: '名前を入力してください',
  enterCommand: 'コマンドを入力してください',
  invalidUrlFormat: 'URLの形式が無効です',
  emailMismatch: 'メールアドレスが一致しません',
} as const satisfies Record<keyof typeof en, string>

export default ja