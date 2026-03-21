import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateReleaseNotes,
  selectPreviousPublishedStableRelease,
} from './generate-release-notes.mjs';

test('selectPreviousPublishedStableRelease skips current tag, prereleases, and drafts', () => {
  const release = selectPreviousPublishedStableRelease(
    [
      {
        tag_name: 'v0.3.11',
        draft: false,
        prerelease: false,
        published_at: '2026-03-21T09:00:41Z',
      },
      {
        tag_name: 'v0.3.10',
        draft: false,
        prerelease: true,
        published_at: '2026-03-21T08:00:41Z',
      },
      {
        tag_name: 'v0.3.9',
        draft: true,
        prerelease: false,
        published_at: '2026-03-21T07:00:41Z',
      },
      {
        tag_name: 'v0.3.7',
        draft: false,
        prerelease: false,
        published_at: '2026-03-18T16:31:36Z',
      },
    ],
    'v0.3.11'
  );

  assert.equal(release?.tag_name, 'v0.3.7');
});

test('generateReleaseNotes passes the previous published stable release to GitHub', async () => {
  const requests = [];

  const notes = await generateReleaseNotes({
    currentTag: 'v0.3.11',
    repo: 'dvlin-dev/moryflow',
    targetCommitish: 'dd16be84ab8b4b6f959b45e381ad06feb8090dba',
    token: 'test-token',
    fetchImpl: async (url, init = {}) => {
      requests.push({ url, init });

      if (String(url).includes('/releases?')) {
        return new Response(
          JSON.stringify([
            {
              tag_name: 'v0.3.11',
              draft: false,
              prerelease: false,
              published_at: '2026-03-21T09:00:41Z',
            },
            {
              tag_name: 'v0.3.10',
              draft: false,
              prerelease: true,
              published_at: '2026-03-21T08:30:41Z',
            },
            {
              tag_name: 'v0.3.7',
              draft: false,
              prerelease: false,
              published_at: '2026-03-18T16:31:36Z',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      if (String(url).endsWith('/releases/generate-notes')) {
        return new Response(
          JSON.stringify({
            name: 'v0.3.11',
            body: '**Full Changelog**: https://github.com/dvlin-dev/moryflow/compare/v0.3.7...v0.3.11',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(notes.name, 'v0.3.11');
  assert.match(notes.body, /v0\.3\.7\.\.\.v0\.3\.11/);

  const generateNotesRequest = requests.find(({ url }) =>
    String(url).endsWith('/releases/generate-notes')
  );

  assert.ok(generateNotesRequest);
  assert.deepEqual(JSON.parse(generateNotesRequest.init.body), {
    previous_tag_name: 'v0.3.7',
    tag_name: 'v0.3.11',
    target_commitish: 'dd16be84ab8b4b6f959b45e381ad06feb8090dba',
  });
});

test('generateReleaseNotes omits previous_tag_name when no stable release exists yet', async () => {
  const requests = [];

  await generateReleaseNotes({
    currentTag: 'v0.1.0',
    repo: 'dvlin-dev/moryflow',
    targetCommitish: 'abc123',
    token: 'test-token',
    fetchImpl: async (url, init = {}) => {
      requests.push({ url, init });

      if (String(url).includes('/releases?')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (String(url).endsWith('/releases/generate-notes')) {
        return new Response(JSON.stringify({ name: 'v0.1.0', body: 'Initial release' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const generateNotesRequest = requests.find(({ url }) =>
    String(url).endsWith('/releases/generate-notes')
  );

  assert.ok(generateNotesRequest);
  assert.deepEqual(JSON.parse(generateNotesRequest.init.body), {
    tag_name: 'v0.1.0',
    target_commitish: 'abc123',
  });
});
