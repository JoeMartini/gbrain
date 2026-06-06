# GBrain SiliconFlow 适配指南

> 本文档记录 gbrain v0.10.1 的 SiliconFlow 适配最终状态。
> 适配时间：2026-05-31

---

## ✅ 已完成的适配

### 1. 数据库层
- [x] pgvector 容器部署 (`gbrain-pgvector`，端口 55433)
- [x] PostgreSQL 外部数据库支持 (替代 PGLite)
- [x] vector 和 pg_trgm 扩展安装
- [x] 业务凭据隔离 (app_user 专用账号)

### 2. Embedding 适配
- [x] `src/core/embedding.ts` — 改为 SiliconFlow API
- [x] 模型：`Qwen/Qwen3-Embedding-8B`
- [x] 维度：**4096**（模型支持的最高维度）
- [x] Base URL：`https://api.siliconflow.cn/v1`
- [x] API Key 来源：Hermes `~/.hermes/config.yaml` 中的 `model.api_key`

### 3. 搜索层
- [x] `src/core/search/hybrid.ts` — 支持 SiliconFlow embedding key
- [x] `src/core/postgres-engine.ts` — 修复 embedding 反序列化 bug（string → Float32Array）

### 4. 配置
- [x] `~/.gbrain/config.json` — Postgres 引擎
- [x] `.env` — 数据库和 API 配置

---

## 🔧 生效配置

### Embedding (`src/core/embedding.ts`)
```typescript
const MODEL = 'Qwen/Qwen3-Embedding-8B';
const DIMENSIONS = 4096;
const API_KEY = process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY || '';
const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://api.siliconflow.cn/v1',
});
```

### 数据库 Schema
- `content_chunks.embedding` = `vector(4096)`
- `config` 表记录 `embedding_model='Qwen/Qwen3-Embedding-8B'`, `embedding_dimensions='4096'`

### 环境变量 (`~/gbrain/.env`)
```
DATABASE_URL=postgresql://app_user:***@localhost:55433/app_db
SILICONFLOW_API_KEY=sk-***   # 与 Hermes 共用同一 key
```

**⚠️ 重要：** 运行 `npx tsx` 命令前必须用 `set -a && source .env && set +a` 加载环境变量，否则子进程看不到。

---

## 📋 验证步骤

### 1. 数据库连接
```bash
cd ~/gbrain && set -a && source .env && set +a
npx tsx src/cli.ts stats
```
预期输出：`Pages: N, Chunks: N, Embedded: N`

### 2. Embedding 测试
```bash
cd ~/gbrain && set -a && source .env && set +a
npx tsx -e "import { embed } from './src/core/embedding'; embed('test').then(e => console.log('Length:', e.length))"
```
预期输出：`Length: 4096`

### 3. 完整健康检查
```bash
cd ~/gbrain && set -a && source .env && set +a
npx tsx src/cli.ts doctor
```
预期输出：`Health score: 90/100`（schema_version 警告 v1 vs v4 为良性，不影响功能）

### 4. 端到端搜索
```bash
cd ~/gbrain && set -a && source .env && set +a
npx tsx src/cli.ts query "SiliconFlow embedding 模型"
```
预期输出：返回匹配的笔记片段和分数

---

## 🚀 常用命令

```bash
cd ~/gbrain && set -a && source .env && set +a

# 导入笔记
npx tsx src/cli.ts import ~/your-notes/ --fresh

# 生成 embeddings（仅 stale）
npx tsx src/cli.ts embed --stale

# 搜索查询
npx tsx src/cli.ts query "你的问题"

# 查看统计
npx tsx src/cli.ts stats

# 健康检查
npx tsx src/cli.ts doctor
```

---

## 📦 容器管理

```bash
# 查看状态
docker ps | grep gbrain

# 重启
docker restart gbrain-pgvector

# 查看日志
docker logs gbrain-pgvector

# 进入数据库
docker exec -it gbrain-pgvector psql -U app_user -d app_db
```

---

## 🔐 数据库凭据

| 项目 | 值 |
|------|-----|
| Host | localhost |
| Port | 55433 |
| Database | app_db |
| User | app_user |
| Password | `AppUser_SecurePw2026!` |

---

## ⚠️ 已知事项

1. **CPU 指令集**: Intel Celeron J4125 不支持 AVX512，使用 `npx tsx` 代替 `bun run`
2. **Schema version**: `gbrain doctor` 报告 v1，实际表结构是 v4。此为手动重建表后的状态，不影响功能
3. **版本差距**: 本地 v0.10.1 vs 上游 v0.36+。上游已引入 ZeroEntropy 默认、搜索模式、MCP 服务器、知识图谱等功能
4. **Engine 配置**: `~/.gbrain/config.json` 必须使用 `"engine": "postgres"`，否则 CLI 会回退到 PGLite

---

## 📚 参考

- gbrain 上游文档：https://github.com/garrytan/gbrain
- 代理安装指南：https://raw.githubusercontent.com/garrytan/gbrain/master/INSTALL_FOR_AGENTS.md
- Hermes Skill：`gbrain-knowledge-base`（`~/.hermes/skills/gbrain-knowledge-base/SKILL.md`）
