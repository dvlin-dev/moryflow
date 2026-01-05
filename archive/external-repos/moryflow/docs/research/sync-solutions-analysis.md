# 笔记同步方案深度分析

> 本文档分析 CouchDB + Obsidian LiveSync 的同步机制，并与主流方案进行对比。

## 1. CouchDB + Obsidian LiveSync 核心逻辑

### 1.1 整体架构

```
┌─────────────────┐                           ┌─────────────────┐
│   Device A      │                           │   Device B      │
│                 │                           │                 │
│  ┌───────────┐  │                           │  ┌───────────┐  │
│  │ Obsidian  │  │                           │  │ Obsidian  │  │
│  │   Vault   │  │                           │  │   Vault   │  │
│  └─────┬─────┘  │                           │  └─────┬─────┘  │
│        │        │                           │        │        │
│        ▼        │                           │        ▼        │
│  ┌───────────┐  │     ┌───────────────┐     │  ┌───────────┐  │
│  │ PouchDB   │◄─┼────►│   CouchDB     │◄────┼─►│ PouchDB   │  │
│  │ (Local)   │  │     │   (Remote)    │     │  │ (Local)   │  │
│  └───────────┘  │     └───────────────┘     │  └───────────┘  │
└─────────────────┘                           └─────────────────┘
```

**工作流程**：
1. Obsidian 文件变更时触发事件，LiveSync 插件捕获并写入本地 PouchDB
2. PouchDB 通过 CouchDB 复制协议将变更推送到远程
3. 其他设备的 PouchDB 监听远程变更，拉取新数据
4. LiveSync 将变更同步回 Obsidian 文件系统

### 1.2 CouchDB 复制协议核心机制

#### 1.2.1 MVCC（多版本并发控制）

每个文档都有唯一标识：

| 字段 | 说明 | 示例 |
|------|------|------|
| `_id` | 文档唯一 ID | `note-abc123` |
| `_rev` | 版本号 | `3-a4b5c6d7` |

版本号格式：`N-sig`
- **N**：递增整数，表示版本序号
- **sig**：文档内容的哈希签名

**核心特性**：文档的每次修改都会产生新版本，支持多个"叶子版本"并存（冲突状态）

#### 1.2.2 Changes Feed（变更流）

CouchDB 提供持续的变更事件流：

```
GET /database/_changes?feed=continuous&since=last_seq
```

- **Normal 模式**：一次性返回所有变更
- **Continuous 模式**：长连接，实时推送新变更
- 每条变更都有递增的 Sequence ID，用于断点续传

#### 1.2.3 增量同步流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  生成复制 ID  │────►│  获取检查点   │────►│ 监听变更流   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  读取批量变更 │────►│  计算版本差异 │────►│  获取缺失文档 │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  批量上传文档 │────►│  确认持久化   │────►│  更新检查点   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**关键 API**：
- `POST /_revs_diff`：计算目标缺少哪些版本
- `POST /_bulk_docs`：批量上传文档
- `PUT /_local/{id}`：保存复制检查点

#### 1.2.4 冲突处理策略

CouchDB 采用"乐观复制"策略：

1. **冲突检测**：当同一文档在不同设备上被修改时，产生多个叶子版本
2. **确定性选择**：通过算法自动选择一个"获胜"版本（通常基于版本号和哈希）
3. **冲突保留**：所有冲突版本都被保留，可供应用层解决
4. **最终一致**：所有设备最终会收敛到相同状态

```json
{
  "_id": "doc1",
  "_rev": "3-winner",
  "_conflicts": ["2-loser1", "2-loser2"]
}
```

### 1.3 Obsidian LiveSync 特色优化

#### 带宽优化：文档分块与去重

```
┌─────────────────────────────────────────────┐
│              原始 Markdown 文档              │
├─────────────────────────────────────────────┤
│ # Title                                      │
│ Content block 1...                          │
│ Content block 2...                          │
│ Content block 3...                          │
└─────────────────────────────────────────────┘
                      │
                      ▼ 分块
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Chunk 1 │  │ Chunk 2 │  │ Chunk 3 │
│ hash:a1 │  │ hash:b2 │  │ hash:c3 │
└─────────┘  └─────────┘  └─────────┘
                      │
                      ▼ 去重
        仅传输内容变更的 Chunk
```

