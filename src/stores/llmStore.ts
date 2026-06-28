/**
 * LLM 运行时状态。
 * 故意不持久化 API key(避免长期明文落盘);
 * baseUrl / model 也不持久化,每次会话从 env 默认 + UI 输入,
 * 简化安全模型,完全在用户掌控下。
 */
import { create } from 'zustand';
import { defaultSettings, type LLMSettings } from '../llm/settings';

interface LLMState extends LLMSettings {
  streamMode: boolean;
  setBaseUrl: (s: string) => void;
  setApiKey: (s: string) => void;
  setModel: (s: string) => void;
  setStreamMode: (b: boolean) => void;
  resetToDefaults: () => void;
}

const init = defaultSettings();

export const useLLMStore = create<LLMState>(set => ({
  baseUrl: init.baseUrl,
  apiKey: init.apiKey,
  model: init.model,
  streamMode: false,
  setBaseUrl: s => set({ baseUrl: s }),
  setApiKey: s => set({ apiKey: s }),
  setModel: s => set({ model: s }),
  setStreamMode: b => set({ streamMode: b }),
  resetToDefaults: () => {
    const d = defaultSettings();
    set({ baseUrl: d.baseUrl, apiKey: '', model: d.model });
  },
}));
