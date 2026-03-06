---
title: 语音转写（技术方案）
date: 2026-01-12
scope: moryflow, server, pc, mobile
status: draft
---

<!--
[INPUT]: 录音/上传；服务端转写；文本优化
[OUTPUT]: 端到端流程与接口约定（用于实现/维护）
[POS]: Moryflow 内部技术文档：语音转写

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/index.md`。
-->

# 语音转录

## 需求

PC 和 Mobile 端语音转文字功能：

- 实时录音输入
- 语音文件上传
- 多语言自动识别

## 技术方案

### 架构

```
客户端（PC / Mobile）
├── 录音组件
├── 音频压缩 → FLAC 16kHz
└── 上传 R2
         │
         ▼
Server（NestJS）
├── SpeechController
├── SpeechService
│   ├── GroqClient    → Whisper 转录
│   └── TextRefiner   → LLM 文本优化
└── R2 Storage
```

### 核心流程

```
录音 → 压缩(FLAC 16kHz) → 上传 R2 → Groq 转录 → LLM 优化 → 返回文本
```

### 数据模型

```prisma
model AudioFile {
  id          String
  userId      String
  fileName    String
  fileSize    Int       // 压缩后大小
  duration    Int       // 秒
  r2Key       String    @unique
  status      TranscriptionStatus // pending | processing | completed | failed
  rawText     String?   // Whisper 原始转录
  text        String?   // LLM 优化后
}
```

### API

```typescript
// 获取上传 URL
POST /api/speech/upload-url
{ fileName, fileSize, mimeType }
→ { uploadUrl, audioFileId, r2Key }

// 转录
POST /api/speech/transcribe
{ audioUrl }
→ { text, rawText, duration }
```

### 文本优化

使用 LLM 纠正语音识别错误：

```
Prompt:
你是一个语音转文字的校对助手。请优化以下语音转录文本：
1. 纠正明显的错别字和同音字错误
2. 保持用户原话的口语化风格
3. 补充必要的标点符号
4. 不要添加、删除或改变原意
```

### 波形组件

| 平台   | 组件                                           |
| ------ | ---------------------------------------------- |
| PC     | ElevenLabs LiveWaveform                        |
| Mobile | @simform_solutions/react-native-audio-waveform |

### 环境变量

```bash
GROQ_API_KEY=xxx
STT_REFINER_API_URL=https://api.example.com/v1
STT_REFINER_API_KEY=sk-xxx
STT_REFINER_MODEL=gpt-4o-mini
```

## 代码索引

| 模块            | 路径                                                      |
| --------------- | --------------------------------------------------------- |
| 模块定义        | `apps/moryflow/server/src/speech/speech.module.ts`        |
| 控制器          | `apps/moryflow/server/src/speech/speech.controller.ts`    |
| 服务            | `apps/moryflow/server/src/speech/speech.service.ts`       |
| Groq 客户端     | `apps/moryflow/server/src/speech/groq.client.ts`          |
| 文本优化服务    | `apps/moryflow/server/src/speech/text-refiner.service.ts` |
| PC 语音输入     | `apps/moryflow/pc/src/renderer/components/speech-input/`  |
| Mobile 语音输入 | `apps/moryflow/mobile/components/speech-input/`           |
