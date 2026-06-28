import type { NodeSingular } from 'cytoscape';
import type { UiState } from '../stores/uiStore';

/**
 * 生成 Cytoscape 样式表(JSON 形态,可直接 style().fromJson() 注入)。
 * - 颜色由 group 决定(读 CSS 变量已解析为真实色值,由调用方传入 palette)
 * - 节点大小 = base + sizeWeight * log1p(degree)
 * - 标签显隐由 labelMode 决定
 * - 边粗细、箭头由 linkThickness / showArrows 决定
 *
 * 主题切换:本函数重新调用一次即可,palette 是新的实色值。
 */
export interface BuiltStyle {
  selector: string;
  style: Record<string, unknown>;
}

export function buildStyles(ui: UiState, palette: Map<string, string>): BuiltStyle[] {
  const labelMap: Record<UiState['labelMode'], string> = {
    always: 'data(label)',
    hover: 'data(label)',
    never: '',
  };

  return [
    {
      selector: 'node',
      style: {
        'background-color': (ele: NodeSingular) =>
          palette.get(ele.data('groupKey') as string) || palette.get('__default__') || '#525252',
        'width': (ele: NodeSingular) => {
          const deg = ele.degree(true);
          return 10 + ui.nodeSizeWeight * Math.log1p(deg);
        },
        'height': (ele: NodeSingular) => {
          const deg = ele.degree(true);
          return 10 + ui.nodeSizeWeight * Math.log1p(deg);
        },
        'label': labelMap[ui.labelMode],
        'font-size': 10,
        'color': '#1f2937',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'text-outline-color': '#ffffff',
        'text-outline-width': 2,
        'border-width': 0,
        'opacity': 0.92,
        'transition-property': 'background-color, opacity, width, height',
        'transition-duration': 120,
      },
    },
    {
      selector: 'node.show-label',
      style: {
        'label': 'data(label)',
      },
    },
    {
      selector: 'node.dim',
      style: {
        'opacity': 0.12,
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'opacity': 1,
        'border-width': 2,
        'border-color': '#f59e0b',
        'z-index': 9999,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': ui.linkThickness,
        'line-color': '#cbd5e1',
        'curve-style': 'bezier',
        'opacity': 0.55,
        'target-arrow-shape': ui.showArrows ? 'triangle' : 'none',
        'target-arrow-color': '#94a3b8',
        'arrow-scale': 0.8,
        'transition-property': 'line-color, opacity, width',
        'transition-duration': 120,
      },
    },
    {
      selector: 'edge.dim',
      style: {
        'opacity': 0.06,
      },
    },
    {
      selector: 'edge.highlighted',
      style: {
        'line-color': '#f59e0b',
        'opacity': 1,
        'z-index': 9999,
        'width': Math.max(ui.linkThickness, 1.5),
      },
    },
  ];
}
