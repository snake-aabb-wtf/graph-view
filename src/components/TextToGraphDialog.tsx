import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLLMStore } from '../stores/llmStore';
import { useGraphStore } from '../stores/graphStore';
import { useLayoutStore } from '../stores/layoutStore';
import { callLLM } from '../llm/provider';
import { parseLLMOutput } from '../llm/parse';
import { SYSTEM_PROMPT, estimateTokens } from '../llm/prompts';
import { SAMPLE_TEXTS } from '../samples/llmSampleTexts';

type Status = 'idle' | 'streaming' | 'error';

interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export function TextToGraphDialog({ open, onClose }: DialogProps) {
  const llm = useLLMStore();
  const loadGraph = useGraphStore(s => s.loadGraph);
  const triggerRerun = useLayoutStore(s => s.triggerRerun);

  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [streamedPreview, setStreamedPreview] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ESC 关闭 / 打开时 focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === 'streaming') {
          abortRef.current?.abort();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, status, onClose]);

  // 卸载 / 关闭时确保取消流
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!open) return null;

  const handleGenerate = async () => {
    if (status === 'streaming') {
      abortRef.current?.abort();
      return;
    }
    if (!text.trim()) {
      setErrorMsg('请先输入文本');
      setStatus('error');
      return;
    }
    if (!llm.apiKey.trim() && !llm.baseUrl.startsWith('http')) {
      // 同源代理(开发)但 key 为空,可能是后端代理场景,允许;不阻止
    }
    if (!llm.apiKey.trim() && llm.baseUrl.startsWith('http')) {
      setErrorMsg('直连外部 endpoint 时必须填 API Key');
      setStatus('error');
      return;
    }
    setErrorMsg('');
    setWarnings([]);
    setStreamedPreview('');
    setStatus('streaming');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await callLLM(
        {
          baseUrl: llm.baseUrl,
          apiKey: llm.apiKey,
          model: llm.model,
          systemPrompt: SYSTEM_PROMPT,
          userContent: text,
          stream: llm.streamMode,
          signal: controller.signal,
        },
        {
          onDelta: delta => {
            setStreamedPreview(prev => (prev + delta).slice(-2000));
          },
        },
      );

      // 解析
      const sourceName = `LLM 抽取 · ${text.slice(0, 24).replace(/\s+/g, ' ')}${text.length > 24 ? '…' : ''}`;
      const parsed = parseLLMOutput(result.content, { sourceNameHint: sourceName });
      setWarnings(parsed.warnings);

      if (!parsed.data.nodes.length) {
        setStatus('error');
        setErrorMsg('LLM 没抽取到任何节点。请换个文本或调整 prompt。');
        return;
      }

      loadGraph(parsed.data, sourceName);
      setTimeout(() => triggerRerun(), 50);
      setStatus('idle');
      onClose();
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') {
        setStatus('idle');
        setErrorMsg('已取消');
        return;
      }
      setStatus('error');
      setErrorMsg(err.message || String(e));
    } finally {
      abortRef.current = null;
    }
  };

  const charCount = text.length;
  const estTokens = estimateTokens(text + SYSTEM_PROMPT);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ttg-title">
        <div className="modal__header">
          <h2 id="ttg-title" className="modal__title">
            <SparklesIcon /> 文本生成图谱
          </h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="close" title="关闭 (Esc)">
            ×
          </button>
        </div>

        <div className="modal__body">
          {/* Settings */}
          <details className="modal__settings" open>
            <summary>LLM 配置</summary>
            <div className="modal__settings-grid">
              <label className="form-row">
                <span>Base URL</span>
                <input
                  className="form-input"
                  type="text"
                  value={llm.baseUrl}
                  onChange={e => llm.setBaseUrl(e.target.value)}
                  placeholder="/llm  或  https://api.deepseek.com/v1"
                  spellCheck={false}
                />
              </label>
              <label className="form-row">
                <span>API Key</span>
                <input
                  className="form-input"
                  type="password"
                  value={llm.apiKey}
                  onChange={e => llm.setApiKey(e.target.value)}
                  placeholder="sk-…(同源代理可不填)"
                  autoComplete="off"
                />
              </label>
              <label className="form-row">
                <span>Model</span>
                <input
                  className="form-input"
                  type="text"
                  value={llm.model}
                  onChange={e => llm.setModel(e.target.value)}
                  placeholder="gpt-4o-mini / deepseek-chat / llama3 …"
                  spellCheck={false}
                />
              </label>
              <label className="form-row form-row--inline">
                <input
                  type="checkbox"
                  checked={llm.streamMode}
                  onChange={e => llm.setStreamMode(e.target.checked)}
                />
                <span>流式响应(实时看到模型输出)</span>
              </label>
            </div>
            <p className="modal__hint">
              <strong>Base URL 默认</strong>: <code>/llm</code>(同源代理,由 Vite dev server
              转发到 <code>VITE_LLM_DEFAULT_TARGET</code>,不会暴露 API Key)。
              <br />
              也可填直连 endpoint(如 <code>https://api.deepseek.com/v1</code>),浏览器直连需要对方允许 CORS。
            </p>
          </details>

          {/* Textarea */}
          <label className="form-row form-row--stack">
            <span className="form-row__label">
              输入文本
              <span className="modal__char-count">
                {charCount.toLocaleString()} 字符 · ≈ {estTokens.toLocaleString()} tokens
              </span>
            </span>
            <textarea
              ref={textareaRef}
              className="form-textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="把任意一段文字(日记、会议记录、文章…)粘到这里,LLM 会自动抽取实体-关系并渲染成图谱。"
              rows={10}
              disabled={status === 'streaming'}
            />
          </label>

          {/* 样例快捷 */}
          <div className="modal__samples">
            <span className="modal__samples-label">载入样例:</span>
            {SAMPLE_TEXTS.map(s => (
              <button
                key={s.name}
                className="btn btn--ghost"
                onClick={() => setText(s.text)}
                disabled={status === 'streaming'}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* 流式预览 */}
          {llm.streamMode && status === 'streaming' && (
            <details className="modal__stream-preview" open>
              <summary>实时输出</summary>
              <pre className="modal__stream-content">{streamedPreview || '⏳ 等待模型响应…'}</pre>
            </details>
          )}

          {/* 错误 */}
          {errorMsg && status === 'error' && (
            <div className="error-banner">
              <strong>生成失败</strong>
              <pre>{errorMsg}</pre>
            </div>
          )}

          {/* 警告(成功但有过滤) */}
          {warnings.length > 0 && status === 'idle' && (
            <div className="warn-banner">
              <strong>提示</strong>
              <ul>
                {warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 5 && <li>…还有 {warnings.length - 5} 条</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button
            className="btn"
            onClick={onClose}
            disabled={status === 'streaming'}
          >
            取消
          </button>
          <button
            className={`btn ${status === 'streaming' ? '' : 'btn--primary'}`}
            onClick={handleGenerate}
            disabled={!text.trim()}
          >
            {status === 'streaming' ? (
              <>
                <span className="spinner" /> 停止
              </>
            ) : (
              <>
                <SparklesIcon /> 生成图谱
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-5.8L4 10l5.8-1.9L12 3z" />
      <path d="M19 17l.7 2.1L22 20l-2.3.9L19 23l-.7-2.1L16 20l2.3-.9L19 17z" />
    </svg>
  );
}