- 大文件分割为小块，独立存储
- 相同内容块只存储一次（内容寻址）
- 修改时只需传输变化的块

---

## 2. 主流同步方案对比

### 2.1 方案分类

| 类别 | 代表方案 | 核心思想 |
|------|----------|----------|
| **文档数据库复制** | CouchDB, PouchDB | MVCC + Changes Feed + 乐观复制 |
| **CRDT** | Yjs, Automerge | 无冲突复制数据类型，操作可交换 |
| **OT** | Google Docs | 操作变换，服务器协调 |
| **文件同步** | iCloud, Dropbox, Obsidian Sync | 文件级同步 + 版本历史 |
| **Git 式** | Git, Syncthing | DAG 版本图 + 手动合并 |

### 2.2 各方案详解

#### 2.2.1 CouchDB 复制协议

**原理**：
- 每个文档独立版本控制（MVCC）
- 基于 HTTP 的复制协议，双向同步
- 冲突时保留所有版本，应用层解决

**优势**：
- 离线优先，网络恢复后自动同步
- 协议标准化，可互操作
- 冲突处理透明可控

**劣势**：
- 文档级冲突，无法细粒度合并
- 需要自建或租用 CouchDB 服务器
- 实时性依赖轮询间隔

#### 2.2.2 CRDT（Yjs, Automerge）

**原理**：
- 数据结构设计保证操作可交换
- 无论操作顺序如何，结果都一致
- 无需中心服务器协调

```
Device A: insert("Hello", 0)  →  "Hello"
Device B: insert("World", 0)  →  "World"
                    ↓ 合并后
              "HelloWorld" 或 "WorldHello"
              （确定性规则决定顺序）
```

**优势**：
- 真正的实时协作，无冲突
- P2P 架构，无需中心服务器
- 细粒度操作合并

**劣势**：
- 内存占用较大（存储操作历史）
- 复杂数据结构实现困难
- 某些场景下合并结果可能不符合用户预期

#### 2.2.3 OT（Operational Transformation）

**原理**：
- 客户端发送操作到服务器
- 服务器变换并发操作
- 广播变换后的操作给所有客户端

**优势**：
- 成熟稳定（Google Docs 使用 15+ 年）
- 合并结果更符合用户意图

**劣势**：
- 必须有中心服务器
- 不支持离线编辑后合并
- 实现复杂度高

#### 2.2.4 文件同步（iCloud, Dropbox）

**原理**：
- 监控文件系统变化
- 整文件上传/下载
- 冲突时创建副本

**优势**：
- 使用简单，无需配置
- 与现有工具集成好

**劣势**：
- 文件级冲突，产生重复副本
- 大文件修改效率低
- 同步延迟难以控制

### 2.3 对比总结

| 维度 | CouchDB | CRDT | OT | 文件同步 |
|------|---------|------|----|---------|
| **离线支持** | ✅ 优秀 | ✅ 优秀 | ❌ 不支持 | ⚠️ 有限 |
| **实时性** | ⚠️ 秒级 | ✅ 毫秒级 | ✅ 毫秒级 | ⚠️ 分钟级 |
| **冲突处理** | 文档级 | 字符级 | 字符级 | 文件级 |
| **服务器依赖** | 需要 | 可选 | 必须 | 需要 |
| **实现复杂度** | 中等 | 高 | 很高 | 低 |
| **适用场景** | 文档/笔记 | 协作编辑 | 实时协作 | 普通文件 |

---

## 3. 优劣分析

### 3.1 CouchDB + LiveSync 的优势

1. **真正的离线优先**
   - 所有数据本地存储，无网络也能工作
   - 网络恢复后自动同步，无需用户干预

