/**
 * 聊天测试页面
 */
import { ChatPane } from '@/features/chat'

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <ChatPane />
    </div>
  )
}
