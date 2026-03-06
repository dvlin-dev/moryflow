/**
 * [PROPS]: message
 * [EMITS]: none
 * [POS]: Playground 页面统一 loading 状态
 */

import { Card, CardContent } from '@moryflow/ui';

type PlaygroundLoadingStateProps = {
  message?: string;
};

export function PlaygroundLoadingState({ message = 'Loading...' }: PlaygroundLoadingStateProps) {
  return (
    <div className="container py-6">
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{message}</CardContent>
      </Card>
    </div>
  );
}
