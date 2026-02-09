# Video Transcript

> 本目录结构变更需同步更新本文件。

## 模块概览

Video Transcript 模块提供四平台视频链接（抖音/Bilibili/小红书/YouTube）的任务化转写能力，采用双模式执行：

- LOCAL：本地主机 worker（Mac mini）主执行
- CLOUD_FALLBACK：云端 Workers AI 兜底

## 最近更新

- cloud 接管阶段可靠性补齐：workspace 初始化失败纳入失败终态兜底，避免任务停留在 `DOWNLOADING` 执行态
- local 启动顺序收敛：先原子写入 `localStartedAt/startedAt`，再调度 fallback-check，严格对齐“执行开始后才计时”
- `duration probe` 解析增强：从 `yt-dlp` 输出尾部提取有效数值，降低噪声输出导致的预算预估失败率
- 新增 cloud fallback 回归用例：覆盖“timeout 已接管后 workspace 初始化失败”分支
- timeout 云兜底失败语义修复：仅“已接管 cloud 执行权”后失败才会把任务标记为 `FAILED`，避免 pre-check 异常误杀仍可完成的 local 任务
- timeout preempt 时序优化：优先用 `yt-dlp --skip-download --print duration` 预估预算；预算通过后在下载前即可触发 preempt + 接管
- LOCAL 主流程容错增强：`scheduleFallbackCheck` 失败只告警不阻断，交由 scanner 补偿兜底
- fallback scanner 改为按模块注册开关启用（`VIDEO_TRANSCRIPT_ENABLE_FALLBACK_SCANNER`），默认仅 API-only 角色启用，避免多角色重复扫描
- 新增 fallback 补偿扫描器（30s）并启用幂等 cloud-run 补偿，避免 fallback-check 漏调度
- 新增运行时开关服务 `VideoTranscriptRuntimeConfigService`（Redis override + env fallback）
- 新增 Admin 运行时开关接口（`GET /config`、`PUT /config/local-enabled`）与审计记录
- Admin 概览新增 today 指标（成功/失败率、fallback 触发率、local 10 分钟达标率、平均时长、预算闸门触发数）
- local 开始执行时间改为 DB `NOW()` 写入，cloud timeout 判定改为 DB 时间比较，减少主机时钟偏差
- 新增 `video-transcript-fallback-scanner.service` 单测；补齐 `video-transcript.service` 分支覆盖
- LOCAL 成功路径补充 fallback job 清理（完成后移除 fallback-check/cloud-run 任务）
- 新增任务模型 `VideoTranscriptTask` 与执行来源 `VideoTranscriptExecutor`
- 新增 `/api/v1/app/video-transcripts/*` Session API
- 新增 `/api/v1/admin/video-transcripts/*` Admin 可观测 API
- 新增 `VIDEO_TRANSCRIPT_LOCAL_QUEUE` / `VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE`
- 新增 LOCAL 与 CLOUD_FALLBACK 两类 BullMQ Processor
- 新增预算闸门（`20 USD/day`，`Asia/Shanghai`，按音频时长估算）
- 新增 local worker 心跳上报（Redis TTL）

## 关键约束

- 10 分钟窗口从 `localStartedAt` 起算，排队时间不计入。
- fallback 检查到点后仅做条件判断；最终以 DB 状态裁决。
- fallback 补偿扫描器每 30 秒兜底超时任务（仅补偿入队，不改状态裁决逻辑）。
- scanner 只应由单一控制面角色启用（推荐 API-only 进程），避免重复扫描放大 DB/Redis 负载。
- QueueEvents 用于观测，DB 字段用于状态裁决。
- cloud fallback 默认重试 2 次（指数退避）。
- `platform` 字段保留 `string`，服务层白名单校验（当前仅四平台）。
- URL 仅保留 `sourceUrl`（规范化后入库）。

## 目录结构

| 文件                                           | 说明                                |
| ---------------------------------------------- | ----------------------------------- |
| `video-transcript.module.ts`                   | 模块装配与 worker 按环境启停        |
| `video-transcript.controller.ts`               | App API（任务创建/查询/取消）       |
| `video-transcript-admin.controller.ts`         | Admin API（概览/资源/任务/配置）    |
| `video-transcript.service.ts`                  | 任务编排、URL 规范化、队列投递      |
| `video-transcript-local.processor.ts`          | LOCAL 执行路径                      |
| `video-transcript-cloud-fallback.processor.ts` | CLOUD_FALLBACK 执行路径             |
| `video-transcript-fallback-scanner.service.ts` | fallback 漏调度补偿扫描（30s）      |
| `video-transcript-executor.service.ts`         | 下载/抽音频/转写执行器              |
| `video-transcript-artifact.service.ts`         | R2 产物上传与元数据                 |
| `video-transcript-budget.service.ts`           | 云端预算闸门                        |
| `video-transcript-heartbeat.service.ts`        | local 节点心跳与资源上报            |
| `video-transcript-runtime-config.service.ts`   | 运行时开关读取与覆盖（Redis + env） |
| `video-transcript-command.service.ts`          | 外部命令执行封装                    |
| `video-transcript.constants.ts`                | 常量与 key/job 规则                 |
| `video-transcript.errors.ts`                   | 错误定义                            |
| `video-transcript.types.ts`                    | 模块类型                            |
