import type { GNode, GEdge, GraphData } from './types';
import { stableId } from '../utils/id';

/**
 * Markdown 适配器:把多份 .md 文件 + 文件名解析成笔记图谱。
 * - 每个文件 = 一个 note 节点(label 取文件名去后缀,或一级标题)
 * - 边 = wiki link:[[Note Name]] 或 [[Note Name|alias]]
 * - frontmatter (--- ... ---) 顶部的 tags: [a, b] / tags: a, b 解析成节点的 tags
 * - 多份 .md 一起喂进来时,跨文件链接也能识别
 */
export function fromMarkdownFiles(files: { name: string; content: string }[]): GraphData {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const edgeKeys = new Set<string>();

  // 第一遍:创建所有 note 节点
  for (const f of files) {
    const id = noteIdFromName(f.name);
    const { frontmatter, body, title } = parseFrontmatter(f.content);
    const tags = parseTags(frontmatter.tags);
    const folder = f.name.includes('/') ? f.name.split('/').slice(0, -1).join('/') : '';
    nodes.set(id, {
      id,
      type: 'note',
      label: title || stripExt(f.name.split('/').pop() || f.name),
      group: folder || '笔记',
      tags,
      properties: {
        path: f.name,
        size: f.content.length,
        ...frontmatter,
      },
    });

    // 第二遍就地解析 link:把 [[X]] 找出来
    const linkRe = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(body))) {
      const targetName = m[1].trim();
      const targetId = noteIdFromName(targetName);
      // 目标笔记可能不在文件列表里:也加进来作为 dangling 节点
      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          type: 'note',
          label: stripExt(targetName.split('/').pop() || targetName),
          group: '外部引用',
          tags: [],
          properties: { dangling: true },
        });
      }
      const edgeKey = `${id}::${targetId}`;
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey);
        edges.push({
          id: stableId('md', id, targetId),
          source: id,
          target: targetId,
          type: 'link',
        });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

export function fromMarkdown(text: string, fileName: string): GraphData {
  return fromMarkdownFiles([{ name: fileName, content: text }]);
}

/* ============== 工具 ============== */

function noteIdFromName(name: string): string {
  // 用去除后缀 + 去除路径的 basename 作为 id,保留可读性
  const base = name.replace(/\\/g, '/').split('/').pop() || name;
  return stripExt(base);
}

function stripExt(s: string): string {
  return s.replace(/\.(md|markdown|mdx)$/i, '');
}

interface FrontmatterResult {
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
}

function parseFrontmatter(content: string): FrontmatterResult {
  const fm: Record<string, unknown> = {};
  let body = content;
  let title = '';

  // 抓一级标题 # Title
  const titleMatch = content.match(/^\s*#\s+(.+?)\s*$/m);
  if (titleMatch) title = titleMatch[1].trim();

  // 抓 --- ... --- 包裹的 frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fmMatch) {
    body = content.slice(fmMatch[0].length);
    const lines = fmMatch[1].split('\n');
    for (const line of lines) {
      const kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (kv) {
        const k = kv[1].trim();
        let v: string | string[] = kv[2].trim();
        // 数组: [a, b] / [a, b,]
        if (v.startsWith('[') && v.endsWith(']')) {
          v = v
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else {
          v = v.replace(/^["']|["']$/g, '');
        }
        fm[k] = v;
      }
    }
    if (!title && typeof fm.title === 'string') title = fm.title;
  }
  return { frontmatter: fm, body, title };
}

function parseTags(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}
