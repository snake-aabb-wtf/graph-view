import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type ColorGroupBy = 'group' | 'type' | 'tag';
export type LabelMode = 'always' | 'hover' | 'never';

export interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  /** 显示设置 */
  nodeSizeWeight: number; // 0-5
  linkThickness: number; // 0.5-3
  colorGroupBy: ColorGroupBy;
  labelMode: LabelMode;
  showArrows: boolean;
  /** 力参数 */
  repelForce: number; // 100-3000
  linkForce: number; // 0-1
  centerForce: number; // 0-1
  gravity: number; // 0-1
  /** 文本搜索(支持 'A -> B' 路径查询,'A and B' 邻居查询) */
  searchQuery: string;
  /** 过滤(按 type) */
  typeFilter: string[]; // 空数组 = 不过滤

  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (b: boolean) => void;
  setNodeSizeWeight: (n: number) => void;
  setLinkThickness: (n: number) => void;
  setColorGroupBy: (g: ColorGroupBy) => void;
  setLabelMode: (m: LabelMode) => void;
  setShowArrows: (b: boolean) => void;
  setRepelForce: (n: number) => void;
  setLinkForce: (n: number) => void;
  setCenterForce: (n: number) => void;
  setGravity: (n: number) => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (types: string[]) => void;
  /** 批量应用,启动时从 localStorage 恢复 */
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = 'graph_view_v2_ui_v1';

function loadInitial(): Partial<UiState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UiState>;
  } catch {
    return {};
  }
}

const persisted = loadInitial();

export const useUiStore = create<UiState>((set, get) => ({
  theme: persisted.theme ?? 'light',
  sidebarOpen: persisted.sidebarOpen ?? true,
  nodeSizeWeight: persisted.nodeSizeWeight ?? 1.5,
  linkThickness: persisted.linkThickness ?? 1,
  colorGroupBy: persisted.colorGroupBy ?? 'group',
  labelMode: persisted.labelMode ?? 'always',
  showArrows: persisted.showArrows ?? true,
  repelForce: persisted.repelForce ?? 800,
  linkForce: persisted.linkForce ?? 0.45,
  centerForce: persisted.centerForce ?? 0.3,
  gravity: persisted.gravity ?? 0.25,
  searchQuery: '',
  typeFilter: [],

  setTheme: t => {
    set({ theme: t });
    persist(get());
  },
  toggleSidebar: () => {
    set(s => ({ sidebarOpen: !s.sidebarOpen }));
    persist(get());
  },
  setSidebarOpen: b => {
    set({ sidebarOpen: b });
    persist(get());
  },
  setNodeSizeWeight: n => {
    set({ nodeSizeWeight: n });
    persist(get());
  },
  setLinkThickness: n => {
    set({ linkThickness: n });
    persist(get());
  },
  setColorGroupBy: g => {
    set({ colorGroupBy: g });
    persist(get());
  },
  setLabelMode: m => {
    set({ labelMode: m });
    persist(get());
  },
  setShowArrows: b => {
    set({ showArrows: b });
    persist(get());
  },
  setRepelForce: n => {
    set({ repelForce: n });
    persist(get());
  },
  setLinkForce: n => {
    set({ linkForce: n });
    persist(get());
  },
  setCenterForce: n => {
    set({ centerForce: n });
    persist(get());
  },
  setGravity: n => {
    set({ gravity: n });
    persist(get());
  },
  setSearchQuery: q => set({ searchQuery: q }), // 搜索不持久化
  setTypeFilter: types => set({ typeFilter: types }), // 过滤不持久化
  hydrateFromStorage: () => {
    const init = loadInitial();
    set({ ...init, searchQuery: '', typeFilter: [] } as Partial<UiState>);
  },
}));

function persist(state: UiState) {
  try {
    const snapshot = {
      theme: state.theme,
      sidebarOpen: state.sidebarOpen,
      nodeSizeWeight: state.nodeSizeWeight,
      linkThickness: state.linkThickness,
      colorGroupBy: state.colorGroupBy,
      labelMode: state.labelMode,
      showArrows: state.showArrows,
      repelForce: state.repelForce,
      linkForce: state.linkForce,
      centerForce: state.centerForce,
      gravity: state.gravity,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[uiStore] persist failed', e);
  }
}

