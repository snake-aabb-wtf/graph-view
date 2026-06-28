// cytoscape-fcose 没有官方 .d.ts,这里手动声明
declare module 'cytoscape-fcose' {
  import type { Ext } from 'cytoscape';
  const ext: Ext;
  export default ext;
}
