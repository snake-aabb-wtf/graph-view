import { useGraphStore } from '../stores/graphStore';
import { useLayoutStore } from '../stores/layoutStore';

export function StatusBar() {
  const nodes = useGraphStore(s => s.nodeList());
  const edges = useGraphStore(s => s.edgeList());
  const sourceName = useGraphStore(s => s.sourceName);
  const layoutStatus = useLayoutStore(s => s.status);
  const selectedId = useGraphStore(s => s.selectedId);
  const hoveredId = useGraphStore(s => s.hoveredId);

  const statusText: Record<typeof layoutStatus, string> = {
    idle: '空闲',
    running: '布局中...',
    paused: '已暂停',
    done: '稳定',
  };

  const dotClass = `status__dot ${
    layoutStatus === 'running'
      ? 'status__dot--running'
      : layoutStatus === 'done'
      ? 'status__dot--done'
      : ''
  }`;

  return (
    <div className="app__bottom">
      <span className="status">
        <span className={dotClass} />
        布局: {statusText[layoutStatus]}
      </span>
      <span className="status">数据源: {sourceName}</span>
      <span className="status">
        节点 <strong style={{ color: 'var(--fg)' }}>{nodes.length}</strong>
        <span style={{ color: 'var(--fg-subtle)' }}> · </span>
        边 <strong style={{ color: 'var(--fg)' }}>{edges.length}</strong>
      </span>
      {hoveredId && (
        <span className="status">悬停: <code style={{ color: 'var(--fg)' }}>{hoveredId}</code></span>
      )}
      {selectedId && (
        <span className="status">选中: <code style={{ color: 'var(--accent)' }}>{selectedId}</code></span>
      )}
      <div className="spacer" />
      <span className="status" style={{ color: 'var(--fg-subtle)' }}>
        滚轮缩放 · 拖拽平移 · 拖节点重定位 · 单击高亮
      </span>
    </div>
  );
}
