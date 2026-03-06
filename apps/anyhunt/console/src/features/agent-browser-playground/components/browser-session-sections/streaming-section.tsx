/**
 * [PROPS]: StreamingSectionProps
 * [EMITS]: onCreateToken/onDisconnect/onPointerDown/onPointerUp/onWheel/onKeyDown/onKeyUp
 * [POS]: Browser Session 分区 - Streaming
 */

import type { KeyboardEvent, MutableRefObject, PointerEvent, WheelEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Input } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserStreamValues } from '../../schemas';
import type {
  BrowserStreamFrame,
  BrowserStreamStatus,
  BrowserStreamTokenResult,
} from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type StreamingSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserStreamValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: BrowserStreamTokenResult | null;
  status: BrowserStreamStatus | null;
  frame: BrowserStreamFrame | null;
  error: string | null;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  onCreateToken: (values: BrowserStreamValues) => void;
  onDisconnect: () => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function StreamingSection({
  apiKey,
  form,
  open,
  onOpenChange,
  token,
  status,
  frame,
  error,
  imageRef,
  onCreateToken,
  onDisconnect,
  onPointerDown,
  onPointerUp,
  onWheel,
  onKeyDown,
  onKeyUp,
}: StreamingSectionProps) {
  return (
    <CollapsibleSection title="Streaming" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="expiresIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token TTL (seconds)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="300" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={form.handleSubmit(onCreateToken)} disabled={!apiKey}>
                Create Token
              </Button>
              <Button type="button" variant="outline" onClick={onDisconnect} disabled={!apiKey}>
                Disconnect
              </Button>
            </div>
            {token && <CodeBlock code={formatJson(token)} language="json" />}
            {status && <CodeBlock code={formatJson(status)} language="json" />}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </Form>
        <div
          className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-border-muted bg-muted/30 p-4 text-sm text-muted-foreground focus:outline-none"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        >
          {frame ? (
            <img
              ref={imageRef}
              src={`data:image/jpeg;base64,${frame.data}`}
              alt="Stream frame"
              className="max-h-[480px] w-full rounded-md border border-border-muted object-contain"
            />
          ) : (
            <div className="space-y-2 text-center">
              <p>Waiting for frames...</p>
              <p>Click to focus and send keyboard/mouse events.</p>
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
