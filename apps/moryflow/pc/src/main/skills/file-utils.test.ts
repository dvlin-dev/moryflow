import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSkillFromDirectory } from './file-utils';

describe('skills file utils', () => {
  it('uses directory slug as canonical skill name when frontmatter name diverges', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-file-utils-test-'));
    const skillDir = path.join(tempRoot, 'remotion');

    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `---
name: remotion-best-practices
description: Demo
---

# Remotion

Demo body
`,
      'utf-8'
    );

    const parsed = await parseSkillFromDirectory(skillDir);
    expect(parsed?.name).toBe('remotion');

    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
