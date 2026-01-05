import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import type { AgentChatRequestOptions, DesktopApi } from '../../shared/ipc'

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0]
type AgentOptionsResolver = () => AgentChatRequestOptions | undefined

declare global {
  interface Window {
    desktopAPI: DesktopApi
  }
}

export class IpcChatTransport implements ChatTransport<UIMessage> {
  constructor(private readonly agentOptions?: AgentChatRequestOptions | AgentOptionsResolver) {}

  private resolveAgentOptions(): AgentChatRequestOptions | undefined {
    if (typeof this.agentOptions === 'function') {
      return (this.agentOptions as AgentOptionsResolver)()
    }
    return this.agentOptions
  }

  async sendMessages({ chatId, messageId, trigger, messages, abortSignal }: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    const channel = `chat:${chatId}:${crypto.randomUUID()}`
    await window.desktopAPI.chat.send({
      chatId,
      channel,
      messages,
      trigger,
      messageId,
      agentOptions: this.resolveAgentOptions(),
    })

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        let disposed = false
        let errored = false

        const cleanup = () => {
          if (disposed) return
          disposed = true
        }

        const dispose = window.desktopAPI.chat.onChunk(channel, (chunk) => {
          if (disposed || errored) return
          if (!chunk) {
            cleanup()
            try {
              controller.close()
            } catch {
              // 流可能已经关闭或出错，忽略
            }
            return
          }
          try {
            controller.enqueue(chunk)
          } catch {
            // 流可能已经关闭或出错，忽略
          }
        })

        const handleAbort = () => {
          if (disposed || errored) return
          errored = true
          window.desktopAPI.chat.stop({ channel }).catch(() => {})
          cleanup()
          dispose()
          try {
            controller.error(new DOMException('Aborted', 'AbortError'))
          } catch {
            // 流可能已经关闭或出错，忽略
          }
        }

        abortSignal?.addEventListener('abort', handleAbort, { once: true })
      },
      cancel: () => {
        void window.desktopAPI.chat.stop({ channel })
      }
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }
}
