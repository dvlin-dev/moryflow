/**
 * [PROPS]: data / maxHeight
 * [EMITS]: none
 * [POS]: Job 详情 JSON 展示组件
 */

export interface JobJsonDisplayProps {
  data: unknown;
  maxHeight?: number;
}

export function JobJsonDisplay({ data, maxHeight = 300 }: JobJsonDisplayProps) {
  if (!data) {
    return <p className="text-muted-foreground">无数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <pre className="min-w-0 overflow-auto rounded-md bg-muted p-4 text-xs" style={{ maxHeight }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
