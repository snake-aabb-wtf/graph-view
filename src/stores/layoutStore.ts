import { create } from 'zustand';

export type LayoutStatus = 'idle' | 'running' | 'paused' | 'done';

interface LayoutState {
  status: LayoutStatus;
  setStatus: (s: LayoutStatus) => void;
  /** 触发重运行,这个计数器变化时,GraphCanvas 监听到就会重跑布局。 */
  runNonce: number;
  triggerRerun: () => void;
  /** 触发重置位置,清掉 localStorage 缓存并随机化。 */
  resetNonce: number;
  triggerReset: () => void;
}

export const useLayoutStore = create<LayoutState>(set => ({
  status: 'idle',
  setStatus: s => set({ status: s }),
  runNonce: 0,
  triggerRerun: () => set(s => ({ runNonce: s.runNonce + 1, status: 'running' })),
  resetNonce: 0,
  triggerReset: () => set(s => ({ resetNonce: s.resetNonce + 1, status: 'running' })),
}));
