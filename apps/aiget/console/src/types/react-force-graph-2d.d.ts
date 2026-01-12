/**
 * react-force-graph-2d 类型声明
 *
 * 该包没有官方类型声明，这里提供基本的类型定义。
 */

declare module 'react-force-graph-2d' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface NodeObject {
    id?: string | number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number;
    fy?: number;
    [key: string]: unknown;
  }

  export interface LinkObject {
    source?: string | number | NodeObject;
    target?: string | number | NodeObject;
    [key: string]: unknown;
  }

  export interface GraphData<N extends NodeObject = NodeObject, L extends LinkObject = LinkObject> {
    nodes: N[];
    links: L[];
  }

  export interface ForceGraphMethods<
    N extends NodeObject = NodeObject,
    L extends LinkObject = LinkObject,
  > {
    // 缩放和平移
    centerAt(x?: number, y?: number, ms?: number): void;
    zoom(k?: number, ms?: number): void;
    zoomToFit(ms?: number, padding?: number, nodeFilter?: (node: N) => boolean): void;

    // 力模拟控制
    d3Force(forceName: string, force?: unknown): unknown;
    d3ReheatSimulation(): void;
    pauseAnimation(): void;
    resumeAnimation(): void;

    // 坐标转换
    screen2GraphCoords(x: number, y: number): { x: number; y: number };
    graph2ScreenCoords(x: number, y: number): { x: number; y: number };

    // 获取数据
    graphData(): GraphData<N, L>;
    refresh(): void;
  }

  export interface ForceGraph2DProps<
    N extends NodeObject = NodeObject,
    L extends LinkObject = LinkObject,
  > {
    // 数据
    graphData?: GraphData<N, L>;

    // 容器尺寸
    width?: number;
    height?: number;
    backgroundColor?: string;

    // 节点样式
    nodeRelSize?: number;
    nodeId?: string;
    nodeLabel?: string | ((node: N) => string);
    nodeVal?: number | string | ((node: N) => number);
    nodeVisibility?: boolean | string | ((node: N) => boolean);
    nodeColor?: string | ((node: N) => string);
    nodeAutoColorBy?: string | ((node: N) => string | null);
    nodeCanvasObject?: (node: N, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    nodeCanvasObjectMode?: string | ((node: N) => string);
    nodePointerAreaPaint?: (node: N, color: string, ctx: CanvasRenderingContext2D) => void;

    // 链接样式
    linkSource?: string;
    linkTarget?: string;
    linkLabel?: string | ((link: L) => string);
    linkVisibility?: boolean | string | ((link: L) => boolean);
    linkColor?: string | ((link: L) => string);
    linkAutoColorBy?: string | ((link: L) => string | null);
    linkLineDash?: number[] | string | ((link: L) => number[] | null);
    linkWidth?: number | string | ((link: L) => number);
    linkCurvature?: number | string | ((link: L) => number);
    linkCanvasObject?: (link: L, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    linkCanvasObjectMode?: string | ((link: L) => string);
    linkDirectionalArrowLength?: number | string | ((link: L) => number);
    linkDirectionalArrowColor?: string | ((link: L) => string);
    linkDirectionalArrowRelPos?: number | string | ((link: L) => number);
    linkDirectionalParticles?: number | string | ((link: L) => number);
    linkDirectionalParticleSpeed?: number | string | ((link: L) => number);
    linkDirectionalParticleWidth?: number | string | ((link: L) => number);
    linkDirectionalParticleColor?: string | ((link: L) => string);
    linkPointerAreaPaint?: (link: L, color: string, ctx: CanvasRenderingContext2D) => void;

    // 力模拟
    d3AlphaMin?: number;
    d3AlphaDecay?: number;
    d3VelocityDecay?: number;
    warmupTicks?: number;
    cooldownTicks?: number;
    cooldownTime?: number;
    onEngineTick?: () => void;
    onEngineStop?: () => void;

    // 交互
    onNodeClick?: (node: N, event: MouseEvent) => void;
    onNodeRightClick?: (node: N, event: MouseEvent) => void;
    onNodeHover?: (node: N | null, previousNode: N | null) => void;
    onNodeDrag?: (node: N, translate: { x: number; y: number }) => void;
    onNodeDragEnd?: (node: N, translate: { x: number; y: number }) => void;
    onLinkClick?: (link: L, event: MouseEvent) => void;
    onLinkRightClick?: (link: L, event: MouseEvent) => void;
    onLinkHover?: (link: L | null, previousLink: L | null) => void;
    onBackgroundClick?: (event: MouseEvent) => void;
    onBackgroundRightClick?: (event: MouseEvent) => void;
    onZoom?: (transform: { k: number; x: number; y: number }) => void;
    onZoomEnd?: (transform: { k: number; x: number; y: number }) => void;

    // 其他
    enableNodeDrag?: boolean;
    enableZoomInteraction?: boolean;
    enablePanInteraction?: boolean;
    enablePointerInteraction?: boolean;
    autoPauseRedraw?: boolean;
    minZoom?: number;
    maxZoom?: number;
    dagMode?: 'td' | 'bu' | 'lr' | 'rl' | 'radialout' | 'radialin' | null;
    dagLevelDistance?: number | null;
  }

  type ForceGraph2DComponent<
    N extends NodeObject = NodeObject,
    L extends LinkObject = LinkObject,
  > = ForwardRefExoticComponent<ForceGraph2DProps<N, L> & RefAttributes<ForceGraphMethods<N, L>>>;

  const ForceGraph2D: ForceGraph2DComponent;

  export default ForceGraph2D;
}
