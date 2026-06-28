/**
 * 简易 debounce:延后 fn 的执行,期间再次触发则重置计时。
 * 暴露 flush() 用于立即执行尚未触发的调用。
 */
export interface DebouncedFn<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  flush: () => void;
  cancel: () => void;
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (pendingArgs) fn(...pendingArgs);
      pendingArgs = null;
    }, wait);
  }) as DebouncedFn<T>;

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingArgs) {
      fn(...pendingArgs);
      pendingArgs = null;
    }
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  return debounced;
}
