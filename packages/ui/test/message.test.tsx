import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { Message } from '../src/ai/message';

describe('Message', () => {
  it('applies assistant class when from=assistant', () => {
    const { container } = render(<Message from="assistant" />);
    expect(container.querySelector('.is-assistant')).not.toBeNull();
  });

  it('applies user class when from=user', () => {
    const { container } = render(<Message from="user" />);
    expect(container.querySelector('.is-user')).not.toBeNull();
  });
});
