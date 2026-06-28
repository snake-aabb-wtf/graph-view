import type { GNode, GEdge, GraphData } from './types';
import { stableId } from '../utils/id';

/**
 * 通用 JSON 适配器。
 * 支持两种输入形态:
 *  A) { nodes: [...], edges: [...] }  —— 直接转,字段映射见下
 *  B) { id1: {...}, id2: {...} }      —— 把对象当作节点集合,自动从 properties 抽边
 *
 * 节点字段映射(以下划线 / camelCase 兼容):
 *   id, type, label, group, tags(数组或逗号分隔字符串), properties
 *
 * 边字段映射:
 *   id, source, target, type, weight, properties
 */
export function fromJson(text: string, fileName: string): GraphData {
  const raw = JSON.parse(text);

  if (raw && Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
    return {
      nodes: raw.nodes.map(coerceNode).filter(Boolean) as GNode[],
      edges: raw.edges.map(coerceEdge).filter(Boolean) as GEdge[],
    };
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    // 形态 B:对象 map,value 是节点定义
    const nodes: GNode[] = [];
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const v = val as Record<string, unknown>;
        const node: GNode = {
          id: (v.id as string) || key,
          type: ((v.type as GNode['type']) || 'entity'),
          label: (v.label as string) || (v.name as string) || key,
          group: (v.group as string) || (v.category as string) || fileName,
          tags: coerceTags(v.tags),
          properties: v,
        };
        nodes.push(node);
      } else {
        // 标量当成节点
        nodes.push({
          id: key,
          type: 'entity',
          label: key,
          group: fileName,
          properties: { value: val },
        });
      }
    }
    return { nodes, edges: [] };
  }

  throw new Error('JSON 格式不正确:需要 {nodes, edges} 形态或对象 map');
}

function coerceNode(v: unknown): GNode | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = (o.id as string) || (o._id as string) || stableId(JSON.stringify(o));
  return {
    id,
    type: ((o.type as GNode['type']) || 'entity'),
    label: (o.label as string) || (o.name as string) || (o.title as string) || id,
    group: (o.group as string) || (o.category as string) || (o.kind as string),
    tags: coerceTags(o.tags),
    properties: (o.properties as Record<string, unknown>) || o,
  };
}

function coerceEdge(v: unknown): GEdge | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const source = (o.source as string) || (o.from as string);
  const target = (o.target as string) || (o.to as string);
  if (!source || !target) return null;
  return {
    id: (o.id as string) || stableId('e', source, target, o.type as string),
    source,
    target,
    type: (o.type as string) || (o.relation as string) || (o.predicate as string),
    weight: typeof o.weight === 'number' ? o.weight : undefined,
    properties: (o.properties as Record<string, unknown>) || o,
  };
}

function coerceTags(v: unknown): string[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return undefined;
}
