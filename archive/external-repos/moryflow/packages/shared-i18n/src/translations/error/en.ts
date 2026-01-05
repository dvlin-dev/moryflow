const en = {
  generic: 'An error occurred',
  network: 'Network error',
  server: 'Server error',
  client: 'Client error',
  validation: 'Validation error',
  authentication: 'Authentication error',
  authorization: 'Authorization error',
  notFound: 'Not found',
  conflict: 'Conflict error',
  rateLimit: 'Rate limit exceeded',
  maintenance: 'Service under maintenance',
  unknown: 'Unknown error',
  // UI error boundary additions
  appErrorDescription: 'Sorry, the application encountered an unexpected error. We have logged this issue.',
  devErrorDetails: 'Error details (development):',
  viewStackTrace: 'View stack trace',
  viewComponentStack: 'View component stack',
  resolutionIntro: 'You can try the following to resolve this:',
  resolutionActionRetry: 'Click "Retry" to continue using the app',
  resolutionActionRefresh: 'Refresh the page to reload the app',
  resolutionActionGoHome: 'Return to the home page to start over',
  resolutionActionContact: 'If the issue persists, please contact support',

  // OSS service errors
  ossSecretNotConfigured: 'EXPO_PUBLIC_OSS_SECRET not configured',
  uploadFailed: 'Upload failed',
  transferFailed: 'Transfer failed',
} as const

export default en
