/**
 * LLM 抽取用的样例文本。
 * 覆盖几种典型场景:日记、会议、虚构叙事、技术文章。
 */

export interface SampleText {
  name: string;
  text: string;
}

export const SAMPLE_TEXTS: SampleText[] = [
  {
    name: '日记',
    text: `今天早上在星巴克和老李碰面,聊了聊他的新项目,一个基于 RAG 的企业知识库。
他提到了 DeepSeek 和 Moonshot 两个模型,说国内这两家性价比最高,API 还支持 CORS,浏览器直连就能用。
我们约了下周二去他公司看看 demo,他同事 Alice 会一起参加。
Alice 之前在阿里做搜索,现在负责后端架构。下午我回公司开了个站会,产品经理 Carol
问我 Graph View 这个项目什么时候能上线,我告诉她核心功能已经好了,下周可以给内测版。`,
  },
  {
    name: '会议',
    text: `会议主题:Q3 路线图对齐
时间:2026-06-27
参与人:Bob(PM)、Carol(设计)、Dave(后端)、Eve(前端)、Frank(测试)

Bob:讲解了 Q3 三个核心目标:Graph View v2、AI 助手、协作编辑。
Carol:UX 设计稿 v3 已出,本周五前评审。
Dave:后端 GraphQL schema 已落地,v2 估时 2 周。
Eve:前端 v2 需要重构状态管理,估时 1.5 周。
Frank:测试自动化覆盖率目标 80%,优先覆盖核心适配器。
决议:Q3 末上线 v2 公测版,Frank 牵头写测试用例,Eve 配合。`,
  },
  {
    name: '小说',
    text: `在雾蒙蒙的伦敦街头,夏洛克·福尔摩斯与华生正走向贝克街 221B。
福尔摩斯正在调查一起离奇的谋杀案,死者是伦敦银行家罗伯特·海特。
线索指向一个神秘组织——莫里亚蒂教授领导的犯罪网络。
华生怀疑玛丽·华生(他的妻子)可能与此案有关,但他没有告诉福尔摩斯。
雷斯垂德探长也在调查此案,他认为凶手可能是海特的前秘书艾米丽。
福尔摩斯最终在泰晤士河边的一座废弃仓库里找到了关键证据,那是一封莫里亚蒂写给海特的勒索信。`,
  },
  {
    name: '技术',
    text: `React 是一个由 Meta 开发的 JavaScript 库,用于构建用户界面。
它的核心概念是组件,每个组件管理自己的状态。
React 使用虚拟 DOM 来优化渲染性能。
状态管理库 Zustand 是基于 React Hooks 实现的,API 简洁,支持持久化。
TypeScript 是 JavaScript 的超集,添加了静态类型系统,微软开发。
Vite 是新一代前端构建工具,使用原生 ESM,启动速度比 Webpack 快得多。
D3.js 用于数据可视化,cytoscape.js 用于图谱可视化,两者都基于 Canvas/SVG 渲染。`,
  },
];
