import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    Tooltip: (props: Record<string, unknown>) => <div {...props} />,
    Legend: (props: Record<string, unknown>) => <div {...props} />,
  };
});

import { ChartContainer, ChartTooltipContent } from '../src/components/chart';

describe('ChartTooltipContent', () => {
  it('renders zero values', () => {
    const payload = [
      {
        name: 'visits',
        value: 0,
        dataKey: 'visits',
        payload: { visits: 0 },
        color: '#000',
      },
    ];

    render(
      <ChartContainer config={{ visits: { label: 'Visits', color: '#000' } }}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>
    );

    expect(screen.getByText('0')).toBeTruthy();
  });
});
