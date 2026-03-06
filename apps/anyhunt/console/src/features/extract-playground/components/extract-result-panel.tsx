/**
 * [PROPS]: ExtractResultPanelProps
 * [EMITS]: none
 * [POS]: Extract Playground 结果区（error/success/empty）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { CircleCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { ExtractResponse } from '@/features/extract-playground';

interface ExtractResultPanelProps {
  data: ExtractResponse | undefined;
  error: Error | null;
}

function ExtractErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function ExtractSuccessCard({ data }: { data: ExtractResponse }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleCheck className="h-5 w-5 text-green-600" />
          Extraction Successful
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto max-h-[500px] p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
          {JSON.stringify(data.data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function ExtractEmptyCard() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <p className="text-muted-foreground">Enter a URL and click "Extract" to see results.</p>
      </CardContent>
    </Card>
  );
}

export function ExtractResultPanel({ data, error }: ExtractResultPanelProps) {
  if (error) {
    return <ExtractErrorCard message={error.message} />;
  }

  if (data) {
    return <ExtractSuccessCard data={data} />;
  }

  return <ExtractEmptyCard />;
}
