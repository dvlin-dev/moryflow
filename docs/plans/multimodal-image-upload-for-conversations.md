# Multimodal Image Upload for Conversations

> Status: completed

## Problem

Image uploads in conversations are completely broken on both PC and Mobile clients. When a user attaches an image, the binary data is discarded mid-pipeline and the LLM receives only a plain-text file path reference — it never sees the actual image.

### Root Cause

The entire attachment pipeline was designed for text-only context injection. There is no separate channel for multimodal content:

```
FileUIPart { url: "data:image/png;base64,..." }
    ↓ buildAttachmentContexts()       ← decodes & writes to disk, discards dataUrl
AgentAttachmentContext { filePath: ".moryflow/attachments/xxx" }
    ↓ applyContextToInput()           ← converts to plain text description
string: "已保存到 Vault 路径：xxx\n请调用 read_file 读取"
    ↓ user(string)                    ← text-only user message
AgentInputItem { role: 'user', content: string }
    ↓ run(agent, items)
LLM only sees text, never the image
```

`@openai/agents-core@0.5.1`'s `user()` natively supports multimodal content (`string | UserContent[]`), but we only ever pass a string.

### Scope

| Path                                                  | Impact                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PC client — all models (user-configured + membership) | **Broken**: images never reach LLM                                                                                                                                                          |
| Mobile client — all models                            | **Broken**: same pipeline, same issue. Additionally, the mobile sending pipeline (`extractTextFromParts`) filters to `type === 'text'` only — `FileUIPart` never reaches the runtime at all |
| Server AI proxy (external API callers)                | **Working**: `image_url` parts are converted correctly. Minor: `detail` field is silently dropped                                                                                           |

## Design Principles

1. **Images are first-class multimodal content**, not "attachments to describe in text".
2. **Separate concerns**: text attachments → context injection (current behavior, unchanged); images → multimodal content parts (new channel).
3. **`buildUserContent` as the single merge point**: text composition completes first, then merges with images, returning `string | UserContent[]` for `user()`.
4. **Data URL flows to LLM directly**: disk write is an independent side effect for tool access, not the primary data path.
5. **Only current turn carries inline images**: session persistence stores a lightweight reference; replay and compaction never re-inflate base64 into context.

## SDK Type Reference

Verified from `node_modules/@openai/agents-core@0.5.1`:

```typescript
// user() signature — accepts string OR array of content parts
function user(input: string | UserContent[], options?: Record<string, any>): UserMessageItem;

// InputImage — field is `image`, NOT `image_url`
type InputImage = {
  type: 'input_image';
  image?: string | { id: string }; // ← `image`, not `image_url`
  detail?: string;
  providerData?: Record<string, any>;
};

// InputText
type InputText = {
  type: 'input_text';
  text: string;
  providerData?: Record<string, any>;
};

// UserContent = InputText | InputImage | InputFile | AudioContent
```

Types are accessible via `import { protocol } from '@openai/agents-core'` namespace, or via structural compatibility.

## Changes by Layer

### Layer 1 — Type Foundation

**File**: `packages/agents-runtime/src/types.ts`

Add `AgentImageContent` alongside the existing `AgentAttachmentContext`:

```typescript
/**
 * Image content for LLM vision (multimodal).
 * Passed directly as content parts — NOT injected as text context.
 */
export interface AgentImageContent {
  /** data: URL or https: URL */
  url: string;
  mediaType: string;
  filename?: string;
  detail?: 'auto' | 'low' | 'high';
}
```

`AgentAttachmentContext` is unchanged — it serves text/code file context injection correctly.

### Layer 2 — Input Building

**File**: `packages/agents-runtime/src/context.ts`

Add `buildUserContent`. The existing `applyContextToInput` remains as-is (handles text context injection).

```typescript
import type { AgentImageContent } from './types';

/**
 * Merge composed text input with image content parts.
 * Returns plain string when no images (optimized for text-only models).
 * Returns UserContent[] when images exist — compatible with user() from @openai/agents-core.
 *
 * IMPORTANT: the `input_image` field is `image`, NOT `image_url`.
 * Ref: @openai/agents-core@0.5.1 InputImage schema.
 */
export const buildUserContent = (
  textInput: string,
  images?: AgentImageContent[]
):
  | string
  | Array<
      { type: 'input_text'; text: string } | { type: 'input_image'; image: string; detail?: string }
    > => {
  if (!images || images.length === 0) {
    return textInput;
  }
  return [
    { type: 'input_text', text: textInput },
    ...images.map((img) => ({
      type: 'input_image' as const,
      image: img.url,
      detail: img.detail ?? 'auto',
    })),
  ];
};
```

