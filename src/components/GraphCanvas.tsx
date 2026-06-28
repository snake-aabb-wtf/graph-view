import { useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useGraphStore } from '../stores/graphStore';
import { useUiStore } from '../stores/uiStore';
import { useLayoutStore } from '../stores/layoutStore';
import { groupKey } from '../graph/palette';
import { buildStyles } from '../graph/styles';
import { savePositions, loadPositions, clearPositions } from '../graph/persistence';
import { debounce } from '../utils/debounce';

cytoscape.use(fcose);

/** 读 CSS 变量,把所有 group 解析成实际色值。 */
function resolvePalette(groups: (string | undefined | null)[]): Map<string, string> {
  const map = new Map<string, string>();
  const cs = getComputedStyle(document.documentElement);
  // 1-10 号色 + 默认
  for (const g of groups) {
    const key = groupKey(g);
    if (map.has(key)) continue;
    const idx = Math.abs(hashString(key)) % 10 + 1;
    const cssVar = cs.getPropertyValue(`--c-${idx}`).trim() || '#525252';
    map.set(key, cssVar);
  }
  map.set('__default__', cs.getPropertyValue('--c-default').trim() || '#525252');
  return map;
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

interface GraphCanvasProps {
  /** 当前加载的图谱的 sourceKey,用于位置缓存。 */
  sourceKey: string;
}

export function GraphCanvas({ sourceKey }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // 监听 store
  const nodeList = useGraphStore(s => s.nodeList());
  const edgeList = useGraphStore(s => s.edgeList());
  const setSelected = useGraphStore(s => s.setSelected);
  const setHovered = useGraphStore(s => s.setHovered);

  const ui = useUiStore();
  const setLayoutStatus = useLayoutStore(s => s.setStatus);
  const runNonce = useLayoutStore(s => s.runNonce);
  const resetNonce = useLayoutStore(s => s.resetNonce);

  // 创建 cy 实例(只一次)
  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.2,
      style: [], // 之后用 fromJson 注入
    });
    cyRef.current = cy;

    // 事件:点击空白处清除选区
    cy.on('tap', evt => {
      if (evt.target === cy) {
        clearHighlight(cy);
        setSelected(null);
        // 关闭 label-on-hover
        cy.nodes().removeClass('show-label');
      }
    });

    // 事件:点击节点锁定高亮
    cy.on('tap', 'node', evt => {
      const node = evt.target;
      applyHighlight(cy, node.id());
      setSelected(node.id());
    });

    // 事件:悬停
    cy.on('mouseover', 'node', evt => {
      const node = evt.target;
      setHovered(node.id());
      if (useUiStore.getState().labelMode === 'hover') {
        node.addClass('show-label');
      }
      if (!useGraphStore.getState().selectedId) {
        applyHighlight(cy, node.id());
      }
    });

    cy.on('mouseout', 'node', evt => {
      const node = evt.target;
      setHovered(null);
      node.removeClass('show-label');
      if (!useGraphStore.getState().selectedId) {
        clearHighlight(cy);
      }
    });

    // 拖拽完成后保存位置
    const save = debounce(() => {
      if (cyRef.current) savePositions(cyRef.current, sourceKey);
    }, 300);
    cy.on('dragfree', 'node', save);

    return () => {
      save.flush();
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听数据变化 → 同步到 cy
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const elements: ElementDefinition[] = [
      ...nodeList.map(n => ({
        group: 'nodes' as const,
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          group: n.group,
          groupKey: groupKey(n.group),
          tags: n.tags || [],
          properties: n.properties || {},
        },
      })),
      ...edgeList.map(e => ({
        group: 'edges' as const,
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          weight: e.weight,
          properties: e.properties || {},
        },
      })),
    ];

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    // 应用样式
    applyStyles(cy);

    // 加载缓存的位置
    const restored = loadPositions(cy, sourceKey);
    if (restored && restored.length > 0) {
      // 已经按 sourceKey 还原了位置
      setLayoutStatus('done');
    } else {
      // 没有缓存 → 跑 fcose
      runLayout(cy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeList, edgeList, sourceKey]);

  // 监听 UI 变化 → 重新套样式
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyStyles(cy);

    // 搜索:支持三种模式
    //   1) 普通文本 → 模糊匹配 label/tag
    //   2) 'A and B' → 同时连接到 A 和 B 的节点
    //   3) 'A -> B -> C' → A 到 C 之间的最短路径上的所有节点
    applySearchFilter(cy, ui.searchQuery, useGraphStore.getState().nodes);

    // 类型过滤
    applyTypeFilter(cy, ui.typeFilter);
  }, [ui]);

  // 监听 rerun
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (runNonce === 0) return;
    runLayout(cy);
  }, [runNonce]);

  // 监听 reset
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (resetNonce === 0) return;
    clearPositions(sourceKey);
    runLayout(cy, /* randomize */ true);
  }, [resetNonce, sourceKey]);

  function applyStyles(cy: Core) {
    const currentUi = useUiStore.getState();
    const allGroups = new Set<string>();
    cy.nodes().forEach(n => {
      const g = n.data('group');
      allGroups.add(groupKey(g));
    });
    const palette = resolvePalette([...allGroups]);
    cy.style().fromJson(buildStyles(currentUi, palette) as unknown as cytoscape.StylesheetJsonBlock[]);
  }

  function runLayout(cy: Core, randomize = false) {
    setLayoutStatus('running');
    const currentUi = useUiStore.getState();
    const layout = cy.layout({
      name: 'fcose',
      animate: !randomize,
      randomize,
      quality: 'default',
      fit: true,
      padding: 30,
      nodeSeparation: 75,
      idealEdgeLength: (): number => 80,
      nodeRepulsion: (): number => currentUi.repelForce * 4,
      edgeElasticity: (): number => 1 - currentUi.linkForce + 0.1,
      gravity: currentUi.gravity,
      numIter: 2500,
      tile: true,
    } as cytoscape.LayoutOptions);
    layout.on('layoutstop', () => {
      setLayoutStatus('done');
    });
    layout.run();
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--graph-bg)',
        cursor: 'grab',
      }}
    />
  );
}

