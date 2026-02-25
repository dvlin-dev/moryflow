import { render, screen } from '@testing-library/react';
import type { EmbedData } from '@moryflow/embed';
import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('../src/hooks/useEmbed', () => ({
  useEmbed: vi.fn(),
}));

import { useEmbed } from '../src/hooks/useEmbed';
import { Embed } from '../src/components/Embed';

const mockedUseEmbed = vi.mocked(useEmbed);

afterEach(() => {
  vi.clearAllMocks();
});

describe('Embed', () => {
  it('renders photo when html is missing', () => {
    const data: EmbedData = {
      type: 'photo',
      version: '1.0',
      url: 'https://example.com/photo.jpg',
      width: 640,
      height: 480,
      title: 'Example Photo',
    };

    mockedUseEmbed.mockReturnValue({
      data,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Embed url="https://example.com" />);

    const image = screen.getByRole('img');
    expect(image.getAttribute('src')).toBe(data.url);
  });

  it('renders link fallback when html is missing', () => {
    const data: EmbedData = {
      type: 'link',
      version: '1.0',
      title: 'Example Link',
    };
    const url = 'https://example.com/article';

    mockedUseEmbed.mockReturnValue({
      data,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Embed url={url} />);

    const link = screen.getByRole('link', { name: 'Example Link' });
    expect(link.getAttribute('href')).toBe(url);
  });
});
