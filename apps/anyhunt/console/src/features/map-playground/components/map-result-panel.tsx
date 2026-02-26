/**
 * [PROPS]: MapResultPanelProps
 * [EMITS]: none
 * [POS]: Map Playground 结果区组件
 */

import { CircleCheck, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { MapResponse } from '../index';

type MapResultPanelProps = {
  data: MapResponse | undefined;
  error: Error | null;
};

function MapResultLinks({ links }: { links: string[] }) {
  if (links.length === 0) {
    return <p className="text-muted-foreground">No URLs found</p>;
  }

  return (
    <div className="max-h-[500px] space-y-1 overflow-auto">
      {links.map((link, index) => (
        <a
          key={index}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded p-2 text-xs hover:bg-muted"
        >
          <Link className="h-3 w-3 shrink-0" />
          <span className="truncate">{link}</span>
        </a>
      ))}
    </div>
  );
}

export function MapResultPanel({ data, error }: MapResultPanelProps) {
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Enter a URL and click "Map" to discover URLs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleCheck className="h-5 w-5 text-green-600" />
          Found {data.links.length} URLs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MapResultLinks links={data.links} />
      </CardContent>
    </Card>
  );
}
