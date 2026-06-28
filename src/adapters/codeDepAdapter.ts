import type { GNode, GEdge, GraphData } from './types';
import { stableId } from '../utils/id';

/**
 * 代码依赖适配器:导入用户上传的 manifest JSON(已分析好的依赖图)。
 * 推荐 manifest 形态(任选其一):
 *  A) { nodes: [{id, type, label, group?, tags?}], edges: [{source, target, type}] }
 *  B) { packages: [...], imports: [{from, to}] }
 *  C) npm ls --json 输出(自动识别 dependencies 树,生成包依赖图)
 *
 * node.type 取值建议:package / module / class / function
 */
export function fromCodeManifest(text: string, fileName: string): GraphData {
  const raw = JSON.parse(text);

  // 形态 A
  if (raw && Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
    return {
      nodes: raw.nodes.map(coerceNode).filter(Boolean) as GNode[],
      edges: raw.edges.map(coerceEdge).filter(Boolean) as GEdge[],
    };
  }

  // 形态 B
  if (raw && Array.isArray(raw.packages) && Array.isArray(raw.imports)) {
    const nodes: GNode[] = raw.packages.map(
      (p: Record<string, unknown>) =>
        ({
          id: (p.id as string) || (p.name as string),
          type: 'package',
          label: (p.label as string) || (p.name as string) || (p.id as string),
          group: (p.group as string) || (p.ecosystem as string) || 'packages',
          tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
          properties: p,
        }) as GNode,
    );
    const edges: GEdge[] = raw.imports
      .map((imp: Record<string, unknown>) => {
        const source = (imp.from as string) || (imp.source as string);
        const target = (imp.to as string) || (imp.target as string);
        if (!source || !target) return null;
        return {
          id: stableId('cd', source, target, String(imp.type || 'imports')),
          source,
          target,
          type: (imp.type as string) || 'imports',
        } as GEdge;
      })
      .filter(Boolean) as GEdge[];
    return { nodes, edges };
  }

  // 形态 C:npm ls --json 输出
  if (raw && raw.dependencies && typeof raw.dependencies === 'object') {
    return fromNpmLs(raw, fileName);
  }

  throw new Error(
    '代码依赖 manifest 格式不正确:需要 {nodes, edges} / {packages, imports} / npm ls --json 之一',
  );
}

function fromNpmLs(root: Record<string, unknown>, fileName: string): GraphData {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const walk = (pkg: Record<string, unknown>, parent: string | null) => {
    const name = (pkg.name as string) || (pkg._id as string);
    if (!name) return;
    if (!seen.has(name)) {
      seen.add(name);
      const version = (pkg.version as string) || '';
      nodes.set(name, {
        id: name,
        type: 'package',
        label: version ? `${name}@${version}` : name,
        group: parent || 'root',
        tags: pkg.problems ? ['有警告'] : undefined,
        properties: { version, path: pkg.path, problems: pkg.problems },
      });
    }
    if (parent) {
      edges.push({
        id: stableId('npm', parent, name),
        source: parent,
        target: name,
        type: 'depends-on',
      });
    }
    const deps = pkg.dependencies as Record<string, Record<string, unknown>> | undefined;
    if (deps) {
      for (const child of Object.values(deps)) {
        walk(child, name);
      }
    }
  };
  walk(root, null);
  if (!nodes.size) {
    nodes.set(fileName, {
      id: fileName,
      type: 'package',
      label: fileName,
      group: 'root',
    });
  }
  return { nodes: [...nodes.values()], edges };
}

function coerceNode(v: unknown): GNode | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = (o.id as string) || (o.name as string);
  if (!id) return null;
  return {
    id,
    type: ((o.type as GNode['type']) || 'module'),
    label: (o.label as string) || id,
    group: (o.group as string) || 'code',
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : undefined,
    properties: o,
  };
}

function coerceEdge(v: unknown): GEdge | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const source = (o.source as string) || (o.from as string);
  const target = (o.target as string) || (o.to as string);
  if (!source || !target) return null;
  return {
    id: stableId('cd-e', source, target, String(o.type || 'edge')),
    source,
    target,
    type: (o.type as string) || 'edge',
  };
}
