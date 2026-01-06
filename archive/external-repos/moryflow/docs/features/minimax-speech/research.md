# 语音模式技术方案

## 需求

通过语音与 AI 对话，替代打字输入：
- 用户说话，AI 用语音回复
- 可随时打断 AI
- 端到端延迟 < 1.5s

## 技术方案

### 核心流程

```
用户说话 → STT (Groq) → AI 思考 → TTS (MiniMax) → 语音播放
```

### 状态机

```
IDLE → LISTENING → THINKING → SPEAKING → IDLE
待命     听取中      AI思考      播放中
```

### 架构

```
客户端 (PC/Mobile)
├── VoiceModeService (状态机管理)
├── 录音 → STT Service
├── Chat → LLM
└── TTS → 播放
        │
        ↓
Server (NestJS)
├── STT Service (Groq)
├── Chat Service
└── TTS Service (MiniMax)
```

### TTS API

```typescript
// POST /api/tts/stream
interface TTSStreamRequest {
  text: string
  model?: 'speech-2.6-turbo' | 'speech-2.6-hd'
  voiceId?: string
  speed?: number  // 0.5-2.0
}
// Response: audio/mpeg (流式)
```

### MiniMax TTS 价格

| 模型 | 单价 | 特点 |
|------|------|------|
| Turbo | 2 元/万字符 | 低延迟，适合对话 |
| HD | 3.5 元/万字符 | 高质量，适合朗读 |

### 延迟优化

| 环节 | 方案 | 预期延迟 |
|------|------|----------|
| STT | Groq Whisper | ~500ms |
| LLM | 流式输出 | 首 token ~200ms |
| TTS | MiniMax Turbo + 流式 | 首音频 ~300ms |

## 代码索引

| 模块 | 路径 |
|------|------|
| STT 服务 | `apps/server/src/speech/` |
| TTS 服务 | `apps/server/src/tts/` (待实现) |
| PC 语音输入 | `apps/pc/src/renderer/components/speech-input/` |
| Mobile 语音输入 | `apps/mobile/components/speech-input/` |
