interface CaptchaStatusProps {
  checkingStatus: boolean;
  isVerified: boolean;
  hasCaptchaToken: boolean;
  readyMessage?: string;
  pendingMessage?: string;
  className?: string;
}

/**
 * 验证状态提示组件
 */
export function CaptchaStatus({
  checkingStatus,
  isVerified,
  hasCaptchaToken,
  readyMessage = 'Ready to go',
  pendingMessage = 'Complete verification to continue',
  className = 'text-center text-sm',
}: CaptchaStatusProps) {
  if (checkingStatus) {
    return (
      <div className={className}>
        <span className="text-gray-500">Checking status...</span>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className={className}>
        <span className="text-green-600">{readyMessage}</span>
      </div>
    );
  }

  if (hasCaptchaToken) {
    return (
      <div className={className}>
        <span className="text-green-600">Verified - {readyMessage}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className="text-gray-500">{pendingMessage}</span>
    </div>
  );
}