**File**: `packages/agents-runtime/src/index.ts`

```diff
- export { applyContextToInput } from './context';
+ export { applyContextToInput, buildUserContent } from './context';
```

### Layer 3 — Attachment Processing (PC Main Process)

**File**: `apps/moryflow/pc/src/main/chat/attachments.ts`

Replace `buildAttachmentContexts` with `processAttachments` that splits images from text attachments:

```typescript
/** Processed attachment result: images and text on separate channels */
export interface ProcessedAttachments {
  /** Text/code files → context injection (existing behavior) */
  textContexts: AgentAttachmentContext[];
  /** Images → LLM vision content parts (new channel) */
  images: AgentImageContent[];
}

export const processAttachments = async (parts: FileUIPart[]): Promise<ProcessedAttachments> => {
  const textContexts: AgentAttachmentContext[] = [];
  const images: AgentImageContent[] = [];

  for (const part of parts) {
    // Images: preserve data URL for LLM, write to disk as side effect for tool access
    if (part.mediaType?.startsWith('image/') && part.url) {
      images.push({
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename,
      });
      // Side-effect: write to vault for read_file tool access (fire-and-forget)
      const decoded = decodeDataUrl(part);
      if (decoded) {
        writeAttachmentToVault(part.filename, decoded.buffer).catch(() => {});
      }
      continue;
    }

    // Non-image: existing text processing logic (unchanged)
    const decoded = decodeDataUrl(part);
    if (!decoded) continue;
    const { mediaType, buffer } = decoded;

    if (isTextualMediaType(mediaType)) {
      const text = buffer.toString('utf8');
      if (!text.trim()) continue;
      if (text.length <= ATTACHMENT_MAX_CHARS) {
        textContexts.push({
          filename: part.filename,
          mediaType,
          content: text,
          truncated: false,
        });
      } else {
        const { relative } = await writeAttachmentToVault(part.filename, buffer);
        textContexts.push({
          filename: part.filename,
          mediaType,
          content: `${text.slice(0, ATTACHMENT_MAX_CHARS)}\n...(truncated, full content saved to ${relative})`,
          truncated: true,
          filePath: relative,
        });
      }
    } else {
      const { relative } = await writeAttachmentToVault(part.filename, buffer);
      textContexts.push({ filename: part.filename, mediaType, filePath: relative });
    }
  }

  return { textContexts, images };
};
```

Delete `buildAttachmentContexts` — `processAttachments` replaces it entirely.

### Layer 4 — Chat Request Handler

**File**: `apps/moryflow/pc/src/main/chat/chat-request.ts`

```diff
- import { buildAttachmentContexts } from './attachments.js';
+ import { processAttachments } from './attachments.js';

  // In createChatRequestHandler:
- const attachmentContexts = await buildAttachmentContexts(
-   extractUserAttachments(latestUserMessage)
- );
+ const { textContexts, images } = await processAttachments(
+   extractUserAttachments(latestUserMessage)
+ );

  // Pass to runChatTurn:
  await runtimeInstance.runChatTurn({
    // ...
-   attachments: attachmentContexts,
+   attachments: textContexts,
+   images,
    // ...
  });

  // Truncation continue — clear both channels:
- attachmentContexts.length = 0;
+ textContexts.length = 0;
+ images.length = 0;
```

### Layer 5 — Agent Runtime (PC)

**File**: `apps/moryflow/pc/src/main/agent-runtime/index.ts`

Type change:

```diff
  export type AgentRuntimeOptions = {
    // ...existing fields...
    attachments?: AgentAttachmentContext[];
+   /** Image content parts for LLM vision. */
+   images?: AgentImageContent[];
    // ...
  };
```

Inside `runChatTurn` (~line 824–940):

