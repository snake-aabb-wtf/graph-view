# Graph View · AI 上下文图谱

> 一个类似 [Obsidian Graph View](https://obsidian.md/help/plugins/graph) 的 Web 应用,用于把 AI 的上下文(对话、笔记、JSON/CSV/三元组、代码依赖)**一股脑塞进关系图谱**里进行可视化、过滤、探索。

![Architecture](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![TS](https://img.shields.io/badge/TypeScript-5-blue) ![Cytoscape](https://img.shields.io/badge/Cytoscape.js-3.30-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## ✨ 核心特性

- 🧠 **多数据源适配器**:支持 JSON / Markdown / CSV / N-Triples (RDF) / 代码依赖 manifest / `npm ls` 输出
- 🔍 **高阶查询**:基础文本搜索 + `A -> B -> C` 路径查询 + `A and B` 邻居交集
- 🎨 **双主题**:浅色 / 深色一键切换,所有节点颜色自动跟随
- ⚙️ **细粒度控制**:节点大小(度数加权)、颜色分组(group/type/tag)、边粗细、箭头、标签显示模式、4 个力参数实时调节
- 🖱️ **完整交互**:滚轮缩放 / 空白拖拽平移 / 节点拖拽重定位 / 悬停高亮 / 点击聚焦 / 拖拽文件到画布直接导入
- 💾 **持久化**:节点位置 + UI 设置都自动保存到 localStorage,刷新页面不丢失
- 🧰 **类型过滤**:按节点 type 多选过滤

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器(默认 http://localhost:5173)
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 📁 项目结构

```
Graph View/
├── public/
│   └── samples/                  # 内置样例数据
│       ├── ai-pipeline.json      # AI Pipeline 数据流
│       ├── team-edges.csv        # 团队协作边表
│       ├── kg-demo.ttl           # 知识图谱 RDF 三元组
│       └── company-npm-ls.json   # NPM 依赖树
├── src/
│   ├── adapters/                 # 多数据源适配器
│   │   ├── index.ts              # 入口:按扩展名/嗅探分派
│   │   ├── jsonAdapter.ts        # JSON {nodes, edges}
│   │   ├── markdownAdapter.ts    # .md 扫描 + [[wiki link]]
│   │   ├── csvAdapter.ts         # 边表 / 节点表 CSV
│   │   ├── triplesAdapter.ts     # N-Triples / Turtle
│   │   └── codeDepAdapter.ts     # 代码依赖 manifest + npm ls
│   ├── components/
│   │   ├── GraphCanvas.tsx       # Cytoscape 实例 + 布局 + 交互
│   │   ├── TopBar.tsx            # 顶部工具栏
│   │   ├── Sidebar.tsx           # 设置面板
│   │   └── StatusBar.tsx         # 状态栏
│   ├── graph/
│   │   ├── palette.ts            # group → 颜色映射
│   │   ├── styles.ts             # Cytoscape 样式生成
│   │   └── persistence.ts        # localStorage 位置缓存
│   ├── samples/
│   │   ├── conversationDemo.ts   # AI 对话样例
│   │   └── notesDemo.ts          # Markdown 笔记样例
│   ├── stores/
│   │   ├── graphStore.ts         # 节点/边数据
│   │   ├── uiStore.ts            # 主题/过滤/显示
│   │   └── layoutStore.ts        # 布局状态
│   ├── utils/                    # hash / debounce
│   ├── App.tsx                   # 全局布局 + 拖拽导入
│   └── main.tsx
└── package.json
```

## 📥 数据源详细说明

### 1. JSON(通用)

支持两种形态:

**形态 A — 标准 `GraphData`:**
```json
{
  "nodes": [
    { "id": "n1", "type": "concept", "label": "概念 1", "group": "技术", "tags": ["tech"] },
    { "id": "n2", "type": "concept", "label": "概念 2", "group": "技术" }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "type": "related_to" }
  ]
}
```

**形态 B — 简单对象 map(自动变成节点,无边):**
```json
{
  "React": { "type": "framework", "group": "前端" },
  "Vue":   { "type": "framework", "group": "前端" }
}
```

### 2. Markdown(批量)

每个文件 = 一个 note 节点。`[[Wiki Link]]` 自动生成边,frontmatter 顶部的 `tags:` 解析为节点标签。

```markdown
---
tags: [project, tool]
---

# Graph View

这是我的项目笔记,相关概念:[[React]]、[[TypeScript]]、
参见 [[Force-Directed Layout]]。
```

### 3. CSV

**边表(自动补 dangling 节点):**
```csv
source,target,type
Alice,Bob,knows
Bob,Carol,knows
```

**节点表:**
```csv
id,label,type,group,tags
Alice,Alice,person,team,a;b
Bob,Bob,person,team,a
```

### 4. N-Triples / Turtle

```turtle
<http://example.org/Alice> <http://xmlns.com/foaf/0.1/name> "Alice" .
<http://example.org/Alice> <http://xmlns.com/foaf/0.1/knows> <http://example.org/Bob> .
```

字面量作为属性附加到 subject 节点,URI 作为边端点。

### 5. 代码依赖

**Manifest 形态:**
```json
{
  "nodes": [
    { "id": "LoginService", "type": "class", "label": "LoginService", "group": "auth" }
  ],
  "edges": [
    { "source": "LoginService", "target": "UserRepo", "type": "depends-on" }
  ]
}
```

**`npm ls --json` 输出直接支持**(自动识别并生成包依赖图)。

## 🔍 高阶查询语法

在顶部搜索框中:

| 语法 | 作用 |
|------|------|
| `react` | 模糊匹配 label 或 tag |
| `Alice -> Bob` | Alice 到 Bob 的最短路径 |
| `A -> B -> C` | A 到 C 的最短路径(中间必须经过 B) |
| `Alice and Bob` | 同时连接到 Alice 和 Bob 的节点 |

## ⌨️ 交互速查

| 操作 | 行为 |
|------|------|
| 滚轮 | 缩放(0.1x ~ 4x) |
| 拖拽空白 | 平移视图 |
| 拖拽节点 | 重新定位(自动持久化) |
| 悬停节点 | 高亮 1 跳邻居 |
| 单击节点 | 锁定高亮 |
| 单击空白 | 取消锁定 |
| 拖拽文件到画布 | 导入数据(多文件自动合并) |

## 🗺️ 后续路线

- [ ] 本地文件夹扫描(需迁移到 Electron / Tauri)
- [ ] 大图聚类与分级加载(节点 > 5000 时自动启用)
- [ ] 节点详情面板(显示 properties,支持编辑)
- [ ] 路径分析增强:Dijkstra 最短加权路径
- [ ] 导出:PNG / SVG / 节点-边列表
- [ ] 复合图(父节点包含子节点折叠)

## 🪟 桌面化

Web 版跑通后,可平滑迁移到:
- **Tauri**(包体积小,后端 Rust)
- **Electron**(生态最熟)

`src/` 全部可复用,只需新增一个 `desktop/` 子项目。

## 📜 License

MIT
