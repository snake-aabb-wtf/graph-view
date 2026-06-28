import { useUiStore } from '../stores/uiStore';
import { useGraphStore } from '../stores/graphStore';
import { useLayoutStore } from '../stores/layoutStore';
import { adaptText } from '../adapters';

const SAMPLE_FILES = [
  { path: '/samples/ai-pipeline.json', label: 'AI Pipeline', desc: '12 节点 · RAG 系统数据流' },
  { path: '/samples/team-edges.csv', label: '团队协作 (CSV)', desc: '9 节点 · 边表 CSV' },
  { path: '/samples/kg-demo.ttl', label: '知识图谱 (N-Triples)', desc: '5 节点 · RDF 关系' },
  { path: '/samples/company-npm-ls.json', label: 'NPM 依赖', desc: '9 包 · 依赖树' },
];

export function Sidebar() {
  const ui = useUiStore();
  const nodeList = useGraphStore(s => s.nodeList());
  const layoutStatus = useLayoutStore(s => s.status);
  const setLayoutStatus = useLayoutStore(s => s.setStatus);
  const triggerRerun = useLayoutStore(s => s.triggerRerun);
  const loadGraph = useGraphStore(s => s.loadGraph);

  const allTypes = Array.from(new Set(nodeList.map(n => n.type))).sort();

  const toggleType = (t: string) => {
    const cur = ui.typeFilter;
    if (cur.includes(t)) ui.setTypeFilter(cur.filter(x => x !== t));
    else ui.setTypeFilter([...cur, t]);
  };

  const toggleLayout = () => {
    if (layoutStatus === 'running') setLayoutStatus('paused');
    else if (layoutStatus === 'paused') {
      setLayoutStatus('running');
      triggerRerun();
    } else if (layoutStatus === 'done' || layoutStatus === 'idle') {
      triggerRerun();
    }
  };

  const loadSample = async (path: string) => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const result = adaptText(text, path);
      loadGraph(result.data, result.sourceName);
      setTimeout(() => triggerRerun(), 50);
    } catch (err) {
      alert(`加载样例失败: ${(err as Error).message}`);
    }
  };

  return (
    <aside className="app__sidebar">
      {/* 文件样例 */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">样例数据(从 public/samples)</h3>
        <div className="sidebar__samples">
          {SAMPLE_FILES.map(s => (
            <button
              key={s.path}
              className="sidebar__sample"
              onClick={() => loadSample(s.path)}
            >
              <strong>{s.label}</strong>
              <span>{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
      {/* 显示设置 */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">节点显示</h3>

        <div className="sidebar__row">
          <label>大小权重(度数)</label>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={ui.nodeSizeWeight}
            onChange={e => ui.setNodeSizeWeight(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.nodeSizeWeight.toFixed(1)}</span>
        </div>

        <div className="sidebar__row">
          <label>颜色分组</label>
          <div className="sidebar__select" style={{ flex: 1.2, marginLeft: 8 }}>
            <select
              value={ui.colorGroupBy}
              onChange={e => ui.setColorGroupBy(e.target.value as 'group' | 'type' | 'tag')}
            >
              <option value="group">按 group(自定义)</option>
              <option value="type">按 type</option>
              <option value="tag">按 tag</option>
            </select>
          </div>
        </div>

        <div className="sidebar__row">
          <label>标签显示</label>
          <div className="sidebar__radio-group">
            {(['always', 'hover', 'never'] as const).map(m => (
              <button
                key={m}
                className={ui.labelMode === m ? 'active' : ''}
                onClick={() => ui.setLabelMode(m)}
              >
                {m === 'always' ? '始终' : m === 'hover' ? '悬停' : '不显示'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 边设置 */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">边显示</h3>

        <div className="sidebar__row">
          <label>边粗细</label>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={ui.linkThickness}
            onChange={e => ui.setLinkThickness(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.linkThickness.toFixed(1)}</span>
        </div>

        <div className="sidebar__row">
          <label>显示箭头</label>
          <input
            type="checkbox"
            checked={ui.showArrows}
            onChange={e => ui.setShowArrows(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* 力参数 */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">力参数(改完点"重跑")</h3>

        <div className="sidebar__row">
          <label>斥力(repel)</label>
          <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={ui.repelForce}
            onChange={e => ui.setRepelForce(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.repelForce}</span>
        </div>

        <div className="sidebar__row">
          <label>连接(link)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ui.linkForce}
            onChange={e => ui.setLinkForce(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.linkForce.toFixed(2)}</span>
        </div>

        <div className="sidebar__row">
          <label>中心(center)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ui.centerForce}
            onChange={e => ui.setCenterForce(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.centerForce.toFixed(2)}</span>
        </div>

        <div className="sidebar__row">
          <label>重力(gravity)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ui.gravity}
            onChange={e => ui.setGravity(Number(e.target.value))}
          />
          <span className="sidebar__value">{ui.gravity.toFixed(2)}</span>
        </div>
      </div>

      {/* 布局控制 */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">布局</h3>
        <div className="sidebar__row" style={{ gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={toggleLayout}>
            {layoutStatus === 'running' ? '暂停' : '运行'}
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={triggerRerun}>
            重跑
          </button>
        </div>
      </div>

      {/* 类型过滤 */}
      {allTypes.length > 0 && (
        <div className="sidebar__section">
          <h3 className="sidebar__title">类型过滤(留空 = 全部)</h3>
          <div className="sidebar__chip-group">
            {allTypes.map(t => (
              <span
                key={t}
                className={`sidebar__chip ${ui.typeFilter.includes(t) ? 'active' : ''}`}
                onClick={() => toggleType(t)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