```diff
  async runChatTurn({
-   chatId, input, preferredModelId, thinking, thinkingProfile,
-   context, mode, approvalMode, selectedSkillName, session, attachments, signal,
+   chatId, input, preferredModelId, thinking, thinkingProfile, context,
+   mode, approvalMode, selectedSkillName, session, attachments, images, signal,
    runtimeConfigOverride,
  }) {
    // ...existing logic through line 914...

    // Text composition: context + text attachments + skill (unchanged)
    const inputWithContext = applyContextToInput(trimmed, context, attachments);
    const selectedSkillBlock = selectedSkillName?.trim()
      ? await skillsRegistry.resolveSelectedSkillInjection(selectedSkillName)
      : null;
    const finalText = selectedSkillBlock
      ? `${selectedSkillBlock}\n\n=== 用户输入 ===\n${inputWithContext}`
      : inputWithContext;

-   const userItem = user(finalInput);
+   const userContent = buildUserContent(finalText, images);
+   const userItem = user(userContent);

    const runInput = effectiveHistory.length > 0 ? [...effectiveHistory, userItem] : [userItem];
    await session.addItems([userItem]);
    // ...rest unchanged...
  }
```

New import:

```diff
+ import { buildUserContent, type AgentImageContent } from '@moryflow/agents-runtime';
```

### Layer 6 — Mobile Sending Pipeline + Runtime

The mobile sending chain has an additional gap: `FileUIPart` never reaches the runtime at all.

Current mobile data flow:

```
UIMessage.parts (includes FileUIPart with data URL)
    ↓ extractTextFromParts()          ← filters to type === 'text' only, images discarded
string (text only)
    ↓ MobileChatTransport.sendMessages()
    ↓ runtime.runChatTurn({ input: string })
LLM only sees text
```

Three files need changes:

**File**: `apps/moryflow/mobile/lib/chat/utils.ts`

Add image extraction alongside the existing text extraction:

```typescript
import type { UIMessage } from 'ai';
import type { AgentImageContent } from '@moryflow/agents-runtime';

// Existing — unchanged
export function extractTextFromParts(parts: UIMessage['parts'] | undefined): string {
  // ...existing implementation...
}

// New — extract images from UIMessage parts
export function extractImagesFromParts(parts: UIMessage['parts'] | undefined): AgentImageContent[] {
  if (!parts || !Array.isArray(parts)) return [];
  return parts
    .filter(
      (part): part is { type: 'file'; url: string; mediaType: string; filename?: string } =>
        part?.type === 'file' &&
        typeof part.url === 'string' &&
        part.mediaType?.startsWith('image/') === true
    )
    .map((part) => ({
      url: part.url,
      mediaType: part.mediaType,
      filename: part.filename,
    }));
}
```

**File**: `apps/moryflow/mobile/lib/chat/transport.ts`

Pass images alongside text to `runChatTurn`:

```diff
+ import { extractImagesFromParts } from './utils';

  // In sendMessages():
  const input = extractTextFromParts(lastUserMessage.parts);
+ const images = extractImagesFromParts(lastUserMessage.parts);

  // Pass to runtime:
  await runtime.runChatTurn({
    input,
+   images,
    // ...existing params...
  });
```

**File**: `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`

Same runtime change as PC:

```diff
+ import { buildUserContent, type AgentImageContent } from '@moryflow/agents-runtime';

  // In runChatTurn options: add images?: AgentImageContent[]
  // In runChatTurn body:
  const inputWithContext = applyContextToInput(trimmed, context, attachments);
- const userItem = user(inputWithContext);
+ const userContent = buildUserContent(inputWithContext, images);
+ const userItem = user(userContent);
```

### Layer 7 — Server AI Proxy (detail field fix)

**File**: `apps/moryflow/server/src/ai-proxy/converters/message.converter.ts` (line 124)

```diff
  } else if (part.type === 'image_url') {
-   contentParts.push({ type: 'image', image: part.image_url.url });
+   contentParts.push({
+     type: 'image',
+     image: part.image_url.url,
+     ...(part.image_url.detail && {
+       providerOptions: { openai: { imageDetail: part.image_url.detail } },
+     }),
+   });
  }
```

**File**: `apps/moryflow/server/src/ai-proxy/dto/types.ts` (line 63–65)

Use AI SDK's `ImagePart`-aligned type instead of overly broad `Record<string, unknown>`:

