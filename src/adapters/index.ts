import type { GraphData } from './types';
import { fromJson } from './jsonAdapter';
import { fromMarkdown, fromMarkdownFiles } from './markdownAdapter';
import { fromCsv } from './csvAdapter';
import { fromTriples } from './triplesAdapter';
import { fromCodeManifest } from './codeDepAdapter';

export type AdapterKind =
  | 'json'
  | 'markdown'
  | 'markdown-multi'
  | 'csv'
  | 'triples'
  | 'code';

export interface AdapterResult {
  sourceName: string;
  data: GraphData;
  warnings?: string[];
}

/**
 * 单文件入口:按扩展名/内容嗅探分派到具体 adapter。
 */
export function adaptFile(file: File): Promise<AdapterResult> {
  const name = file.name;
  const ext = (name.split('.').pop() || '').toLowerCase();
  return file.text().then(text => adaptText(text, name, ext));
}

/**
 * 文本入口:扩展名已知时直接分派。
 * ext 留空时做内容嗅探(JSON 头 / 第一个非空字符是 <)。
 */
export function adaptText(text: string, name: string, ext?: string): AdapterResult {
  const e = (ext || name.split('.').pop() || '').toLowerCase();
  const trimmed = text.trimStart();

  // 内容嗅探优先
  if (!e) {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return wrap(name, () => fromJson(text, name), 'json');
    }
    if (trimmed.startsWith('<')) {
      return wrap(name, () => fromTriples(text, name), 'triples');
    }
    if (/^id,|^\s*source,|^\s*from,/i.test(trimmed.split('\n')[0] || '')) {
      return wrap(name, () => fromCsv(text, name), 'csv');
    }
  }

  switch (e) {
    case 'json':
      return wrap(name, () => fromJson(text, name), 'json');
    case 'md':
    case 'markdown':
    case 'mdx':
      return wrap(name, () => fromMarkdown(text, name), 'markdown');
    case 'csv':
    case 'tsv':
      return wrap(name, () => fromCsv(text, name), 'csv');
    case 'nt':
    case 'ttl':
    case 'turtle':
    case 'ntriples':
      return wrap(name, () => fromTriples(text, name), 'triples');
    case 'code-manifest':
    case 'deps':
    case 'npm-ls':
      return wrap(name, () => fromCodeManifest(text, name), 'code');
    default:
      throw new Error(`不支持的文件扩展名: .${e}`);
  }
}

/**
 * 多 .md 文件批量入口:把每个文件当作笔记节点。
 */
export async function adaptMarkdownFiles(files: File[]): Promise<AdapterResult> {
  const items = await Promise.all(
    files.map(async f => ({ name: f.name, content: await f.text() })),
  );
  const data = fromMarkdownFiles(items);
  return { sourceName: `Markdown 笔记 (${files.length} 个)`, data };
}

function wrap(name: string, fn: () => GraphData, _kind: AdapterKind): AdapterResult {
  try {
    const data = fn();
    return { sourceName: name, data };
  } catch (e) {
    throw new Error(`[${name}] 解析失败: ${(e as Error).message}`);
  }
}
