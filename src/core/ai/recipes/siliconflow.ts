import type { Recipe } from '../types.ts';

/**
 * SiliconFlow (硅基流动). OpenAI-compatible API at api.siliconflow.cn.
 * Hosts:
 *   - Qwen/Qwen3-Embedding-8B (Matryoshka, 4096 dims)
 *   - deepseek-ai/DeepSeek-V4-Flash (chat / expansion)
 *
 * Reference: https://docs.siliconflow.cn/
 */
export const siliconflow: Recipe = {
  id: 'siliconflow',
  name: 'SiliconFlow (硅基流动)',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'https://api.siliconflow.cn/v1',
  auth_env: {
    required: ['SILICONFLOW_API_KEY'],
    setup_url: 'https://cloud.siliconflow.cn/account/ak',
  },
  touchpoints: {
    embedding: {
      models: ['Qwen/Qwen3-Embedding-8B'],
      default_dims: 4096,
      dims_options: [64, 128, 256, 512, 768, 1024, 2048, 4096],
      max_batch_tokens: 8192,
      chars_per_token: 2,
    },
    expansion: {
      models: ['deepseek-ai/DeepSeek-V4-Flash'],
    },
    chat: {
      models: ['deepseek-ai/DeepSeek-V4-Flash'],
      supports_tools: true,
      supports_subagent_loop: true,
      supports_prompt_cache: false,
      max_context_tokens: 1_000_000,
    },
  },
  setup_hint:
    'Get an API key at https://cloud.siliconflow.cn/account/ak, then `export SILICONFLOW_API_KEY=...`',
};