/* =================== 高亮工具函数 =================== */

function applyHighlight(cy: Core, nodeId: string) {
  cy.batch(() => {
    cy.elements().removeClass('highlighted').removeClass('dim');
    const center = cy.getElementById(nodeId);
    if (center.empty()) return;
    const neighborhood = center.closedNeighborhood();
    cy.elements().not(neighborhood).addClass('dim');
    neighborhood.addClass('highlighted');
  });
}

function clearHighlight(cy: Core) {
  cy.batch(() => {
    cy.elements().removeClass('highlighted').removeClass('dim');
  });
}

function applySearchFilter(
  cy: Core,
  q: string,
  allNodes: Record<string, { id: string; label: string; tags?: string[] }>,
) {
  // 先清掉 dim
  cy.batch(() => {
    cy.nodes().removeClass('dim').removeClass('highlighted');
  });

  if (!q.trim()) return;

  const trimmed = q.trim();

  // 模式 1:'A -> B -> C' 路径查询
  if (trimmed.includes('->')) {
    const parts = trimmed.split(/\s*->\s*/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return;
    const startNode = findNodeByLabel(cy, allNodes, parts[0]);
    const endNode = findNodeByLabel(cy, allNodes, parts[parts.length - 1]);
    if (!startNode || !endNode) {
      // 任一端点找不到:把 cy 中所有节点 dim,只高亮匹配 parts 的节点
      const partial = new Set<string>();
      for (const p of parts) {
        const n = findNodeByLabel(cy, allNodes, p);
        if (n) partial.add(n.id());
      }
      applyDimExcept(cy, partial);
      return;
    }
    const path = bfsShortestPath(cy, startNode.id(), endNode.id());
    if (!path) {
      applyDimExcept(cy, new Set());
      return;
    }
    const pathNodes = new Set(path);
    const pathEdges = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const e = cy.edges().filter(ed => {
        const s = ed.source().id();
        const t = ed.target().id();
        return (s === a && t === b) || (s === b && t === a);
      });
      e.forEach(ed => {
        pathEdges.add(ed.id());
      });
    }
    cy.batch(() => {
      cy.nodes().forEach(n => {
        if (!pathNodes.has(n.id())) n.addClass('dim');
        else n.addClass('highlighted');
      });
      cy.edges().forEach(e => {
        if (pathEdges.has(e.id())) e.addClass('highlighted');
        else e.addClass('dim');
      });
    });
    return;
  }

  // 模式 2:'A and B' 邻居交集
  if (trimmed.toLowerCase().includes(' and ')) {
    const parts = trimmed.split(/\s+and\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return;
    const sets = parts
      .map(p => {
        const n = findNodeByLabel(cy, allNodes, p);
        if (!n) return null;
        return new Set(
          n.neighborhood('node').map((x: { id: () => string }) => x.id()).concat([n.id()]),
        );
      })
      .filter(Boolean) as Set<string>[];
    if (sets.length === 0) {
      applyDimExcept(cy, new Set());
      return;
    }
    const intersection = sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));
    cy.batch(() => {
      cy.nodes().forEach(n => {
        if (!intersection.has(n.id())) n.addClass('dim');
        else n.addClass('highlighted');
      });
    });
    return;
  }

  // 模式 3:普通模糊匹配
  const lower = trimmed.toLowerCase();
  const matched = new Set<string>();
  cy.batch(() => {
    cy.nodes().forEach(n => {
      const label = (n.data('label') as string) || '';
      const tags: string[] = (n.data('tags') as string[]) || [];
      const match =
        label.toLowerCase().includes(lower) || tags.some(t => t.toLowerCase().includes(lower));
      if (!match) n.addClass('dim');
      else {
        matched.add(n.id());
        n.addClass('highlighted');
      }
    });
  });
}

