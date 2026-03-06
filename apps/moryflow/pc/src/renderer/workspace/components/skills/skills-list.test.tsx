import { fireEvent, render, screen, within } from '@testing-library/react';
import type { RecommendedSkill, SkillSummary } from '@shared/ipc';
import { describe, expect, it, vi } from 'vitest';
import { SkillsList } from './skills-list';

const installedSkills: SkillSummary[] = [
  {
    name: 'installed-skill',
    title: 'Installed skill',
    description: 'Installed description',
    enabled: true,
    location: '/tmp/installed-skill',
    updatedAt: 1,
  },
];

const recommendedSkills: RecommendedSkill[] = [
  {
    name: 'recommended-skill',
    title: 'Recommended skill',
    description: 'Recommended description',
  },
];

describe('SkillsList', () => {
  it('renders recommended card without nested button and keeps install action clickable', () => {
    const onOpenDetail = vi.fn();
    const onInstallRecommended = vi.fn();

    render(
      <SkillsList
        loading={false}
        skills={installedSkills}
        recommendedSkills={recommendedSkills}
        search=""
        onOpenDetail={onOpenDetail}
        onInstallRecommended={onInstallRecommended}
      />
    );

    expect(screen.getByText('Installed skill').closest('button')).not.toBeNull();
    expect(screen.getByText('Recommended skill').closest('button')).toBeNull();

    const recommendedSection = screen
      .getByRole('heading', { name: 'Recommended' })
      .closest('section');
    expect(recommendedSection).not.toBeNull();
    const installButton = within(recommendedSection as HTMLElement).getByRole('button');
    fireEvent.click(installButton);

    expect(onInstallRecommended).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).toHaveBeenCalledTimes(0);
  });
});
