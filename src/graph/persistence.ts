/**
 * 位置/视图持久化:把节点 x/y 存到 localStorage,下次打开恢复。
 * key: graph_view_positions
 * value: { [sourceKey]: { [nodeId]: {x, y} } }
 */
import type { Core, ElementDefinition } from 'cytoscape';

const KEY = 'graph_view_v2_positions_v1';

type PositionMap = Record<string, { x: number; y: number }>;
type StorageShape = Record<string, PositionMap>;

function readAll(): StorageShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StorageShape;
  } catch {
    return {};
  }
}

function writeAll(data: StorageShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // 容量超限,降级
    console.warn('[graph-view] localStorage 写入失败:', e);
  }
}

/** 从 cy 当前状态把 position 存到 localStorage 的 sourceKey 槽位 */
export function savePositions(cy: Core, sourceKey: string) {
  const all = readAll();
  const pos: PositionMap = {};
  cy.nodes().forEach(n => {
    pos[n.id()] = { x: n.position('x'), y: n.position('y') };
  });
  all[sourceKey] = pos;
  writeAll(all);
}

/** 从 localStorage 读出 position,返回可注入 cy.json() 的 elements patch */
export function loadPositions(cy: Core, sourceKey: string): ElementDefinition[] | null {
  const all = readAll();
  const pos = all[sourceKey];
  if (!pos) return null;
  const patch: ElementDefinition[] = [];
  cy.batch(() => {
    cy.nodes().forEach(n => {
      const p = pos[n.id()];
      if (p) n.position(p);
    });
  });
  return patch;
}

/** 清掉指定 sourceKey 的 position 缓存 */
export function clearPositions(sourceKey: string) {
  const all = readAll();
  delete all[sourceKey];
  writeAll(all);
}
