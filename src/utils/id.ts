/**
 * 简易 hash:把任意字符串变成稳定 id,用于 adapter 内部生成节点 id。
 * 不是密码学 hash,只是用于消重。
 */
export function stableId(...parts: (string | number | undefined | null)[]): string {
  const s = parts.filter(p => p !== undefined && p !== null).join('::');
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  // 转成无符号 32 位再 hex
  return 'n_' + (h >>> 0).toString(36);
}
