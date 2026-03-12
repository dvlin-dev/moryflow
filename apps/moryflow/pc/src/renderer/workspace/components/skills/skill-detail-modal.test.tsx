/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillDetail, SkillSummary } from '@shared/ipc';
import { SkillDetailModal } from './skill-detail-modal';

const baseSkill: SkillSummary = {
  name: 'algorithmic-art',
  title: 'algorithmic-art',
  description: 'Create algorithmic art with code.',
  enabled: true,
  location: '/tmp/algorithmic-art',
  updatedAt: 1,
};

const buildDetail = (content: string): SkillDetail => ({
  ...baseSkill,
  content,
  files: ['SKILL.md'],
});

describe('SkillDetailModal', () => {
  it('renders skill markdown as formatted content instead of raw markdown text', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail('### Usage\n\n- First item\n\n```ts\nconst answer = 42;\n```')
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Usage', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(document.body.querySelector('pre code')).toHaveTextContent('const answer = 42;');
    expect(screen.queryByText('```ts')).not.toBeInTheDocument();
  });

  it('renders markdown tables inside a constrained rich-text container', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail(
        '| Column |\n| --- |\n| super-long-token-super-long-token-super-long-token-super-long-token |'
      )
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    await waitFor(() => {
      expect(onLoadDetail).toHaveBeenCalledWith(baseSkill.name);
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByText('super-long-token-super-long-token-super-long-token-super-long-token')
    ).toBeInTheDocument();
    const richTextContainer = screen.getByRole('table').parentElement;
    expect(richTextContainer?.className).toContain('[&_table]:table-fixed');
    expect(richTextContainer?.className).toContain('[&_td]:break-words');
  });

  it('sanitizes raw html from skill markdown before injecting into the dialog', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail('# Usage\n\n<script>window.__skillModalXss = true</script>\n\nClick me')
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Usage', level: 1 })).toBeInTheDocument();
    expect(document.body.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>window.__skillModalXss = true</script>')).toBeInTheDocument();
  });

  it('renders markdown links as inert text so javascript urls cannot become clickable anchors', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail('[danger](javascript:alert(1)) and [docs](https://example.com/docs)')
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    const markdownParagraph = await screen.findByText(
      /danger \(javascript:alert\(1\)\) and docs \(https:\/\/example\.com\/docs\)/,
      { selector: 'p' }
    );

    expect(markdownParagraph).toHaveTextContent('danger (javascript:alert(1))');
    expect(markdownParagraph).toHaveTextContent('docs (https://example.com/docs)');
    expect(document.body.querySelector('a')).toBeNull();
  });

  it('renders markdown images as inert text so opening the dialog cannot trigger image fetches', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail('![tracking pixel](https://attacker.example/pixel.png)')
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    expect(
      await screen.findByText('[Image: tracking pixel] (https://attacker.example/pixel.png)')
    ).toBeInTheDocument();
    expect(document.body.querySelector('img')).toBeNull();
  });

  it('does not double-escape link and image labels rendered from markdown inline tokens', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail(
        '[A & B](https://example.com/docs)\n\n![**Bold** & more](https://example.com/image.png)'
      )
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    const linkParagraph = await screen.findByText(/A & B \(https:\/\/example\.com\/docs\)/, {
      selector: 'p',
    });
    expect(linkParagraph).toHaveTextContent('A & B (https://example.com/docs)');
    expect(linkParagraph).not.toHaveTextContent('&amp;');

    const imageParagraph = screen.getByText(
      (_, element) =>
        !!(
          element?.matches('p') &&
          element.textContent?.includes('[Image: Bold & more] (https://example.com/image.png)')
        )
    );
    expect(imageParagraph).toHaveTextContent('[Image: Bold & more] (https://example.com/image.png)');
    expect(imageParagraph).not.toHaveTextContent('&amp;');
    expect(imageParagraph.querySelector('strong')).toHaveTextContent('Bold');
  });

  it('sanitizes raw html embedded inside link text and image alt tokens', async () => {
    const onLoadDetail = vi.fn(async () =>
      buildDetail(
        '[<img src=x onerror="window.__skillModalXss = true">Click](https://example.com)\n\n![<img src=x onerror="window.__skillModalXss = true">Alt](https://attacker.example/pixel.png)'
      )
    );

    render(
      <SkillDetailModal
        open
        skill={baseSkill}
        onOpenChange={() => undefined}
        onTry={async () => undefined}
        onToggleEnabled={async () => undefined}
        onUninstall={async () => undefined}
        onOpenDirectory={async () => undefined}
        onLoadDetail={onLoadDetail}
      />
    );

    const linkLabel = '<img src=x onerror="window.__skillModalXss = true">Click';
    const imageLabel = '[Image: <img src=x onerror="window.__skillModalXss = true">Alt]';
    const linkText = `${linkLabel} (https://example.com)`;
    const imageText = `${imageLabel} (https://attacker.example/pixel.png)`;

    const linkParagraph = await screen.findByText(linkText, { selector: 'p' });
    const imageParagraph = await screen.findByText(imageText, { selector: 'p' });

    expect(linkParagraph).toHaveTextContent(linkText);
    expect(imageParagraph).toHaveTextContent(imageText);
    expect(document.body.querySelectorAll('img')).toHaveLength(0);
    expect(document.body.querySelectorAll('a')).toHaveLength(0);
    expect(document.body.querySelector('script')).toBeNull();
  });
});
