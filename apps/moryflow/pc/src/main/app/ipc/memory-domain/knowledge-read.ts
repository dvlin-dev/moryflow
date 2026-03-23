import path from 'node:path';
import { readFile, realpath, stat } from 'node:fs/promises';
import type { KnowledgeReadInput, KnowledgeReadOutput } from '../../../../shared/ipc/memory.js';
import { MemoryDesktopApiError, requireWorkspaceContext, type MemoryIpcDeps } from './shared.js';

const KNOWLEDGE_READ_MAX_CHARS = 50_000;
const KNOWLEDGE_READ_DEFAULT_MAX_CHARS = 20_000;
const KNOWLEDGE_READ_MAX_FILE_BYTES = 10 * 1024 * 1024;

const sliceByCodePoints = (
  content: string,
  offsetChars: number,
  maxChars: number
): {
  content: string;
  endOffset: number;
  truncated: boolean;
} => {
  const codePoints = Array.from(content);
  const safeOffset = Math.max(0, offsetChars);
  const safeLimit = Math.max(0, maxChars);
  const slice = codePoints.slice(safeOffset, safeOffset + safeLimit).join('');
  const endOffset = safeOffset + Array.from(slice).length;
  return {
    content: slice,
    endOffset,
    truncated: endOffset < codePoints.length,
  };
};

const TEXT_EXT_MAP: Record<string, string> = {
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.mdx': 'text/markdown',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.env': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.toml': 'text/plain',
  '.csv': 'text/csv',
  '.xml': 'text/xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.vue': 'text/plain',
  '.svelte': 'text/plain',
  '.astro': 'text/plain',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.sh': 'text/x-shellscript',
  '.bat': 'text/plain',
  '.ps1': 'text/plain',
  '.sql': 'text/x-sql',
  '.r': 'text/plain',
  '.m': 'text/plain',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  '.lua': 'text/x-lua',
  '.pl': 'text/x-perl',
  '.ex': 'text/x-elixir',
  '.exs': 'text/x-elixir',
  '.erl': 'text/x-erlang',
  '.hs': 'text/x-haskell',
  '.clj': 'text/x-clojure',
  '.lisp': 'text/x-lisp',
  '.ini': 'text/plain',
  '.cfg': 'text/plain',
  '.conf': 'text/plain',
  '.rst': 'text/x-rst',
  '.tex': 'text/x-tex',
};

const TEXT_BASENAME_MAP: Record<string, string> = {
  dockerfile: 'text/plain',
  makefile: 'text/plain',
  gemfile: 'text/plain',
  rakefile: 'text/plain',
  procfile: 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',
  '.editorconfig': 'text/plain',
  '.eslintrc': 'text/plain',
  '.prettierrc': 'text/plain',
};

export async function readWorkspaceFileIpc(
  deps: MemoryIpcDeps,
  input: KnowledgeReadInput
): Promise<KnowledgeReadOutput> {
  const { activeVault, profile, profileKey } = await requireWorkspaceContext(deps);
  const vaultPath = activeVault.path;

  let entry: { documentId: string; path: string; fingerprint: string } | null = null;

  if (input.documentId) {
    entry = await deps.documentRegistry.getByDocumentId(
      vaultPath,
      profileKey,
      profile.workspaceId,
      input.documentId
    );
    if (!entry) {
      throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Document not found in workspace.');
    }
  } else if (input.path) {
    if (path.isAbsolute(input.path)) {
      throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Absolute paths are not accepted.');
    }
    entry = await deps.documentRegistry.getByPath(
      vaultPath,
      profileKey,
      profile.workspaceId,
      input.path
    );
  }

  if (!entry) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Document not found in workspace.');
  }

  const resolved = path.resolve(path.join(vaultPath, entry.path));
  if (!resolved.startsWith(vaultPath + path.sep) && resolved !== vaultPath) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Path is outside workspace boundary.');
  }

  let realResolved: string;
  try {
    realResolved = await realpath(resolved);
  } catch {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'File not found.');
  }

  const realVaultPath = await realpath(vaultPath);
  if (!realResolved.startsWith(realVaultPath + path.sep) && realResolved !== realVaultPath) {
    throw new MemoryDesktopApiError(
      'WORKSPACE_UNAVAILABLE',
      'File target is outside workspace boundary.'
    );
  }

  const ext = path.extname(realResolved).toLowerCase();
  const basename = path.basename(realResolved).toLowerCase();
  const mimeType = TEXT_EXT_MAP[ext] ?? TEXT_BASENAME_MAP[basename];
  if (!mimeType) {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'Only text files can be read.');
  }

  let fileStat;
  try {
    fileStat = await stat(realResolved);
  } catch {
    throw new MemoryDesktopApiError('WORKSPACE_UNAVAILABLE', 'File not found.');
  }

  if (fileStat.size > KNOWLEDGE_READ_MAX_FILE_BYTES) {
    return {
      content: '',
      truncated: true,
      nextOffset: null,
      mimeType,
      totalBytes: fileStat.size,
      relativePath: entry.path,
    };
  }

  const fullContent = await readFile(realResolved, 'utf8');
  const offsetChars = input.offsetChars ?? 0;
  const maxChars = Math.min(
    input.maxChars ?? KNOWLEDGE_READ_DEFAULT_MAX_CHARS,
    KNOWLEDGE_READ_MAX_CHARS
  );
  const { content, endOffset, truncated } = sliceByCodePoints(fullContent, offsetChars, maxChars);

  return {
    content,
    truncated,
    nextOffset: truncated ? endOffset : null,
    mimeType,
    totalBytes: fileStat.size,
    relativePath: entry.path,
  };
}
