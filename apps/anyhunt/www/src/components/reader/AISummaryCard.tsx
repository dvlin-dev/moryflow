/**
 * [PROPS]: summary
 * [POS]: AI-generated summary card with distinct styling (Lucide icons direct render)
 */

import { Card, CardContent } from '@moryflow/ui';
import { Sparkles } from 'lucide-react';

interface AISummaryCardProps {
  summary: string;
}

export function AISummaryCard({ summary }: AISummaryCardProps) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-xs font-medium uppercase text-primary">AI Summary</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
