/**
 * [PROPS]: DiagnosticsSectionProps
 * [EMITS]: onFetchConsole/onClearConsole/onFetchErrors/onClearErrors/onFetchRisk/onStartTrace/onStopTrace/onStartHar/onStopHar
 * [POS]: Browser Session 分区 - Diagnostics
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Switch,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type {
  BrowserDiagnosticsHarValues,
  BrowserDiagnosticsLogValues,
  BrowserDiagnosticsTraceValues,
} from '../../schemas';
import type {
  BrowserConsoleMessage,
  BrowserDetectionRiskSummary,
  BrowserHarStopResult,
  BrowserPageError,
  BrowserTraceStopResult,
} from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type DiagnosticsSectionProps = {
  apiKey: string;
  logForm: UseFormReturn<BrowserDiagnosticsLogValues>;
  traceForm: UseFormReturn<BrowserDiagnosticsTraceValues>;
  harForm: UseFormReturn<BrowserDiagnosticsHarValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consoleMessages: BrowserConsoleMessage[] | null;
  pageErrors: BrowserPageError[] | null;
  detectionRisk: BrowserDetectionRiskSummary | null;
  traceResult: BrowserTraceStopResult | null;
  harResult: BrowserHarStopResult | null;
  onFetchConsole: (values: BrowserDiagnosticsLogValues) => void;
  onClearConsole: () => void;
  onFetchErrors: (values: BrowserDiagnosticsLogValues) => void;
  onClearErrors: () => void;
  onFetchRisk: () => void;
  onStartTrace: (values: BrowserDiagnosticsTraceValues) => void;
  onStopTrace: (values: BrowserDiagnosticsTraceValues) => void;
  onStartHar: (values: BrowserDiagnosticsHarValues) => void;
  onStopHar: (values: BrowserDiagnosticsHarValues) => void;
};

export function DiagnosticsSection({
  apiKey,
  logForm,
  traceForm,
  harForm,
  open,
  onOpenChange,
  consoleMessages,
  pageErrors,
  detectionRisk,
  traceResult,
  harResult,
  onFetchConsole,
  onClearConsole,
  onFetchErrors,
  onClearErrors,
  onFetchRisk,
  onStartTrace,
  onStopTrace,
  onStartHar,
  onStopHar,
}: DiagnosticsSectionProps) {
  const renderDetectionRiskContent = () => {
    if (!detectionRisk) {
      return <p className="text-xs text-muted-foreground">No risk summary loaded yet.</p>;
    }

    const hasNavigationData = detectionRisk.navigation.total > 0;
    const successRateLabel = hasNavigationData
      ? `24h Success Rate: ${(detectionRisk.navigation.successRate * 100).toFixed(2)}%`
      : '24h Success Rate: No data';

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{successRateLabel}</p>
        <CodeBlock code={formatJson(detectionRisk)} language="json" />
      </div>
    );
  };

  return (
    <CollapsibleSection title="Diagnostics" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        <Form {...logForm}>
          <form className="space-y-4">
            <FormField
              control={logForm.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Log Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={logForm.handleSubmit(onFetchConsole)} disabled={!apiKey}>
                Get Console
              </Button>
              <Button type="button" variant="ghost" onClick={onClearConsole} disabled={!apiKey}>
                Clear Console
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={logForm.handleSubmit(onFetchErrors)}
                disabled={!apiKey}
              >
                Get Errors
              </Button>
              <Button type="button" variant="ghost" onClick={onClearErrors} disabled={!apiKey}>
                Clear Errors
              </Button>
            </div>
            {consoleMessages && <CodeBlock code={formatJson(consoleMessages)} language="json" />}
            {pageErrors && <CodeBlock code={formatJson(pageErrors)} language="json" />}
          </form>
        </Form>
        <Form {...traceForm}>
          <form className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <FormField
                control={traceForm.control}
                name="screenshots"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Screenshots</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={traceForm.control}
                name="snapshots"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Snapshots</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={traceForm.control}
                name="store"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Store Result</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={traceForm.handleSubmit(onStartTrace)} disabled={!apiKey}>
                Start Trace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={traceForm.handleSubmit(onStopTrace)}
                disabled={!apiKey}
              >
                Stop Trace
              </Button>
            </div>
            {traceResult && <CodeBlock code={formatJson(traceResult)} language="json" />}
          </form>
        </Form>
        <Form {...harForm}>
          <form className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <FormField
                control={harForm.control}
                name="clear"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Clear Before</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={harForm.control}
                name="includeRequests"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Include Requests</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={harForm.handleSubmit(onStartHar)} disabled={!apiKey}>
                Start HAR
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={harForm.handleSubmit(onStopHar)}
                disabled={!apiKey}
              >
                Stop HAR
              </Button>
            </div>
            {harResult && <CodeBlock code={formatJson(harResult)} language="json" />}
          </form>
        </Form>
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Detection Risk</h4>
            <Button type="button" variant="outline" onClick={onFetchRisk} disabled={!apiKey}>
              Refresh Risk
            </Button>
          </div>
          {renderDetectionRiskContent()}
        </div>
      </div>
    </CollapsibleSection>
  );
}
