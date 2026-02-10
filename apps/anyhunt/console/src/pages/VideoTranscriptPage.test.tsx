import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v3';
import VideoTranscriptPage from './VideoTranscriptPage';

vi.mock('@/features/video-transcript-playground', () => ({
  videoTranscriptFormSchema: z.object({
    url: z.string().url(),
  }),
  useVideoTranscriptTasks: () => ({
    data: {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useVideoTranscriptTask: () => ({ data: null, isLoading: false }),
  useCreateVideoTranscriptTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelVideoTranscriptTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('VideoTranscriptPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<VideoTranscriptPage />)).not.toThrow();
    expect(screen.getByText('Video Transcript')).toBeInTheDocument();
    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });
});
