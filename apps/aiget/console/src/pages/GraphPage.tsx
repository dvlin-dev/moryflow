/**
 * Graph 页面 - 知识图谱可视化
 *
 * 使用 react-force-graph-2d 进行力导向图谱渲染。
 * 需要选择 API Key 和输入 User ID 来查询图谱数据。
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from 'react-force-graph-2d';
import {
  FlowConnectionIcon,
  Loading03Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import { useGraph, type GraphNode, type GraphEdge } from '@/features/memox';

// 表单 Schema
const graphFormSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.number().min(1).max(1000),
});

type GraphFormValues = z.infer<typeof graphFormSchema>;

// 表单默认值
const graphFormDefaults: GraphFormValues = {
  userId: '',
  limit: 100,
};

// 节点类型颜色映射
const NODE_COLORS: Record<string, string> = {
  person: '#4f46e5',
  organization: '#059669',
  location: '#d97706',
  event: '#dc2626',
  concept: '#7c3aed',
  default: '#6b7280',
};

// 转换 API 数据为 force-graph 格式
interface ForceNode extends NodeObject {
  id: string;
  name: string;
  type: string;
  properties?: Record<string, unknown> | null;
}

interface ForceLink {
  source: string;
  target: string;
  type: string;
  confidence?: number | null;
}

interface ForceGraphData {
  nodes: ForceNode[];
  links: ForceLink[];
}

function transformGraphData(nodes: GraphNode[], edges: GraphEdge[]): ForceGraphData {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      properties: node.properties,
    })),
    links: edges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
      confidence: edge.confidence,
    })),
  };
}

export default function GraphPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState<{ userId: string; limit: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ForceNode | null>(null);

  const graphRef = useRef<ForceGraphMethods<ForceNode, ForceLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.max(400, height) });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // 计算 effective API key
  const effectiveKeyId = selectedKeyId ?? apiKeys.find((k) => k.isActive)?.id ?? '';
  const selectedKey = apiKeys.find((k) => k.id === effectiveKeyId);
  const activeKeys = apiKeys.filter((k) => k.isActive);

  // 图谱查询
  const {
    data: graphData,
    isLoading: isLoadingGraph,
    error: graphError,
  } = useGraph(
    selectedKey?.keyPrefix || '',
    queryParams ? { userId: queryParams.userId, limit: queryParams.limit } : { userId: '' },
    !!selectedKey?.keyPrefix && !!queryParams
  );

  // 转换图谱数据
  const forceGraphData = useMemo(() => {
    if (!graphData) return null;
    return transformGraphData(graphData.nodes, graphData.edges);
  }, [graphData]);

  // 表单
  const form = useForm<GraphFormValues>({
    resolver: zodResolver(graphFormSchema),
    defaultValues: graphFormDefaults,
  });

  const onSubmit = (values: GraphFormValues) => {
    setQueryParams(values);
  };

  // 节点渲染
  const nodeCanvasObject = useCallback(
    (node: ForceNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name || node.id;
      const fontSize = 12 / globalScale;
      const nodeRadius = 6;

      // 节点颜色
      const color = NODE_COLORS[node.type.toLowerCase()] || NODE_COLORS.default;

      // 绘制节点
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = hoveredNode?.id === node.id ? '#f59e0b' : color;
      ctx.fill();

      // 绘制标签
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#374151';
      ctx.fillText(label, node.x || 0, (node.y || 0) + nodeRadius + 2);
    },
    [hoveredNode]
  );

  // 节点悬停
  const handleNodeHover = useCallback((node: ForceNode | null) => {
    setHoveredNode(node);
  }, []);

  // 节点点击
  const handleNodeClick = useCallback((node: ForceNode) => {
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2, 500);
    }
  }, []);

  // 加载状态
  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Icon icon={FlowConnectionIcon} className="h-6 w-6" />
          Knowledge Graph
        </h1>
        <p className="text-muted-foreground mt-1">Visualize entities and their relationships.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：配置表单 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Query Settings</CardTitle>
              <CardDescription>Select API Key and enter User ID to load graph</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* API Key 选择 */}
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Select
                      value={effectiveKeyId}
                      onValueChange={setSelectedKeyId}
                      disabled={isLoadingGraph}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select API Key" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeKeys.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No active API keys
                          </SelectItem>
                        ) : (
                          activeKeys.map((key) => (
                            <SelectItem key={key.id} value={key.id}>
                              <span className="flex items-center gap-2">
                                <span>{key.name}</span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {key.keyPrefix}...
                                </span>
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {activeKeys.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Create an API key in{' '}
                        <a href="/api-keys" className="text-primary hover:underline">
                          API Keys
                        </a>{' '}
                        to query the graph.
                      </p>
                    )}
                  </div>

                  {/* User ID */}
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter user ID" {...field} disabled={isLoadingGraph} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Limit */}
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Node Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            {...field}
                            disabled={isLoadingGraph}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoadingGraph || !effectiveKeyId}
                  >
                    {isLoadingGraph ? (
                      <>
                        <Icon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load Graph'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* 图例 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {Object.entries(NODE_COLORS)
                  .filter(([key]) => key !== 'default')
                  .map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="capitalize">{type}</span>
                    </div>
                  ))}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: NODE_COLORS.default }}
                  />
                  <span>Other</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 悬停节点信息 */}
          {hoveredNode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Node Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{hoveredNode.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="capitalize">{hoveredNode.type}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="font-mono text-xs truncate">{hoveredNode.id}</dd>
                  </div>
                  {hoveredNode.properties && Object.keys(hoveredNode.properties).length > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Properties</dt>
                      <dd className="font-mono text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                        {JSON.stringify(hoveredNode.properties, null, 2)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：图谱可视化 */}
        <div className="lg:col-span-2">
          {graphError && (
            <Alert variant="destructive" className="mb-4">
              <Icon icon={InformationCircleIcon} className="h-4 w-4" />
              <AlertDescription>Failed to load graph: {graphError.message}</AlertDescription>
            </Alert>
          )}

          <Card className="h-[600px]">
            <CardHeader className="pb-2">
              <CardTitle>Graph Visualization</CardTitle>
              <CardDescription>
                {forceGraphData
                  ? `${forceGraphData.nodes.length} nodes, ${forceGraphData.links.length} edges`
                  : 'Enter User ID and click "Load Graph" to visualize'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]" ref={containerRef}>
              {isLoadingGraph ? (
                <div className="flex items-center justify-center h-full">
                  <Icon
                    icon={Loading03Icon}
                    className="h-8 w-8 animate-spin text-muted-foreground"
                  />
                </div>
              ) : forceGraphData && forceGraphData.nodes.length > 0 ? (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={forceGraphData}
                  width={dimensions.width}
                  height={dimensions.height - 20}
                  nodeCanvasObject={nodeCanvasObject}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x || 0, node.y || 0, 8, 0, 2 * Math.PI);
                    ctx.fill();
                  }}
                  onNodeHover={handleNodeHover}
                  onNodeClick={handleNodeClick}
                  linkColor={() => '#d1d5db'}
                  linkWidth={1}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={2}
                  cooldownTicks={100}
                  onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                />
              ) : forceGraphData && forceGraphData.nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Icon
                    icon={FlowConnectionIcon}
                    className="h-16 w-16 text-muted-foreground/30 mb-4"
                  />
                  <p className="text-muted-foreground">No graph data found for this user.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Icon
                    icon={FlowConnectionIcon}
                    className="h-16 w-16 text-muted-foreground/30 mb-4"
                  />
                  <p className="text-muted-foreground max-w-md">
                    Select an API Key, enter a User ID, and click "Load Graph" to visualize the
                    knowledge graph.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
