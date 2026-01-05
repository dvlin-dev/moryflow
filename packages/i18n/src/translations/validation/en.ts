const en = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  number: 'Please enter a valid number',
  integer: 'Please enter a valid integer',
  min: 'Value must be at least {{min}}',
  max: 'Value must be at most {{max}}',
  minLength: 'Must be at least {{min}} characters',
  maxLength: 'Must be at most {{max}} characters',
  pattern: 'Invalid format',
  unique: 'This value already exists',
  confirmed: 'Values do not match',

  // 补充缺失的keys
  emailRequired: 'Email is required',
  emailInvalid: 'Please enter a valid email address',
  passwordMinLength: 'Password must be at least {{min}} characters',
  passwordMismatch: 'Passwords do not match',
  usernameMinLengthError: 'Username must be at least {{min}} characters (currently {{current}})',

  // ========== MCP/Provider 验证 ==========
  enterName: 'Please enter a name',
  enterCommand: 'Please enter a command',
  invalidUrlFormat: 'Invalid URL format',
  emailMismatch: 'Email does not match',
} as const;

export default en;
