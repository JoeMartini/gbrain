import type { Recipe } from '../types.ts';

/**
 * SiliconFlow — Chinese AI model provider with OpenAI-compatible API.
 *
 * Supports embedding, chat, and multimodal models via a single endpoint at
 * https://api.siliconflow.cn/v1.
 *
 * Embeddings: Qwen/Qwen3-Embedding-8B at 4096 dims (Matryoshka-compatible:
 * 64, 128, 256, 512, 768, 1024, 2048, 4096). Also supports BAAI/bge-m3,
 * BAAI/bge-large-zh-v1.5, etc.
 *
 * Chat: Qwen3 series, DeepSeek-V3, GLM-4, etc.
 *
 * Usage:
 *   export SILICONFLOW_API_KEY=sk-...
 *   gbrain config set embedding_model siliconflow:Qwen/Qwen3-Embedding-8B
 *   gbrain config set embedding_dimensions 4096
 */
export const siliconflow: Recipe = {
  id: 'siliconflow',
  name: 'SiliconFlow',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'https://api.siliconflow.cn/v1',
  auth_env: {
    required: ['SILICONFLOW_API_KEY'],
    optional: ['SILICONFLOW_BASE_URL'],
    setup_url: 'https://cloud.siliconflow.cn',
  },
  touchpoints: {
    embedding: {
      models: [
        'Qwen/Qwen3-Embedding-8B',
        'BAAI/bge-m3',
        'BAAI/bge-large-zh-v1.5',
      ],
      default_dims: 4096,
      dims_options: [64, 128, 256, 512, 768, 1024, 2048, 4096],
      cost_per_1m_tokens_usd: 0.0, // SiliconFlow embedding is currently free
      price_last_verified: '2026-05-31',
      max_batch_tokens: 300_000,
    },
    chat: {
      models: [
        'Qwen/Qwen3-235B-A22B',
        'Qwen/Qwen3-30B-A3B',
        'Qwen/Qwen3-8B',
        'deepseek-ai/DeepSeek-V3',
        'THUDM/glm-4-9b-chat',
      ],
      supports_tools: true,
      supports_subagent_loop: false,
      supports_prompt_cache: false,
      max_context_tokens: 128000,
      price_last_verified: '2026-05-31',
    },
  },
  setup_hint:
    'Get an API key at https://cloud.siliconflow.cn, then `export SILICONFLOW_API_KEY=...` and use `siliconflow:<model>`. Optional override: SILICONFLOW_BASE_URL (proxy).',
};
