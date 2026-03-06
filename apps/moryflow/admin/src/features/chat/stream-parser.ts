interface UsagePayload {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface ParsedChatStreamChunk {
  done: boolean;
  contentSegments: string[];
  usage: {
    prompt: number;
    completion: number;
  } | null;
}

export function parseChatStreamChunk(chunk: string): ParsedChatStreamChunk {
  let done = false;
  const contentSegments: string[] = [];
  let usage: ParsedChatStreamChunk['usage'] = null;

  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data: ')) {
      continue;
    }

    const payload = line.slice(6).trim();
    if (!payload) {
      continue;
    }

    if (payload === '[DONE]') {
      done = true;
      break;
    }

    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
        usage?: UsagePayload;
      };

      const content = parsed.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        contentSegments.push(content);
      }

      if (parsed.usage) {
        usage = {
          prompt: parsed.usage.prompt_tokens || 0,
          completion: parsed.usage.completion_tokens || 0,
        };
      }
    } catch {
      // 忽略异常片段，继续消费后续 chunk
    }
  }

  return {
    done,
    contentSegments,
    usage,
  };
}
