import { create } from 'zustand';
import type { GNode, GEdge, GraphData } from '../adapters/types';

interface GraphState {
  nodes: Record<string, GNode>;
  edges: Record<string, GEdge>;
  /** 当前图谱的"来源名",显示在 StatusBar。 */
  sourceName: string;
  /** 当前选中的节点 id(点击锁定) */
  selectedId: string | null;
  /** 当前悬停的节点 id */
  hoveredId: string | null;

  loadGraph: (data: GraphData, sourceName?: string) => void;
  clear: () => void;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  /** 让 UI 拿到有序的节点/边数组 */
  nodeList: () => GNode[];
  edgeList: () => GEdge[];
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: {},
  edges: {},
  sourceName: '(empty)',
  selectedId: null,
  hoveredId: null,

  loadGraph: (data, sourceName = 'inline') => {
    const nodes: Record<string, GNode> = {};
    for (const n of data.nodes) nodes[n.id] = n;
    const edges: Record<string, GEdge> = {};
    for (const e of data.edges) edges[e.id] = e;
    set({ nodes, edges, sourceName, selectedId: null, hoveredId: null });
  },

  clear: () => {
    set({ nodes: {}, edges: {}, sourceName: '(empty)', selectedId: null, hoveredId: null });
  },

  setSelected: id => set({ selectedId: id }),
  setHovered: id => set({ hoveredId: id }),

  nodeList: () => Object.values(get().nodes),
  edgeList: () => Object.values(get().edges),
}));
