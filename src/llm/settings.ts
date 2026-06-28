/**
 * LLM runtime 配置(只读)。
 * 默认值从 import.meta.env 读取(开发期 .env 注入),用户在 UI 可覆盖。
 * 故意不持久化 API key 到 localStorage,避免明文长期落盘。
 */

export interface LLMSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const ENV: Record<string, string | undefined> =
  ((): Record<string, string | undefined> => {
    try {
      const m = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
      if (m) return m as Record<string, string | undefined>;
    } catch {
      // 在 tsx / Node 直接跑时 import.meta.env 不可用,fallback
    }
    return (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
  })();

const DEFAULT_BASE_URL = ENV.VITE_LLM_BASE_URL || '/llm';
const DEFAULT_MODEL = ENV.VITE_LLM_MODEL || 'gpt-4o-mini';
// env 不接受明文 key(避免误提交仓库),key 永远走 UI 输入

export function defaultSettings(): LLMSettings {
  return {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: '',
    model: DEFAULT_MODEL,
  };
}

/**
 * 规范化 baseUrl:
 *  - '/llm' 这种同源路径,保持原样
 *  - 'https://api.openai.com' 加 /v1
 *  - 'https://api.openai.com/v1' 保持
 *  - 'https://api.openai.com/' 去掉末尾 /
 */
export function normalizeBaseUrl(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '/llm';
  // 去掉末尾 /
  while (s.endsWith('/')) s = s.slice(0, -1);
  // 看起来是个 endpoint(包含 . 或 ://),确保以 /v1 结尾
  if (s.startsWith('http')) {
    if (!/\/v\d+$/.test(s)) s = s + '/v1';
  }
  return s;
}

/** 拼出 chat completions 的完整 URL。 */
export function chatCompletionsUrl(baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  // 同源代理,直接加 /chat/completions
  if (!base.startsWith('http')) {
    return base.replace(/\/$/, '') + '/chat/completions';
  }
  return base + '/chat/completions';
}
