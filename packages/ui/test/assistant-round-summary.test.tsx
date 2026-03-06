import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantRoundSummary } from '../src/ai/assistant-round-summary';

describe('AssistantRoundSummary', () => {
  it('renders summary label', () => {
    render(<AssistantRoundSummary label="Processed 5m 10s" open={false} />);
    expect(screen.getByRole('button', { name: 'Processed 5m 10s' })).not.toBeNull();
  });

  it('uses downward chevron when open and rightward when closed', () => {
    const { rerender } = render(<AssistantRoundSummary label="Summary" open={false} />);
    const icon = screen.getByRole('button', { name: 'Summary' }).querySelector('svg');
    expect(icon?.className.baseVal ?? String(icon?.className)).toContain('-rotate-90');

    rerender(<AssistantRoundSummary label="Summary" open />);
    const openIcon = screen.getByRole('button', { name: 'Summary' }).querySelector('svg');
    const className = openIcon?.className.baseVal ?? String(openIcon?.className);
    expect(className).toContain('rotate-0');
  });
});