function applyDimExcept(cy: Core, ids: Set<string>) {
  cy.batch(() => {
    cy.nodes().forEach(n => {
      if (!ids.has(n.id())) n.addClass('dim');
      else n.addClass('highlighted');
    });
  });
}

function findNodeByLabel(
  cy: Core,
  allNodes: Record<string, { id: string; label: string }>,
  q: string,
): cytoscape.NodeSingular | null {
  if (!q) return null;
  // 优先按 id 精确匹配
  if (allNodes[q]) {
    const n = cy.getElementById(q);
    if (n.nonempty()) return n;
  }
  // 然后按 label 精确匹配
  let found: cytoscape.NodeSingular | null = null;
  cy.nodes().forEach(n => {
    if (found) return;
    const label = (n.data('label') as string) || '';
    if (label === q) found = n;
  });
  if (found) return found;
  // 最后按 label 包含匹配
  const lower = q.toLowerCase();
  cy.nodes().forEach(n => {
    if (found) return;
    const label = (n.data('label') as string) || '';
    if (label.toLowerCase().includes(lower)) found = n;
  });
  return found;
}

function bfsShortestPath(cy: Core, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const adj = new Map<string, Set<string>>();
  cy.nodes().forEach(n => {
    adj.set(n.id(), new Set());
  });
  cy.edges().forEach(e => {
    const s = e.source().id();
    const t = e.target().id();
    adj.get(s)?.add(t);
    adj.get(t)?.add(s);
  });
  const visited = new Set<string>([fromId]);
  const queue: string[][] = [[fromId]];
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const nb of adj.get(last) || []) {
      if (visited.has(nb)) continue;
      if (nb === toId) return [...path, nb];
      visited.add(nb);
      queue.push([...path, nb]);
    }
  }
  return null;
}

function applyTypeFilter(cy: Core, types: string[]) {
  if (!types || types.length === 0) {
    cy.nodes().removeClass('dim');
    return;
  }
  cy.batch(() => {
    cy.nodes().forEach(n => {
      if (!types.includes(n.data('type'))) n.addClass('dim');
      else n.removeClass('dim');
    });
  });
}