2. **自托管控制权**
   - 数据完全自主，隐私有保障
   - 可选多种部署方式：fly.io、自建服务器、树莓派

3. **协议标准化**
   - CouchDB 复制协议开放标准
   - PouchDB 实现跨平台兼容

4. **增量同步效率**
   - 只传输变更部分
   - 分块去重进一步节省带宽

### 3.2 CouchDB + LiveSync 的劣势

1. **冲突处理粗粒度**
   - 文档级冲突，无法自动合并段落级修改
   - 需要手动解决复杂冲突

2. **部署门槛**
   - 需要自行搭建 CouchDB 服务器
   - 需要处理 HTTPS、CORS、认证等问题

3. **实时性有限**
   - 依赖轮询或长连接
   - 无法达到毫秒级同步

4. **存储开销**
   - 版本历史累积占用空间
   - 需要定期清理

### 3.3 与其他方案对比

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 个人笔记多设备同步 | CouchDB/LiveSync | 离线优先，隐私可控 |
| 实时多人协作编辑 | CRDT (Yjs) | 毫秒级同步，细粒度合并 |
| 企业文档协作 | OT (Google Docs式) | 成熟稳定，权限控制好 |
| 简单文件备份 | iCloud/Dropbox | 零配置，与系统集成 |

---

## 4. 改进建议

### 4.1 对于 Moryflow 的建议

#### 短期优化

1. **采用文件同步作为基础**
   - 当前阶段优先使用成熟的文件同步方案
   - 可借鉴 Obsidian Sync 的设计

2. **增量同步优化**
   - 基于文件 hash 判断变更
   - 只上传修改的文件

#### 中期演进

1. **引入 CRDT 支持细粒度合并**
   - 使用 Yjs 处理 Markdown 文本
   - 实现字符级冲突合并

2. **混合架构**
   ```
   ┌─────────────────────────────────────────┐
   │              Moryflow 同步架构           │
   ├─────────────────────────────────────────┤
   │  Layer 1: 文件索引同步 (轻量级元数据)    │
   │  Layer 2: 内容块同步 (分块 + 去重)       │
   │  Layer 3: CRDT 实时编辑 (可选)          │
   └─────────────────────────────────────────┘
   ```

#### 长期目标

1. **Local-First 架构**
   - 本地数据库为主
   - 服务器仅作为中继和备份

2. **P2P 同步支持**
   - WebRTC 直连同步
   - 减少服务器依赖

### 4.2 技术选型建议

| 需求 | 推荐技术 | 理由 |
|------|----------|------|
| 笔记内容同步 | Yjs + 自定义后端 | 成熟的 CRDT 实现，社区活跃 |
| 文件元数据同步 | SQLite + 自定义协议 | 轻量高效 |
| 附件同步 | 对象存储 + CDN | 大文件专用通道 |
| 实时协作 | Yjs WebSocket Provider | 开箱即用 |

### 4.3 避免的陷阱

1. **不要重复造轮子**
   - 同步协议非常复杂，使用成熟方案

2. **不要过度设计**
   - 先实现基础同步，再迭代优化

3. **考虑边缘情况**
   - 大文件处理
   - 网络不稳定
   - 时钟不同步
   - 多设备同时编辑同一文件

---

## 5. 文件级同步自实现方案

> 目标：多设备文件同步，文件级粒度，可靠的冲突检测与解决，不追求实时性。

### 5.1 核心设计思路

借鉴 CouchDB 的 MVCC 思想，但大幅简化：

- **每个文件独立版本控制**：不追踪操作历史，只追踪版本状态
- **向量时钟检测冲突**：判断是否存在并发修改
- **内容哈希验证变更**：确定文件是否真正变化
- **服务端作为中继**：存储文件和元数据，不做复杂逻辑

### 5.2 数据结构设计

#### 5.2.1 文件元数据 (FileRecord)

