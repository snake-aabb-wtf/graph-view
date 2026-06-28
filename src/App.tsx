import { useEffect } from 'react';
import { useUiStore } from './stores/uiStore';
import { useGraphStore } from './stores/graphStore';
import { useLayoutStore } from './stores/layoutStore';
import { GraphCanvas } from './components/GraphCanvas';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { adaptFile, adaptMarkdownFiles, type AdapterResult } from './adapters';

export default function App() {
  const theme = useUiStore(s => s.theme);
  const sidebarOpen = useUiStore(s => s.sidebarOpen);
  const sourceName = useGraphStore(s => s.sourceName);
  const loadGraph = useGraphStore(s => s.loadGraph);
  const triggerRerun = useLayoutStore(s => s.triggerRerun);

  // theme → html data-theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 全局拖拽文件:支持把文件拖到画布直接导入
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };
    const onDrop = async (e: DragEvent) => {
      const files = Array.from(e.dataTransfer?.files || []);
      if (!files.length) return;
      e.preventDefault();
      try {
        const allMd = files.every(f => /\.(md|markdown|mdx)$/i.test(f.name));
        if (allMd && files.length > 1) {
          const r = await adaptMarkdownFiles(files);
          loadGraph(r.data, r.sourceName);
        } else {
          const results = await Promise.all(files.map(f => adaptFile(f)));
          const merged = mergeResults(results);
          loadGraph(merged.data, merged.sourceName);
        }
        setTimeout(() => triggerRerun(), 50);
      } catch (err) {
        alert(`拖拽导入失败: ${(err as Error).message}`);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadGraph, triggerRerun]);

  return (
    <div className="app">
      <TopBar />
      <div className="app__main">
        <div className="app__graph">
          <GraphCanvas sourceKey={sourceName} />
        </div>
        <div className={sidebarOpen ? 'app__sidebar' : 'app__sidebar app__sidebar--closed'}>
          <Sidebar />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

function mergeResults(results: AdapterResult[]): AdapterResult {
  const nodeMap = new Map<string, AdapterResult['data']['nodes'][number]>();
  const edges: AdapterResult['data']['edges'] = [];
  const seenEdge = new Set<string>();
  for (const r of results) {
    for (const n of r.data.nodes) {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    }
    for (const e of r.data.edges) {
      const k = `${e.source}::${e.target}::${e.type || ''}`;
      if (!seenEdge.has(k)) {
        seenEdge.add(k);
        edges.push(e);
      }
    }
  }
  return {
    sourceName: results.length === 1 ? results[0].sourceName : `合并 ${results.length} 个文件`,
    data: { nodes: [...nodeMap.values()], edges },
  };
}
