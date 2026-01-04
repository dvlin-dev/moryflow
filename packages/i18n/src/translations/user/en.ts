const en = {
  profile: 'Profile',
  settings: 'Settings',
  account: 'Account',
  preferences: 'Preferences',
  notifications: 'Notifications',
  privacy: 'Privacy',
  security: 'Security',
  language: 'Language',
  theme: 'Theme',
  name: 'Name',
  bio: 'Bio',
  // avatar removed
  changePassword: 'Change Password',
  twoFactorAuth: 'Two-Factor Authentication',
  deleteAccount: 'Delete Account',
  exportData: 'Export Data',
  // 错误信息
  updateFailed: 'Failed to update profile',
  uploadFailed: 'Failed to upload file',
  deleteFailed: 'Failed to delete account',
  usernameRequired: 'Username cannot be empty',
  usernameTooShort: 'Username must be at least 3 characters',
  usernameTooLong: 'Username cannot exceed 20 characters',
  usernameInvalidFormat: 'Username can only contain letters, numbers, underscores and hyphens',
  currentPasswordRequired: 'Please enter current password',
  newPasswordRequired: 'Please enter new password',
  confirmPasswordRequired: 'Please confirm new password',
  passwordTooShort: 'Password must be at least 6 characters',
  passwordMismatch: 'Passwords do not match',
  verificationCodeRequired: 'Please enter verification code',
  verificationCodeInvalidLength: 'Verification code must be 6 digits',
  verificationCodeSendFailed: 'Failed to send verification code, please try again',
  passwordChangeFailed: 'Failed to change password, please try again',
  emailUnavailable: 'Email address is not available',
  emailInvalid: 'Please enter a valid email address',
  // 成功消息
  profileUpdated: 'Profile updated successfully',
  passwordChanged: 'Password changed successfully',
  accountDeleted: 'Account deleted successfully',
  dataExported: 'Data exported successfully',
  // 新增移动端用户相关
  defaultUsername: 'User',
  noEmail: 'No email',

  // 补充缺失的keys
  usernameInputPlaceholder: 'Enter username ({{min}}-{{max}} characters)',
  usernameMinLengthError: 'Username must be at least {{min}} characters (currently {{current}})',
  usernameFormatHint: 'Supports letters, numbers, underscores and hyphens',
  emailNotEditable: 'Email address cannot be modified',
  username: 'Username',
} as const

export default en