```typescript
interface FileRecord {
  // 标识
  path: string;              // 文件相对路径（主键）

  // 版本控制
  version: number;           // 全局递增版本号（服务端生成）
  vectorClock: VectorClock;  // 向量时钟 {deviceId: localVersion}

  // 内容
  contentHash: string;       // 文件内容 SHA-256
  size: number;              // 文件大小

  // 时间
  modifiedAt: number;        // 最后修改时间戳
  syncedAt: number;          // 最后同步时间戳

  // 状态
  deleted: boolean;          // 是否已删除（软删除）
}

type VectorClock = Record<string, number>;  // { "device-a": 3, "device-b": 2 }
```

#### 5.2.2 向量时钟核心逻辑

```typescript
// 比较两个向量时钟的关系
type ClockRelation = 'equal' | 'before' | 'after' | 'concurrent';

function compareVectorClocks(a: VectorClock, b: VectorClock): ClockRelation {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  let aBeforeB = false;
  let bBeforeA = false;

  for (const key of allKeys) {
    const va = a[key] ?? 0;
    const vb = b[key] ?? 0;

    if (va < vb) aBeforeB = true;
    if (va > vb) bBeforeA = true;
  }

  if (!aBeforeB && !bBeforeA) return 'equal';
  if (aBeforeB && !bBeforeA) return 'before';  // a < b
  if (!aBeforeB && bBeforeA) return 'after';   // a > b
  return 'concurrent';  // 冲突！
}

// 合并向量时钟（取每个分量的最大值）
function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = Math.max(result[key] ?? 0, value);
  }
  return result;
}

// 递增本设备的时钟
function incrementClock(clock: VectorClock, deviceId: string): VectorClock {
  return {
    ...clock,
    [deviceId]: (clock[deviceId] ?? 0) + 1,
  };
}
```

### 5.3 同步流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         同步流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                      ┌──────────────┐         │
│  │   本地变更    │                      │   远程变更    │         │
│  │   检测       │                      │   拉取       │         │
│  └──────┬───────┘                      └──────┬───────┘         │
│         │                                      │                 │
│         │  扫描本地文件                         │  GET /sync/changes│
│         │  对比 hash                           │  ?since=lastSeq  │
│         │                                      │                 │
│         ▼                                      ▼                 │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    合并变更集                         │       │
│  │                                                       │       │
│  │   对于每个文件，比较 local vs remote 的向量时钟：      │       │
│  │                                                       │       │
│  │   • equal     → 无需处理                              │       │
│  │   • before    → 拉取远程版本                          │       │
│  │   • after     → 推送本地版本                          │       │
│  │   • concurrent → 冲突！                               │       │
│  └──────────────────────────────────────────────────────┘       │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │    拉取      │   │    推送      │   │  冲突解决    │        │
│  │  远程文件    │   │  本地文件    │   │             │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.1 本地变更检测

```typescript
async function detectLocalChanges(
  localFiles: Map<string, LocalFile>,
  lastSyncRecords: Map<string, FileRecord>,
  deviceId: string
): Promise<FileRecord[]> {
  const changes: FileRecord[] = [];

  for (const [path, file] of localFiles) {
    const lastRecord = lastSyncRecords.get(path);
    const currentHash = await computeHash(file.content);

    // 新文件
    if (!lastRecord) {
      changes.push({
        path,
        version: 0,  // 服务端会分配
        vectorClock: { [deviceId]: 1 },
        contentHash: currentHash,
        size: file.size,
        modifiedAt: file.mtime,
        syncedAt: 0,
        deleted: false,
      });
      continue;
    }

    // 内容变化
    if (currentHash !== lastRecord.contentHash) {
      changes.push({
        ...lastRecord,
        vectorClock: incrementClock(lastRecord.vectorClock, deviceId),
        contentHash: currentHash,
        size: file.size,
        modifiedAt: file.mtime,
      });
    }
  }

  // 检测删除
  for (const [path, record] of lastSyncRecords) {
    if (!localFiles.has(path) && !record.deleted) {
      changes.push({
        ...record,
        vectorClock: incrementClock(record.vectorClock, deviceId),
        deleted: true,
        modifiedAt: Date.now(),
      });
    }
  }

  return changes;
}
```

