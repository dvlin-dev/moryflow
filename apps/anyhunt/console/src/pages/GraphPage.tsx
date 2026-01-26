/**
 * Graph 页面 - 知识图谱可视化
 *
 * 使用 react-force-graph-2d 进行力导向图谱渲染。
 * 需要输入 API Key 与实体过滤条件（user_id/agent_id/app_id/run_id）。
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3'; // 使用 v3 兼容层，解决 @hookform/resolvers 类型兼容问题
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
} from '@anyhunt/ui';
import { useApiKeys, maskApiKey } from '@/features/api-keys';
import { useGraph, type GraphNode, type GraphEdge, type GraphQueryParams } from '@/features/memox';

// 表单 Schema
const graphFormSchema = z.object({
  entity_type: z.enum(['user', 'agent', 'app', 'run']),
  entity_id: z.string().min(1, 'Entity ID is required'),
  limit: z.coerce.number().min(1).max(1000).default(200),
});

type GraphFormInput = z.input<typeof graphFormSchema>;
type GraphFormValues = z.infer<typeof graphFormSchema>;

// 表单默认值
const graphFormDefaults: GraphFormInput = {
  entity_type: 'user',
  entity_id: '',
  limit: 200,
};

// 节点类型颜色映射
const NODE_COLORS: Record<string, string> = {
  user: '#4f46e5',
  agent: '#059669',
  app: '#d97706',
  run: '#dc2626',
  default: '#6b7280',
};

// 转换 API 数据为 force-graph 格式
interface ForceNode extends NodeObject {
  id: string;
  name?: string;
  type?: string;
}

interface ForceLink {
  source: string;
  target: string;
  type?: string;
  [key: string]: unknown;
}

interface ForceGraphData {
  nodes: ForceNode[];
  links: ForceLink[];
}

function transformGraphData(nodes: GraphNode[], edges: GraphEdge[]): ForceGraphData {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name ?? node.id,
      type: node.type,
    })),
    links: edges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    })),
  };
}

export default function GraphPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState<GraphQueryParams | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeObject | null>(null);
  const activeKeys = apiKeys.filter((key) => key.isActive);
  const effectiveKeyId = selectedKeyId || activeKeys[0]?.id || '';
  const selectedKey = apiKeys.find((key) => key.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.key ?? '';
  const apiKeyDisplay = selectedKey ? maskApiKey(selectedKey.key) : '';

  const graphRef = useRef<ForceGraphMethods<ForceNode, ForceLink>>(null);
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

  // 图谱查询
  const {
    data: graphData,
    isLoading: isLoadingGraph,
    error: graphError,
  } = useGraph(apiKeyValue, queryParams ?? {}, !!apiKeyValue && !!queryParams);

  // 转换图谱数据
  const forceGraphData = useMemo(() => {
    if (!graphData) return null;
    return transformGraphData(graphData.nodes, graphData.edges);
  }, [graphData]);

  // 表单
  const form = useForm<GraphFormInput, unknown, GraphFormValues>({
    resolver: zodResolver(graphFormSchema),
    defaultValues: graphFormDefaults,
  });

  const onSubmit = (values: GraphFormValues) => {
    const params: GraphQueryParams = { limit: values.limit };
    if (values.entity_type === 'user') params.user_id = values.entity_id;
    if (values.entity_type === 'agent') params.agent_id = values.entity_id;
    if (values.entity_type === 'app') params.app_id = values.entity_id;
    if (values.entity_type === 'run') params.run_id = values.entity_id;
    setQueryParams(params);
  };

  // 节点渲染
  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const data = node as ForceNode;
      const label = data.name || data.id || 'unknown';
      const fontSize = 12 / globalScale;
      const nodeRadius = 6;

      // 节点颜色
      const color = data.type ? NODE_COLORS[data.type] || NODE_COLORS.default : NODE_COLORS.default;
      const isHovered = hoveredNode?.id !== undefined && String(hoveredNode.id) === String(data.id);

      // 绘制节点
      ctx.beginPath();
      ctx.arc(data.x || 0, data.y || 0, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#f59e0b' : color;
      ctx.fill();

      // 绘制标签
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#374151';
      ctx.fillText(label, data.x || 0, (data.y || 0) + nodeRadius + 2);
    },
    [hoveredNode]
  );

  // 节点悬停
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    setHoveredNode(node);
  }, []);

  // 节点点击
  const handleNodeClick = useCallback((node: NodeObject) => {
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
        <p className="text-muted-foreground mt-1">
          Visualize entities and relations from memories.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：表单 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Query</CardTitle>
              <CardDescription>Select API Key and enter an entity to load graph</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          {key.name} ({maskApiKey(key.key)})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="entity_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity Type</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="app">App</SelectItem>
                                <SelectItem value="run">Run</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entity_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="entity-123" {...field} disabled={isLoadingGraph} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="1000" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!apiKeyValue || isLoadingGraph}
                  >
                    {isLoadingGraph ? (
                      <>
                        <Icon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>Load Graph</>
                    )}
                  </Button>
                </form>
              </Form>

              <Alert>
                <Icon icon={InformationCircleIcon} className="h-4 w-4" />
                <AlertDescription>
                  Graph data is derived from entities and relations stored on memories.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：图谱 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Graph Visualization</CardTitle>
              <CardDescription>
                {forceGraphData
                  ? `${forceGraphData.nodes.length} nodes, ${forceGraphData.links.length} edges`
                  : 'Enter an entity and click "Load Graph" to visualize'}
              </CardDescription>
            </CardHeader>
            <CardContent ref={containerRef} className="h-[500px]">
              {graphError && (
                <Alert className="mb-4" variant="destructive">
                  <AlertDescription>
                    Failed to load graph:{' '}
                    {graphError instanceof Error ? graphError.message : 'error'}
                  </AlertDescription>
                </Alert>
              )}

              {isLoadingGraph ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Icon icon={Loading03Icon} className="h-5 w-5 animate-spin mr-2" />
                  Loading graph...
                </div>
              ) : forceGraphData && forceGraphData.nodes.length > 0 ? (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={forceGraphData}
                  width={dimensions.width}
                  height={dimensions.height}
                  nodeCanvasObject={nodeCanvasObject}
                  onNodeHover={handleNodeHover}
                  onNodeClick={handleNodeClick}
                  linkDirectionalArrowLength={5}
                  linkDirectionalArrowRelPos={1}
                  linkCurvature={0.1}
                  onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
                />
              ) : forceGraphData && forceGraphData.nodes.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No graph data found for this entity.</p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>Enter an entity and click "Load Graph" to visualize.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
