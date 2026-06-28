import type { GraphData } from '../adapters/types';

/**
 * 样例 2:模拟 Obsidian 风格的一组互相引用的 Markdown 笔记。
 * 节点都是 note,通过 wiki link 互相引用。
 */
export const notesDemo: GraphData = {
  nodes: [
    { id: 'index', type: 'note', label: 'Index', group: 'MOC', tags: ['moc'] },
    { id: 'projects', type: 'note', label: 'Projects', group: 'MOC', tags: ['moc'] },

    { id: 'graph-view', type: 'note', label: 'Graph View', group: '项目', tags: ['project', 'tool'] },
    { id: 'rss-reader', type: 'note', label: 'RSS Reader', group: '项目', tags: ['project', 'tool'] },
    { id: 'note-taker', type: 'note', label: 'Note Taker', group: '项目', tags: ['project', 'tool'] },

    { id: 'react', type: 'note', label: 'React', group: '技术', tags: ['tech', 'frontend'] },
    { id: 'typescript', type: 'note', label: 'TypeScript', group: '技术', tags: ['tech', 'language'] },
    { id: 'rust', type: 'note', label: 'Rust', group: '技术', tags: ['tech', 'language'] },
    { id: 'tauri', type: 'note', label: 'Tauri', group: '技术', tags: ['tech', 'frontend', 'desktop'] },
    { id: 'sqlite', type: 'note', label: 'SQLite', group: '技术', tags: ['tech', 'db'] },

    { id: 'ai-context', type: 'note', label: 'AI Context', group: '概念', tags: ['concept', 'ai'] },
    { id: 'kg', type: 'note', label: 'Knowledge Graph', group: '概念', tags: ['concept'] },
    { id: 'force-layout', type: 'note', label: 'Force-Directed Layout', group: '概念', tags: ['concept', 'algo'] },

    { id: 'daily-2026-06-25', type: 'note', label: '2026-06-25', group: '日记', tags: ['daily'] },
    { id: 'daily-2026-06-26', type: 'note', label: '2026-06-26', group: '日记', tags: ['daily'] },
    { id: 'daily-2026-06-27', type: 'note', label: '2026-06-27', group: '日记', tags: ['daily'] },
  ],
  edges: [
    { id: 'n1', source: 'index', target: 'graph-view', type: 'link' },
    { id: 'n2', source: 'index', target: 'rss-reader', type: 'link' },
    { id: 'n3', source: 'index', target: 'note-taker', type: 'link' },
    { id: 'n4', source: 'index', target: 'ai-context', type: 'link' },
    { id: 'n5', source: 'index', target: 'kg', type: 'link' },

    { id: 'n10', source: 'projects', target: 'graph-view', type: 'link' },
    { id: 'n11', source: 'projects', target: 'rss-reader', type: 'link' },
    { id: 'n12', source: 'projects', target: 'note-taker', type: 'link' },

    { id: 'n20', source: 'graph-view', target: 'react', type: 'link' },
    { id: 'n21', source: 'graph-view', target: 'typescript', type: 'link' },
    { id: 'n22', source: 'graph-view', target: 'tauri', type: 'link' },
    { id: 'n23', source: 'graph-view', target: 'kg', type: 'link' },
    { id: 'n24', source: 'graph-view', target: 'ai-context', type: 'link' },
    { id: 'n25', source: 'graph-view', target: 'force-layout', type: 'link' },

    { id: 'n30', source: 'rss-reader', target: 'rust', type: 'link' },
    { id: 'n31', source: 'rss-reader', target: 'tauri', type: 'link' },
    { id: 'n32', source: 'rss-reader', target: 'sqlite', type: 'link' },

    { id: 'n40', source: 'note-taker', target: 'react', type: 'link' },
    { id: 'n41', source: 'note-taker', target: 'typescript', type: 'link' },
    { id: 'n42', source: 'note-taker', target: 'sqlite', type: 'link' },

    { id: 'n50', source: 'ai-context', target: 'kg', type: 'link' },
    { id: 'n51', source: 'kg', target: 'force-layout', type: 'link' },
    { id: 'n52', source: 'tauri', target: 'rust', type: 'link' },

    // 日记里出现的引用
    { id: 'n60', source: 'daily-2026-06-25', target: 'graph-view', type: 'link' },
    { id: 'n61', source: 'daily-2026-06-25', target: 'ai-context', type: 'link' },
    { id: 'n62', source: 'daily-2026-06-26', target: 'tauri', type: 'link' },
    { id: 'n63', source: 'daily-2026-06-26', target: 'rss-reader', type: 'link' },
    { id: 'n64', source: 'daily-2026-06-27', target: 'graph-view', type: 'link' },
    { id: 'n65', source: 'daily-2026-06-27', target: 'force-layout', type: 'link' },
  ],
};