#### 5.3.2 冲突解决策略

```typescript
interface ConflictResolution {
  type: 'local-wins' | 'remote-wins' | 'keep-both' | 'manual';
}

async function resolveConflict(
  path: string,
  local: FileRecord,
  remote: FileRecord,
  strategy: ConflictResolution
): Promise<FileRecord> {
  switch (strategy.type) {
    case 'local-wins':
      // 本地版本获胜，合并向量时钟
      return {
        ...local,
        vectorClock: mergeVectorClocks(local.vectorClock, remote.vectorClock),
      };

    case 'remote-wins':
      // 远程版本获胜
      return {
        ...remote,
        vectorClock: mergeVectorClocks(local.vectorClock, remote.vectorClock),
      };

    case 'keep-both':
      // 保留两个版本，重命名本地文件
      const conflictPath = generateConflictPath(path, local.modifiedAt);
      await renameLocalFile(path, conflictPath);
      // 返回远程版本作为主版本
      return remote;

    case 'manual':
      // 标记为冲突，等待用户手动解决
      throw new ConflictError(path, local, remote);
  }
}

function generateConflictPath(path: string, timestamp: number): string {
  const ext = path.substring(path.lastIndexOf('.'));
  const base = path.substring(0, path.lastIndexOf('.'));
  const date = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
  return `${base}.conflict-${date}${ext}`;
}
```

### 5.4 API 设计

#### 5.4.1 服务端接口

```typescript
// 获取变更列表（增量）
GET /sync/changes?since={version}&limit={n}
Response: {
  changes: FileRecord[];
  lastVersion: number;
  hasMore: boolean;
}

// 获取文件内容
GET /sync/files/{path}
Response: File content (binary)

// 推送变更
POST /sync/push
Request: {
  changes: FileRecord[];
  files: { path: string; content: base64 }[];
}
Response: {
  accepted: FileRecord[];   // 成功接受
  conflicts: {              // 冲突需要解决
    path: string;
    local: FileRecord;
    remote: FileRecord;
  }[];
}

// 解决冲突
POST /sync/resolve
Request: {
  path: string;
  resolution: 'local' | 'remote';
  mergedClock: VectorClock;
}
```

#### 5.4.2 同步客户端

```typescript
class SyncClient {
  private deviceId: string;
  private lastSyncVersion: number = 0;
  private records: Map<string, FileRecord> = new Map();

  async sync(): Promise<SyncResult> {
    // 1. 检测本地变更
    const localChanges = await this.detectLocalChanges();

    // 2. 拉取远程变更
    const remoteChanges = await this.fetchRemoteChanges();

    // 3. 合并并检测冲突
    const { toUpload, toDownload, conflicts } = this.mergeChanges(
      localChanges,
      remoteChanges
    );

    // 4. 上传本地变更
    if (toUpload.length > 0) {
      await this.uploadChanges(toUpload);
    }

    // 5. 下载远程变更
    if (toDownload.length > 0) {
      await this.downloadChanges(toDownload);
    }

    // 6. 返回冲突列表（如果有）
    return { conflicts, uploaded: toUpload.length, downloaded: toDownload.length };
  }

  private mergeChanges(local: FileRecord[], remote: FileRecord[]) {
    const toUpload: FileRecord[] = [];
    const toDownload: FileRecord[] = [];
    const conflicts: Conflict[] = [];

    // 构建路径索引
    const localMap = new Map(local.map(r => [r.path, r]));
    const remoteMap = new Map(remote.map(r => [r.path, r]));
    const allPaths = new Set([...localMap.keys(), ...remoteMap.keys()]);

    for (const path of allPaths) {
      const l = localMap.get(path);
      const r = remoteMap.get(path);

      if (l && !r) {
        // 仅本地有变更
        toUpload.push(l);
      } else if (!l && r) {
        // 仅远程有变更
        toDownload.push(r);
      } else if (l && r) {
        // 双方都有变更，比较向量时钟
        const relation = compareVectorClocks(l.vectorClock, r.vectorClock);

        switch (relation) {
          case 'equal':
            // 相同，无需处理
            break;
          case 'before':
            // 本地落后，下载远程
            toDownload.push(r);
            break;
          case 'after':
            // 本地领先，上传本地
            toUpload.push(l);
            break;
          case 'concurrent':
            // 冲突！
            conflicts.push({ path, local: l, remote: r });
            break;
        }
      }
    }

    return { toUpload, toDownload, conflicts };
  }
}
```

