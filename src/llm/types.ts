/**
 * LLM 调用相关类型。
 * 采用 OpenAI Chat Completions 协议(/v1/chat/completions),
 * 兼容 DeepSeek / Moonshot / OpenRouter / Ollama 等实现。
 */

export interface LLMRequest {
  /** 同源代理路径(如 '/llm')或直连 endpoint(以 /v1 结尾)。 */
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  /** true: SSE 流式;false: 一次性 JSON。 */
  stream: boolean;
  /** 取消信号(来自 AbortController)。 */
  signal?: AbortSignal;
  /** 温度,默认 0.2。 */
  temperature?: number;
  /** 上下文最长字符,默认 128000。 */
  maxContextChars?: number;
}

export interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMResult {
  /** 完整回复文本(流式时是累计后的最终结果)。 */
  content: string;
  usage?: LLMUsage;
  model?: string;
}

export interface StreamCallbacks {
  /** 每个增量文本片段(可能为空)。 */
  onDelta?: (delta: string) => void;
  /** 流结束时通知(无论成功失败)。 */
  onDone?: () => void;
}

export interface LLMError extends Error {
  status?: number;
  /** LLM provider 原始错误体(尽量保留前 500 字符)。 */
  body?: string;
}
