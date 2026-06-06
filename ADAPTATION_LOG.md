# GBrain SiliconFlow 适配改动记录

> 适配时间：2026-05-31
> 适配目标：将 gbrain v0.10.1 从 OpenAI embedding 迁移到 SiliconFlow Qwen3-Embedding-8B
> 复用现有：gbrain-pgvector 容器（PostgreSQL + pgvector）

---

## 改动总览

共修改 **9 个文件**，**+39 行 -27 行**。

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/core/embedding.ts` | 核心适配 | 模型、维度、API baseURL、Key 来源 |
| `src/core/postgres-engine.ts` | Bug 修复 + 适配 | embedding 反序列化 + 模型常量 |
| `src/core/pglite-engine.ts` | 适配 | 模型默认值改为常量引用 |
| `src/schema.sql` | Schema 适配 | vector(1536)→vector(4096)，模型名 |
| `src/core/pglite-schema.ts` | Schema 适配 | 同 schema.sql |
| `src/core/schema-embedded.ts` | Schema 适配 | 同 schema.sql |
| `src/core/search/hybrid.ts` | 搜索适配 | 支持 SILICONFLOW_API_KEY |
| `src/core/search/expansion.ts` | 扩展适配 | Anthropic client 改为 SiliconFlow |
| `src/cli.ts` | 权限 | chmod +x（无代码改动）|

---

## 详细改动

### 1. `src/core/embedding.ts`（核心适配）

**变更前：**
```typescript
const MODEL = 'text-embedding-3-large';
const DIMENSIONS = 1536;
// ...
client = new OpenAI();
```

**变更后：**
```typescript
const MODEL = 'Qwen/Qwen3-Embedding-8B';
const DIMENSIONS = 4096;
// ...
client = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1',
});
```

**要点：**
- 模型改为 `Qwen/Qwen3-Embedding-8B`
- 维度从 1536 改为 **4096**（模型支持的最高维度）
- API 兼容 OpenAI 客户端格式，只需改 baseURL 和 key
- Key 优先从 `SILICONFLOW_API_KEY` 读取，兼容 `OPENAI_API_KEY`

---

### 2. `src/core/postgres-engine.ts`（Bug 修复 + 适配）

**变更 1：导入 EMBEDDING_MODEL 常量**
```typescript
import { EMBEDDING_MODEL } from './embedding.ts';
```

**变更 2：修复 `getEmbeddingsByChunkIds` 反序列化 bug**

Postgres 引擎返回的 embedding 是 JSON 字符串，不是 Float32Array。

**变更前：**
```typescript
if (row.embedding) result.set(row.id as number, row.embedding as Float32Array);
```

**变更后：**
```typescript
if (row.embedding) {
  const emb = typeof row.embedding === 'string'
    ? new Float32Array(JSON.parse(row.embedding))
    : row.embedding as Float32Array;
  result.set(row.id as number, emb);
}
```

**变更 3：upsertChunks 中模型默认值改为常量**
```typescript
// 变更前: chunk.model || 'text-embedding-3-large'
// 变更后: chunk.model || EMBEDDING_MODEL
```

**注意：** PGLite 引擎的 `getEmbeddingsByChunkIds` 已正确处理字符串，Postgres 引擎遗漏了这一步。

---

### 3. `src/core/pglite-engine.ts`（适配）

**变更：** upsertChunks 中模型默认值改为 `EMBEDDING_MODEL` 常量引用。

```typescript
// 两处：'text-embedding-3-large' → EMBEDDING_MODEL
```

---

### 4. `src/schema.sql`（Schema 适配）

**变更 1：** `content_chunks.embedding` 维度
```sql
-- 变更前
embedding vector(1536),
model TEXT NOT NULL DEFAULT 'text-embedding-3-large',

-- 变更后
embedding vector(4096),
model TEXT NOT NULL DEFAULT 'Qwen/Qwen3-Embedding-8B',
```

**变更 2：** `config` 表默认值
```sql
-- 变更前
('embedding_model', 'text-embedding-3-large'),
('embedding_dimensions', '1536'),

-- 变更后
('embedding_model', 'Qwen/Qwen3-Embedding-8B'),
('embedding_dimensions', '4096'),
```

---

### 5. `src/core/pglite-schema.ts` 和 `src/core/schema-embedded.ts`

与 `src/schema.sql` 完全相同的改动（三处 Schema 定义必须同步）。

---

### 6. `src/core/search/hybrid.ts`（搜索适配）

**变更前：**
```typescript
if (!process.env.OPENAI_API_KEY) {
```

**变更后：**
```typescript
const hasEmbeddingKey = !!(process.env.OPENAI_API_KEY || process.env.SILICONFLOW_API_KEY);
if (!hasEmbeddingKey) {
```

---

### 7. `src/core/search/expansion.ts`（扩展适配）

**变更 1：** Anthropic client 改为 SiliconFlow
```typescript
// 变更前
anthropicClient = new Anthropic();

// 变更后
anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1',
});
```

**变更 2：** 模型名
```typescript
// 变更前
model: 'claude-haiku-4-5-20251001',

// 变更后
model: 'Qwen/Qwen3.5-122B-A10B',
```

**注意：** 上游 v0.36+ 的 query expansion 可能已被移除或重构，此改动可能在新版本中不再需要。

---

## 配置层改动（非 git tracked）

### `~/gbrain/.env`
```bash
DATABASE_URL=postgresql://app_user:AppUser_SecurePw2026!@localhost:55433/app_db
SILICONFLOW_API_KEY=sk-...   # 从 ~/.hermes/config.yaml 读取
```

### `~/.gbrain/config.json`
```json
{"engine": "postgres", "database_url": "postgresql://app_user:AppUser_SecurePw2026!@localhost:55433/app_db"}
```

---

## 数据库操作记录

### 重建表（因维度变更必须重建）
```sql
DROP TABLE IF EXISTS raw_data, search_queries, files, timeline_entries, links, tags, content_chunks, pages, config, access_tokens, mcp_request_log, page_versions, ingest_log CASCADE;
```

然后重新执行 `src/schema.sql`。

---

## 重新适配速查表

如需在新版本 gbrain 上重新适配 SiliconFlow，按以下顺序执行：

1. **修改 `src/core/embedding.ts`**
   - MODEL = 'Qwen/Qwen3-Embedding-8B'
   - DIMENSIONS = 4096
   - client baseURL = 'https://api.siliconflow.cn/v1'

2. **同步修改所有 Schema 文件**
   - `src/schema.sql`
   - `src/core/pglite-schema.ts`
   - `src/core/schema-embedded.ts`
   - vector(1536) → vector(4096)
   - 默认模型名更新

3. **修复 postgres-engine.ts**
   - 导入 EMBEDDING_MODEL
   - getEmbeddingsByChunkIds 中解析字符串 embedding
   - upsertChunks 中使用 EMBEDDING_MODEL 常量

4. **同步 pglite-engine.ts**
   - upsertChunks 中使用 EMBEDDING_MODEL 常量

5. **修改搜索层**
   - hybrid.ts：支持 SILICONFLOW_API_KEY
   - expansion.ts：如需 query expansion，指向 SiliconFlow

6. **更新 `.env`**
   - SILICONFLOW_API_KEY=...

7. **重建数据库表**（如果维度改变）

8. **验证**
   - `npx tsx src/cli.ts doctor`
   - `npx tsx src/cli.ts import /tmp/test --fresh`
   - `npx tsx src/cli.ts query "test query"`
