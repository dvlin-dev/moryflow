import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Accordion,
  AccordionItem,
  useAccordionItem,
} from '../src/animate/primitives/base/accordion';

const Probe = () => {
  const { isOpen } = useAccordionItem();
  return <span data-testid="open">{String(isOpen)}</span>;
};

describe('Accordion', () => {
  it('reports open state when value matches', () => {
    render(
      <Accordion value={['alpha']} multiple>
        <AccordionItem value="alpha">
          <Probe />
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('reports closed state when value does not match', () => {
    render(
      <Accordion value={['alpha']} multiple>
        <AccordionItem value="beta">
          <Probe />
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByTestId('open').textContent).toBe('false');
  });
});
