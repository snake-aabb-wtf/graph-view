import type { GNode, GEdge, GraphData } from './types';
import { stableId } from '../utils/id';

/**
 * N-Triples / Turtle 适配器(支持部分语法)。
 * 每行一个三元组:<subject> <predicate> <object> .
 * - subject 和 predicate 用 <URI> 形式
 * - object 可以是 <URI> 或 "literal"
 * - 跳过空行 / 注释行 (# ...)
 * - 同一 subject 多次出现,后续谓词作为它的额外属性
 */
export function fromTriples(text: string, fileName: string): GraphData {
  void fileName;
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const edgeKeys = new Set<string>();
  const subjectProps = new Map<string, Record<string, unknown>>();

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    // 去掉行尾 .
    const stmt = line.replace(/\.\s*$/, '').trim();
    const m = stmt.match(/^(<([^>]+)>)\s+(<([^>]+)>)\s+(.+)$/);
    if (!m) continue;
    const subject = m[2];
    const predicate = m[4];
    const objectRaw = m[5].trim();

    // object 可能是 <URI> 或 "literal" 或 "literal"@lang 或 "literal"^^<type>
    let objectId: string | null = null;
    let objectLabel: string | null = null;
    if (objectRaw.startsWith('<') && objectRaw.endsWith('>')) {
      objectId = objectRaw.slice(1, -1);
      objectLabel = shortenUri(objectId);
    } else {
      const lit = objectRaw.match(/^"((?:[^"\\]|\\.)*)"/);
      if (lit) {
        objectLabel = unescape(lit[1]);
        // 字面量作为属性附加,不创建边节点
        const props = subjectProps.get(subject) || {};
        props[shortenUri(predicate)] = objectLabel;
        subjectProps.set(subject, props);
        continue;
      } else {
        continue; // 不认识的语法
      }
    }

    // subject 节点
    if (!nodes.has(subject)) {
      const props = subjectProps.get(subject) || {};
      nodes.set(subject, {
        id: subject,
        type: 'entity',
        label: shortenUri(subject),
        group: shortenUriNamespace(subject),
        tags: [],
        properties: props,
      });
    } else {
      // 合并新属性
      const newProps = subjectProps.get(subject);
      if (newProps) {
        const n = nodes.get(subject)!;
        n.properties = { ...n.properties, ...newProps };
      }
    }

    // object 节点(URI)
    if (objectId && !nodes.has(objectId)) {
      nodes.set(objectId, {
        id: objectId,
        type: 'entity',
        label: objectLabel,
        group: shortenUriNamespace(objectId),
        tags: [],
      });
    }

    // 边(去重)
    const key = `${subject}::${predicate}::${objectId}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({
        id: stableId('t', subject, predicate, objectId!),
        source: subject,
        target: objectId!,
        type: shortenUri(predicate),
      });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

function shortenUri(uri: string): string {
  // 去掉常见前缀
  const m = uri.match(/[#/]([^#/]+)$/);
  return m ? m[1] : uri;
}

function shortenUriNamespace(uri: string): string {
  // 取命名空间(去掉最后一段)
  const m = uri.match(/^(.*?)[#/][^#/]+$/);
  return m ? shortenUri(m[1]) : uri;
}

function unescape(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}
