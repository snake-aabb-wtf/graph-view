import { useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useGraphStore } from '../stores/graphStore';
import { useLayoutStore } from '../stores/layoutStore';
import { conversationDemo } from '../samples/conversationDemo';
import { notesDemo } from '../samples/notesDemo';
import { adaptFile, adaptMarkdownFiles } from '../adapters';
import { TextToGraphDialog } from './TextToGraphDialog';

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchQuery = useUiStore(s => s.searchQuery);
  const setSearchQuery = useUiStore(s => s.setSearchQuery);
  const theme = useUiStore(s => s.theme);
  const setTheme = useUiStore(s => s.setTheme);
  const toggleSidebar = useUiStore(s => s.toggleSidebar);
  const sidebarOpen = useUiStore(s => s.sidebarOpen);
  const loadGraph = useGraphStore(s => s.loadGraph);
  const triggerRerun = useLayoutStore(s => s.triggerRerun);
  const triggerReset = useLayoutStore(s => s.triggerReset);

  const [toast, setToast] = useState<string | null>(null);
  const [llmDialogOpen, setLlmDialogOpen] = useState(false);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadConversationDemo = () => {
    loadGraph(conversationDemo, 'AI 对话样例');
    setTimeout(() => triggerRerun(), 50);
  };

  const loadNotesDemo = () => {
    loadGraph(notesDemo, 'Markdown 笔记样例');
    setTimeout(() => triggerRerun(), 50);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await importFiles(Array.from(files));
    e.target.value = '';
  };

  const importFiles = async (files: File[]) => {
    // 如果全是 .md 走批量,否则逐个适配再合并
    const allMd = files.every(f => /\.(md|markdown|mdx)$/i.test(f.name));
    try {
      if (allMd && files.length > 1) {
        const result = await adaptMarkdownFiles(files);
        loadGraph(result.data, result.sourceName);
      } else {
        // 多格式:按文件适配,把结果合并
        const results = await Promise.all(files.map(f => adaptFile(f)));
        const merged = mergeResults(results);
        loadGraph(merged.data, merged.sourceName);
      }
      setTimeout(() => triggerRerun(), 50);
      showToast(`✓ 已导入 ${files.length} 个文件`);
    } catch (err) {
      showToast(`✗ 导入失败: ${(err as Error).message}`);
    }
  };

  return (
    <div className="app__top">
      <div className="brand">
        <BrandMark />
        <span>Graph View 2</span>
      </div>

      <div className="divider" />

      <div className="search">
        <SearchIcon />
        <input
          type="text"
          placeholder="搜索节点(label / tag) — 高级:A -> B 查路径"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => setSearchQuery('')}
            title="清空搜索"
          >
            ×
          </button>
        )}
      </div>

      <div className="spacer" />

      <button className="btn" onClick={() => fileInputRef.current?.click()} title="导入文件">
        <UploadIcon />
        导入
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md,.markdown,.mdx,.csv,.tsv,.nt,.ttl,.turtle,.code-manifest,.deps"
        multiple
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <button className="btn" onClick={loadConversationDemo} title="加载 AI 对话样例">
        样例 1
      </button>
      <button className="btn" onClick={loadNotesDemo} title="加载 Markdown 笔记样例">
        样例 2
      </button>

      <button
        className="btn btn--primary"
        onClick={() => setLlmDialogOpen(true)}
        title="把一段文字通过 LLM 转换成关系图谱"
      >
        <SparklesIcon /> AI 生成
      </button>

      <div className="divider" />

      <button className="btn btn--icon" onClick={triggerRerun} title="重新跑布局" aria-label="rerun">
        <RefreshIcon />
      </button>
      <button className="btn btn--icon" onClick={triggerReset} title="重置所有节点位置" aria-label="reset">
        <ResetIcon />
      </button>

      <button
        className="btn btn--icon"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'light' ? '切换深色' : '切换浅色'}
        aria-label="theme"
      >
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>

      <button className="btn btn--icon" onClick={toggleSidebar} title="设置面板" aria-label="sidebar">
        <SidebarIcon collapsed={!sidebarOpen} />
      </button>

      {toast && <div className="toast">{toast}</div>}

      <TextToGraphDialog open={llmDialogOpen} onClose={() => setLlmDialogOpen(false)} />
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-5.8L4 10l5.8-1.9L12 3z" />
    </svg>
  );
}

function mergeResults(results: { sourceName: string; data: { nodes: any[]; edges: any[] } }[]): {
  sourceName: string;
  data: { nodes: any[]; edges: any[] };
} {
  const nodeMap = new Map<string, any>();
  const edges: any[] = [];
  const edgeKeys = new Set<string>();
  for (const r of results) {
    for (const n of r.data.nodes) {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    }
    for (const e of r.data.edges) {
      const k = `${e.source}::${e.target}::${e.type || ''}`;
      if (!edgeKeys.has(k)) {
        edgeKeys.add(k);
        edges.push(e);
      }
    }
  }
  return {
    sourceName: results.length === 1 ? results[0].sourceName : `合并 ${results.length} 个文件`,
    data: { nodes: [...nodeMap.values()], edges },
  };
}

/* ===== Icons ===== */
function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
      <line x1="16.5" y1="7.5" x2="13.5" y2="10.5" />
      <line x1="7.5" y1="16.5" x2="10.5" y2="13.5" />
      <line x1="16.5" y1="16.5" x2="13.5" y2="13.5" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15" y2="14" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function SidebarIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {collapsed ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
          <polyline points="10 9 7 12 10 15" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <polyline points="14 9 17 12 14 15" />
        </>
      )}
    </svg>
  );
}
