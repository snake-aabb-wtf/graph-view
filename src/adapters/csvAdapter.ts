import Papa from 'papaparse';
import type { GNode, GEdge, GraphData } from './types';
import { stableId } from '../utils/id';

/**
 * CSV 适配器:支持两种形态
 *  A) 边表:必须包含 source / target 列,可选 type / weight / label
 *     - 如果 source/target 引用的 id 不在 nodes 列,自动补为 dangling 节点
 *     - 如果有 label 列,生成的节点 label 用它;否则用 id
 *     - 如果有 group 列,生成的节点 group 用它
 *  B) 节点表:必须包含 id 列,可选 label / type / group / tags
 *     - 没有 source/target 边表时使用
 *
 * 判定方式:有 source(或 from)列 + target(或 to)列 → 边表;否则 → 节点表
 */
export function fromCsv(text: string, fileName: string): GraphData {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length) {
    console.warn('[csv] 解析警告:', parsed.errors);
  }
  const rows = parsed.data;
  if (!rows.length) return { nodes: [], edges: [] };

  const first = rows[0];
  const hasSource = 'source' in first || 'from' in first;
  const hasTarget = 'target' in first || 'to' in first;
  const hasId = 'id' in first;

  if (hasSource && hasTarget) {
    return buildEdgeTable(rows, fileName);
  }
  if (hasId) {
    return buildNodeTable(rows, fileName);
  }
  throw new Error('CSV 格式不正确:需要 {source, target} 边表 或 {id, ...} 节点表');
}

function buildEdgeTable(rows: Record<string, string>[], fileName: string): GraphData {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  for (const row of rows) {
    const source = (row.source || row.from || '').trim();
    const target = (row.target || row.to || '').trim();
    if (!source || !target) continue;
    const type = (row.type || row.relation || 'edge').trim();
    const weight = row.weight ? Number(row.weight) : undefined;

    if (!nodes.has(source)) {
      nodes.set(source, {
        id: source,
        type: 'entity',
        label: (row.source_label || source).trim(),
        group: (row.source_group || row.group || fileName).trim(),
      });
    }
    if (!nodes.has(target)) {
      nodes.set(target, {
        id: target,
        type: 'entity',
        label: (row.target_label || target).trim(),
        group: (row.target_group || row.group || fileName).trim(),
      });
    }
    edges.push({
      id: stableId('csv', source, target, type, String(edges.length)),
      source,
      target,
      type,
      weight: Number.isFinite(weight) ? weight : undefined,
    });
  }
  return { nodes: [...nodes.values()], edges };
}

function buildNodeTable(rows: Record<string, string>[], fileName: string): GraphData {
  const nodes: GNode[] = [];
  for (const row of rows) {
    const id = (row.id || '').trim();
    if (!id) continue;
    const tagsRaw = row.tags;
    let tags: string[] | undefined;
    if (tagsRaw) tags = tagsRaw.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    nodes.push({
      id,
      type: ((row.type as GNode['type']) || 'entity'),
      label: (row.label || row.name || id).trim(),
      group: (row.group || row.category || fileName).trim(),
      tags,
      properties: row,
    });
  }
  return { nodes, edges: [] };
}
