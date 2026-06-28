/**
 * OpenAI Chat Completions 客户端(纯 fetch,无 SDK)。
 * 支持流式(SSE)与一次性两种模式;支持 AbortController 取消;
 * 对 response_format 不被识别的 provider 优雅降级重试。
 */

import type { LLMRequest, LLMResult, StreamCallbacks, LLMError } from './types';
import { chatCompletionsUrl, normalizeBaseUrl } from './settings';

const DEFAULT_MAX_CONTEXT_CHARS = 128_000;

export async function callLLM(
  req: LLMRequest,
  cb: StreamCallbacks = {},
): Promise<LLMResult> {
  const url = chatCompletionsUrl(req.baseUrl);
  const isSameOriginProxy = !normalizeBaseUrl(req.baseUrl).startsWith('http');
  const isStream = !!req.stream;
  const maxChars = req.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;

  // 过长裁剪(留点 buffer 给 system prompt)
  const userContent =
    req.userContent.length > maxChars
      ? req.userContent.slice(0, maxChars) + '\n\n[…已截断…]'
      : req.userContent;

  // 构造请求体
  const body: Record<string, unknown> = {
    model: req.model,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: req.temperature ?? 0.2,
    stream: isStream,
    response_format: { type: 'json_object' },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: isStream ? 'text/event-stream' : 'application/json',
  };
  if (req.apiKey) {
    headers.Authorization = `Bearer ${req.apiKey}`;
  }

  // 同源代理:用 X-LLM-Authorization 透传(避免 dev 期间 key 出现在 Network 面板之外的)
  if (isSameOriginProxy && req.apiKey) {
    headers['X-LLM-Authorization'] = req.apiKey;
    delete headers.Authorization;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: req.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      const err: LLMError = new Error('请求已取消');
      err.name = 'AbortError';
      throw err;
    }
    throw new Error(`网络错误: ${(e as Error).message}`);
  }

  if (!response.ok) {
    // 如果是 response_format 不支持,降级重试一次
    if (response.status === 400) {
      const txt = await safeText(response);
      if (/response_format|json_object/i.test(txt)) {
        delete body.response_format;
        let retry: Response;
        try {
          retry = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
          });
        } catch (e) {
          throw new Error(`网络错误: ${(e as Error).message}`);
        }
        if (!retry.ok) {
          const errTxt = await safeText(retry);
          throw makeHttpError(retry.status, errTxt);
        }
        response = retry;
      } else {
        throw makeHttpError(response.status, txt);
      }
    } else {
      const txt = await safeText(response);
      throw makeHttpError(response.status, txt);
    }
  }

  if (isStream) {
    return consumeStream(response, req.signal, cb);
  }
  return consumeJson(response);
}

/* ============= 流式 ============= */

async function consumeStream(
  response: Response,
  signal: AbortSignal | undefined,
  cb: StreamCallbacks,
): Promise<LLMResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('响应没有可读流');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let acc = '';
  let usage: LLMResult['usage'];
  let model: string | undefined;

  try {
    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch { /* ignore */ }
        break;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 拆 SSE 行
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const line = event.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          cb.onDone?.();
          return { content: acc, usage, model };
        }
        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (choice?.delta?.content) {
            acc += choice.delta.content;
            cb.onDelta?.(choice.delta.content);
          }
          // 一些 provider 在最后一条 chunk 里塞 usage
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens,
              completionTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            };
          }
          if (parsed.model && !model) model = parsed.model;
          if (choice?.finish_reason === 'stop') {
            cb.onDone?.();
            return { content: acc, usage, model };
          }
        } catch {
          // 忽略不完整 JSON,等下一行
        }
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      const err: LLMError = new Error('请求已取消');
      err.name = 'AbortError';
      throw err;
    }
    throw e;
  }

  cb.onDone?.();
  return { content: acc, usage, model };
}

/* ============= 一次性 ============= */

async function consumeJson(response: Response): Promise<LLMResult> {
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const u = json?.usage;
  return {
    content: String(content),
    usage: u
      ? {
          promptTokens: u.prompt_tokens,
          completionTokens: u.completion_tokens,
          totalTokens: u.total_tokens,
        }
      : undefined,
    model: json?.model,
  };
}

/* ============= helpers ============= */

async function safeText(r: Response): Promise<string> {
  try {
    return (await r.text()).slice(0, 1000);
  } catch {
    return '';
  }
}

function makeHttpError(status: number, body: string): LLMError {
  const err: LLMError = new Error(`LLM 返回 HTTP ${status}: ${body.slice(0, 500)}`);
  err.status = status;
  err.body = body;
  return err;
}