```diff
  export type AISDKUserContentPart =
    | { type: 'text'; text: string }
-   | { type: 'image'; image: string };
+   | { type: 'image'; image: string; providerOptions?: { openai?: { imageDetail?: string } } };
```

### Layer 8 — History Compaction & Session Persistence

This layer addresses the review finding that:

1. **Compaction triggers UI rebuild** via `agentHistoryToUiMessages()` which only handles `input_text`/`output_text`/`reasoning_text` — `input_image` is silently dropped, causing images to disappear from chat after compaction.
2. **Protected turns with multiple base64 images** can still blow context window since current compaction has no post-compaction overflow check.
3. **Local persistence** (electron-store / AsyncStorage) bloats if full base64 is stored in `AgentInputItem[]`.

#### 8a — `agentHistoryToUiMessages` must handle `input_image`

**Files**:

- `apps/moryflow/pc/src/main/chat-session-store/ui-message.ts`
- `apps/moryflow/mobile/lib/agent-runtime/session-store.ts`

In the user message content loop (where `input_text`/`output_text`/`reasoning_text` are matched), add `input_image` handling:

```typescript
// Inside the content array iteration for user messages:
if (entry.type === 'input_image' && typeof entry.image === 'string') {
  parts.push({
    type: 'file',
    url: entry.image,
    mediaType: 'image/*', // or infer from data URL
  } as FileUIPart);
  continue;
}
```

This ensures that when compaction rebuilds `UIMessage[]` from agent history, images survive the conversion.

#### 8b — Image stripping in compaction (non-protected turns)

**File**: `packages/agents-runtime/src/compaction.ts`

```typescript
const stripImagesFromContent = (content: unknown): unknown => {
  if (typeof content === 'string' || !Array.isArray(content)) return content;
  const filtered = content.filter((part) => !(isRecord(part) && part.type === 'input_image'));
  if (filtered.length === 0) return '[images omitted during compaction]';
  if (filtered.length === 1 && isRecord(filtered[0]) && filtered[0].type === 'input_text') {
    return filtered[0].text;
  }
  return filtered;
};
```

Apply in the compaction trim loop: for non-protected user messages, call `stripImagesFromContent` on their content before including them in the compacted history.

#### 8c — Post-compaction overflow guard

After compaction completes and the final history is assembled (including protected turns), add a second pass: if `estimateCharCount(finalHistory)` still exceeds the context limit, progressively strip images from the most recent protected turns (oldest-first within the protected window) until within budget. This prevents the "3 recent turns each with large base64 images blow context" scenario.

```typescript
// After main compaction, if still over budget:
const budget = resolveCharBudget(contextWindow, outputBudget);
let currentChars = estimateCharCount(finalHistory);
if (currentChars > budget) {
  // Strip images from protected turns, oldest first
  for (const item of finalHistory) {
    if (currentChars <= budget) break;
    if (getRole(item) !== 'user') continue;
    const content = getContent(item);
    if (!Array.isArray(content)) continue;
    const hasImage = content.some((p) => isRecord(p) && p.type === 'input_image');
    if (!hasImage) continue;
    const before = renderItemText(item).length;
    (item as Record<string, unknown>).content = stripImagesFromContent(content);
    currentChars -= before - renderItemText(item).length;
  }
}
```

#### 8d — Session persistence: store lightweight image references

To prevent local storage bloat (electron-store / AsyncStorage serializing full base64 in `AgentInputItem[]`), the session adapter's persistence layer should replace inline base64 data URLs with vault-relative file references when writing to disk, and skip re-inflation on read (images in older turns don't need to be re-sent to the model — compaction handles that).

This means the vault disk write in Layer 3 (currently fire-and-forget) becomes load-bearing: the vault path is the durable reference. The session write hook replaces `data:image/...;base64,...` with a marker like `vault-ref:<relative-path>` before serialization.

On session read (conversation resume), these markers remain as-is. If the model needs them, compaction has already stripped old images; if they're in protected turns, the current turn's fresh data URL is what matters. This is a graceful degradation — old images in history become text markers, new images in the current turn carry full data.

## File Change Summary

