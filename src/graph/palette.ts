/**
 * 节点分组 → 颜色
 * 设计目标:任意 group(未知 group 也能分配一个稳定颜色)都能映射到调色板内的一个颜色。
 */
const PALETTE_SIZE = 10;

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

export function colorForGroup(group: string | undefined | null): string {
  if (!group) return 'var(--c-default)';
  // 把 CSS 变量名转成具体色:从 root 读 computed style
  const idx = (hashString(group) % PALETTE_SIZE) + 1;
  return `var(--c-${idx})`;
}

/** 把 group 字符串转成"组 id",用于 cy selector 着色。 */
export function groupKey(group: string | undefined | null): string {
  if (!group) return '__default__';
  return group;
}
