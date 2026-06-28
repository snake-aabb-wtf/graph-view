/**
 * 把 LLM 输出的文本解析为标准 GraphData。
 * 容错处理:
 *   - 去掉可能包裹的 ```json ... ``` 代码块
 *   - 校验顶层结构
 *   - 节点/边的字段兜底(id 缺失时用 stableId;label 缺失时用 id;group 缺失时用 '未知')
 *   - type 字段不在 NodeType 白名单时 → 'unknown',原值存 properties.rawType
 *   - 过滤掉 source/target 指向不存在节点的边
 *   - 同 source/target/type 的边去重
 */

import type { GraphData, GNode, GEdge, NodeType } from '../adapters/types';
import { stableId } from '../utils/id';

const NODE_TYPE_WHITELIST: ReadonlySet<NodeType> = new Set<NodeType>([
  'conversation',
  'message',
  'tool_call',
  'resource',
  'note',
  'file',
  'entity',
  'package',
  'module',
  'class',
  'function',
  'unknown',
]);

const LLM_TYPE_MAP: Record<string, NodeType> = {
  person: 'entity',
  organization: 'entity',
  organisation: 'entity',
  location: 'entity',
  place: 'entity',
  event: 'entity',
  concept: 'entity',
  work: 'entity',
  object: 'entity',
  item: 'entity',
  technology: 'entity',
  tech: 'entity',
};

export interface ParseOptions {
  /** 节点数 / 边数硬上限,防止 LLM 失控。 */
  maxNodes?: number;
  maxEdges?: number;
  /** sourceName 注入用,例如 "LLM 抽取: <text 前 30 字>" */
  sourceNameHint?: string;
}

export interface ParseResult {
  data: GraphData;
  warnings: string[];
}

export function parseLLMOutput(raw: string, opts: ParseOptions = {}): ParseResult {
  const warnings: string[] = [];
  const maxNodes = opts.maxNodes ?? 200;
  const maxEdges = opts.maxEdges ?? 500;

  // 1) 去掉可能的 ```json ... ``` / ``` ... ``` 包裹
  const text = stripCodeFence(raw);

  // 2) 解析 JSON
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // 尝试从文本里抠出第一个 {...} 块
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      throw new Error(
        `LLM 返回的不是合法 JSON: ${(e as Error).message}\n\n原文前 200 字:\n${text.slice(0, 200)}`,
      );
    }
    try {
      json = JSON.parse(m[0]);
    } catch (e2) {
      throw new Error(
        `LLM 返回的 JSON 无法解析: ${(e2 as Error).message}\n\n原文前 200 字:\n${text.slice(0, 200)}`,
      );
    }
  }

  // 3) 校验顶层结构
  if (!json || typeof json !== 'object') {
    throw new Error('LLM 返回的 JSON 顶层不是对象');
  }
  const obj = json as Record<string, unknown>;
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];
  if (!rawNodes.length) warnings.push('LLM 没抽取到任何节点');

  // 4) 归一化节点
  const nodeMap = new Map<string, GNode>();
  const nodeIds = new Set<string>();
  for (let i = 0; i < rawNodes.length && nodeMap.size < maxNodes; i++) {
    const n = coerceNode(rawNodes[i], i);
    if (!n) continue;
    if (nodeIds.has(n.id)) {
      n.id = stableId('dup', n.id, String(i));
    }
    nodeIds.add(n.id);
    nodeMap.set(n.id, n);
  }

  // 5) 归一化边 + 过滤孤立 + 去重
  const edges: GEdge[] = [];
  const edgeKeys = new Set<string>();
  for (let i = 0; i < rawEdges.length && edges.length < maxEdges; i++) {
    const e = coerceEdge(rawEdges[i], i);
    if (!e) continue;
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      warnings.push(`边的端点不存在,已过滤: ${e.source} -> ${e.target}`);
      continue;
    }
    const k = `${e.source}::${e.target}::${e.type || ''}`;
    if (edgeKeys.has(k)) continue;
    edgeKeys.add(k);
    edges.push(e);
  }

  return { data: { nodes: [...nodeMap.values()], edges }, warnings };
}

function stripCodeFence(s: string): string {
  let t = s.trim();
  // 去掉开头的 ```json / ```
  t = t.replace(/^```(?:json)?\s*/i, '');
  t = t.replace(/```\s*$/, '');
  return t.trim();
}

function coerceNode(v: unknown, index: number): GNode | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const label = String(o.label || o.name || o.title || o.id || `node-${index}`).trim();
  if (!label) return null;
  let id = String(o.id || o.key || slugify(label)).trim();
  if (!id) id = stableId('n', label, String(index));
  id = slugify(id) || stableId('n', String(index));

  const rawType = String(o.type || '').trim().toLowerCase();
  const mapped = LLM_TYPE_MAP[rawType] || rawType;
  const type: NodeType = NODE_TYPE_WHITELIST.has(mapped as NodeType)
    ? (mapped as NodeType)
    : 'unknown';

  const group = String(o.group || o.category || '未知').trim() || '未知';
  const tagsRaw = o.tags;
  const tags: string[] | undefined = Array.isArray(tagsRaw)
    ? tagsRaw.map(t => String(t).trim()).filter(Boolean).slice(0, 5)
    : undefined;

  const properties: Record<string, unknown> =
    o.properties && typeof o.properties === 'object' ? { ...(o.properties as object) } : {};
  if (rawType && rawType !== type) {
    properties.rawType = rawType;
  }

  return { id, type, label, group, tags, properties };
}

function coerceEdge(v: unknown, index: number): GEdge | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const source = String(o.source || o.from || o.subject || '').trim();
  const target = String(o.target || o.to || o.object || '').trim();
  if (!source || !target) return null;
  const type = String(o.type || o.relation || o.predicate || '').trim() || undefined;
  const weight =
    typeof o.weight === 'number' && Number.isFinite(o.weight) ? o.weight : undefined;
  return {
    id: String(o.id || '') || stableId('e', source, target, type || '', String(index)),
    source,
    target,
    type,
    weight,
    properties: (o.properties as Record<string, unknown>) || {},
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}
