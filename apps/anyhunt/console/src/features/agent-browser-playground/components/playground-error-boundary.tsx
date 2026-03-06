/**
 * [PROPS]: PlaygroundErrorBoundaryProps
 * [EMITS]: None
 * [POS]: Agent Browser Playground 路由级错误边界
 */

import { Component, type ReactNode } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@moryflow/ui';

export interface PlaygroundErrorBoundaryProps {
  children: ReactNode;
}

type PlaygroundErrorBoundaryState = {
  error: Error | null;
};

export class PlaygroundErrorBoundary extends Component<
  PlaygroundErrorBoundaryProps,
  PlaygroundErrorBoundaryState
> {
  state: PlaygroundErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PlaygroundErrorBoundaryState {
    return { error };
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={this.handleReset}>
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={this.handleReload}>
                Reload page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
