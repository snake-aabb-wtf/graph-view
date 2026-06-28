/**
 * Graph View 内部统一数据模型。
 * 所有 Source Adapter 都要把外部数据转成这个形态。
 */

export type NodeType =
  // 对话域
  | 'conversation'
  | 'message'
  | 'tool_call'
  | 'resource'
  // 笔记/文件域
  | 'note'
  | 'file'
  // 知识图谱域
  | 'entity'
  // 代码域
  | 'package'
  | 'module'
  | 'class'
  | 'function'
  // 通用
  | 'unknown';

export interface GNode {
  id: string;
  type: NodeType;
  label: string;
  /** 颜色分组键;可由 type / tags / 邻近度派生。 */
  group?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface GEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GNode[];
  edges: GEdge[];
}
