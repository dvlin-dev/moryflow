import { useState } from 'react';
import { ArrowRight01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import { Button, Icon } from '@aiget/ui';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function UrlInput({ onSubmit, isLoading, disabled }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) {
      // 自动添加 https:// 前缀（如果用户没有输入协议）
      const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      onSubmit(fullUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
          https://
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          className="h-11 w-full border border-border bg-background pl-[72px] pr-4 font-mono text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || disabled || !url.trim()}
        className="h-11 font-mono"
      >
        {isLoading ? (
          <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Capture
            <Icon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