| File                                                         | Change                                                        | Risk                           |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------ |
| `packages/agents-runtime/src/types.ts`                       | Add type                                                      | None                           |
| `packages/agents-runtime/src/context.ts`                     | Add function                                                  | None — additive only           |
| `packages/agents-runtime/src/index.ts`                       | Add export                                                    | None                           |
| `packages/agents-runtime/src/compaction.ts`                  | Strip images + overflow guard                                 | Medium — needs careful testing |
| `apps/moryflow/pc/src/main/chat/attachments.ts`              | **Refactor** `buildAttachmentContexts` → `processAttachments` | Medium — core change           |
| `apps/moryflow/pc/src/main/chat/chat-request.ts`             | Adapt to new return type                                      | Low                            |
| `apps/moryflow/pc/src/main/agent-runtime/index.ts`           | Add `images` param, use `buildUserContent`                    | Medium — core change           |
| `apps/moryflow/pc/src/main/chat-session-store/ui-message.ts` | Handle `input_image` in history→UI conversion                 | Medium                         |
| `apps/moryflow/mobile/lib/chat/utils.ts`                     | Add `extractImagesFromParts`                                  | Low                            |
| `apps/moryflow/mobile/lib/chat/transport.ts`                 | Pass images to runtime                                        | Low                            |
| `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`          | Same as PC runtime                                            | Medium                         |
| `apps/moryflow/mobile/lib/agent-runtime/session-store.ts`    | Handle `input_image` in history→UI conversion                 | Medium                         |
| `apps/moryflow/server/.../message.converter.ts`              | Pass `detail` field                                           | Low                            |
| `apps/moryflow/server/.../dto/types.ts`                      | Typed `providerOptions`                                       | Low                            |

## Key Considerations

### Token Cost

Base64 images consume significant context window. Multi-layer mitigation:

1. **Layer 8b**: Non-protected turns have images stripped during compaction.
2. **Layer 8c**: Post-compaction overflow guard progressively strips images from protected turns if still over budget.
3. **Layer 8d**: Session persistence stores lightweight vault references instead of inline base64, preventing local storage bloat.
4. **Future optimization**: Upload to OSS and use URL references instead of inline base64 (reduces both context and storage cost).

### Non-Vision Models

If a user sends an image to a model without vision capability, the provider will return an error that surfaces naturally to the user. No frontend blocking needed — model capability info exists in `capabilitiesJson`; the UI can optionally hide the upload button for non-vision models as a separate enhancement.

### `user()` Type Compatibility

`@openai/agents-core@0.5.1`'s `user()` accepts `string | UserContent[]`. The `InputImage` type uses `image` (not `image_url`) as the field name. Types are accessible via the `protocol` namespace export or via structural compatibility. `buildUserContent` uses structurally compatible literal types.

### Renderer / UI Side

The renderer itself needs no changes for the core fix. It already handles image selection, paste, drag-drop → `FileUIPart` with data URLs, and persists `UIMessage` with image parts.

However, the **history→UI reconstruction path** (triggered by compaction) does need changes — covered in Layer 8a. Without this, images survive in `UIMessage` persistence until compaction triggers, at which point they would be lost from the UI.

## Verification Plan

1. **Unit test** `buildUserContent`: returns string when no images; returns `UserContent[]` with `{ type: 'input_image', image: ... }` (not `image_url`) when images present.
2. **Unit test** `processAttachments` (PC): images go to `images[]` with data URL preserved, text files go to `textContexts[]`.
3. **Unit test** `extractImagesFromParts` (Mobile): extracts `AgentImageContent[]` from `FileUIPart` entries in `UIMessage.parts`.
4. **Integration test** (PC): attach an image → verify the `AgentInputItem` passed to `run()` contains `input_image` content parts with `image` field set to the data URL.
5. **Integration test** (Mobile): attach an image → verify images flow through `extractImagesFromParts` → `transport` → `runtime.runChatTurn` → `user(UserContent[])`.
6. **Compaction test**: trigger compaction with image-containing history → verify:
   - Non-protected turns have images stripped.
   - If protected turns exceed budget, overflow guard strips oldest protected images.
   - `agentHistoryToUiMessages` preserves `input_image` as `FileUIPart` in rebuilt UI messages.
7. **E2E smoke** (PC): send a message with an image to a vision model (e.g., GPT-4o) → verify the model responds about the image content.
8. **Server proxy test**: send a request with `image_url` + `detail: 'high'` → verify the AI SDK call includes the detail parameter via `providerOptions`.