### 5.5 推荐的库

| 用途 | 库 | 说明 |
|------|-----|------|
| 哈希计算 | `hash-wasm` | 高性能 WASM 哈希，支持 SHA-256 |
| 本地存储 | `idb` / `@electric-sql/pglite` | IndexedDB 封装 / 嵌入式 PG |
| 状态管理 | `immer` | 不可变数据操作 |
| 文件监听 | `chokidar` (Node) | 文件系统变更监听 |
| 网络请求 | `ky` / `ofetch` | 轻量 HTTP 客户端 |

### 5.6 关键实现要点

#### 5.6.1 设备 ID 生成

```typescript
// 每个设备需要唯一 ID，持久化存储
function generateDeviceId(): string {
  return `${platform}-${crypto.randomUUID().slice(0, 8)}`;
}
```

#### 5.6.2 哈希计算

```typescript
import { sha256 } from 'hash-wasm';

async function computeHash(content: Uint8Array): Promise<string> {
  return sha256(content);
}
```

#### 5.6.3 增量同步优化

```typescript
// 只传输元数据，按需拉取内容
async function smartSync() {
  // 1. 先同步元数据（小）
  const metadata = await fetchMetadataChanges();

  // 2. 过滤出真正需要下载的文件
  const toDownload = metadata.filter(r =>
    !localHashIndex.has(r.contentHash)  // 本地没有这个内容
  );

  // 3. 批量下载文件内容
  await downloadFiles(toDownload);
}
```

#### 5.6.4 冲突 UI 提示

```typescript
interface ConflictInfo {
  path: string;
  localVersion: {
    modifiedAt: Date;
    preview: string;  // 前 200 字符
  };
  remoteVersion: {
    modifiedAt: Date;
    device: string;
    preview: string;
  };
}

// UI 展示选项：
// - 保留本地版本
// - 使用远程版本
// - 保留两者（创建 .conflict 文件）
// - 打开对比视图手动合并
```

### 5.7 与 CouchDB 方案的对比

| 维度 | 自实现方案 | CouchDB |
|------|-----------|---------|
| 复杂度 | 低（~500行核心逻辑） | 高（完整协议） |
| 依赖 | 仅需 HTTP 服务器 | 需要 CouchDB 实例 |
| 冲突检测 | 向量时钟 | MVCC 版本树 |
| 历史版本 | 不保留 | 保留所有版本 |
| 断点续传 | 基于 version 序号 | 基于 sequence ID |
| 适用场景 | 文件级同步 | 文档级同步 |

### 5.8 实现路线图

```
Phase 1: 基础同步（2周）
├── FileRecord 数据结构
├── 向量时钟实现
├── 本地变更检测
├── 服务端 CRUD API
└── 基础推拉同步

Phase 2: 冲突处理（1周）
├── 冲突检测逻辑
├── 自动解决策略
├── 冲突 UI 组件
└── 手动合并支持

Phase 3: 优化（1周）
├── 增量元数据同步
├── 内容去重（相同 hash 不重复上传）
├── 批量操作优化
└── 离线队列
```

---

## 6. 参考资料

- [CouchDB Replication Protocol](https://docs.couchdb.org/en/stable/replication/protocol.html)
- [Obsidian LiveSync GitHub](https://github.com/vrtmrz/obsidian-livesync)
- [Vector Clocks Explained](https://www.datastax.com/blog/why-cassandra-doesnt-need-vector-clocks)
- [Designing Data-Intensive Applications - Chapter 5](https://dataintensive.net/)
- [Local-First Software](https://www.inkandswitch.com/local-first/)
