/**
 * [PROPS]: { showWatermark?: boolean } - 是否显示水印
 * [POS]: 页脚组件，显示 Moryflow 品牌
 */

interface FooterProps {
  showWatermark?: boolean;
}

export function Footer({ showWatermark = true }: FooterProps) {
  if (!showWatermark) return null;

  return (
    <footer
      style={{
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
      }}
    >
      <a
        href="https://moryflow.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-sm)',
          textDecoration: 'none',
          transition: 'var(--transition-colors)',
        }}
      >
        Made with Moryflow
      </a>
    </footer>
  );
}
