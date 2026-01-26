/**
 * [PROPS]: SessionSectionProps/OpenUrlSectionProps/.../CdpSectionProps
 * [EMITS]: onCreate/onSubmit/onFetch/onClear/onConnect/onPointerDown 等回调
 * [POS]: Browser Playground 分区 UI 组件集合（截图质量仅对 jpeg 生效）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { KeyboardEvent, MutableRefObject, PointerEvent, WheelEvent } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@anyhunt/ui';
import { CodeBlock } from '@anyhunt/ui/ai/code-block';
import type {
  BrowserSessionValues,
  BrowserOpenValues,
  BrowserSnapshotValues,
  BrowserDeltaSnapshotValues,
  BrowserActionValues,
  BrowserActionBatchValues,
  BrowserScreenshotValues,
  BrowserTabsValues,
  BrowserWindowsValues,
  BrowserInterceptValues,
  BrowserHeadersValues,
  BrowserNetworkHistoryValues,
  BrowserDiagnosticsLogValues,
  BrowserDiagnosticsTraceValues,
  BrowserDiagnosticsHarValues,
  BrowserStorageValues,
  BrowserProfileValues,
  BrowserStreamValues,
  BrowserCdpValues,
} from '../schemas';
import type {
  BrowserActionBatchResponse,
  BrowserActionResponse,
  BrowserConsoleMessage,
  BrowserDeltaSnapshotResponse,
  BrowserHarStopResult,
  BrowserHeadersResult,
  BrowserNetworkRequestRecord,
  BrowserOpenResponse,
  BrowserPageError,
  BrowserProfileLoadResult,
  BrowserProfileSaveResult,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserStorageExportResult,
  BrowserStreamFrame,
  BrowserStreamStatus,
  BrowserStreamTokenResult,
  BrowserTabInfo,
  BrowserTraceStopResult,
  BrowserWindowInfo,
} from '../types';
import { CollapsibleSection } from '../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type SessionSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserSessionValues>;
  sessionInfo: BrowserSessionInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: BrowserSessionValues) => void;
  onStatus: () => void;
  onClose: () => void;
};

function SessionSection({
  apiKey,
  form,
  sessionInfo,
  open,
  onOpenChange,
  onCreate,
  onStatus,
  onClose,
}: SessionSectionProps) {
  return (
    <CollapsibleSection title="Session" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
          <FormField
            control={form.control}
            name="sessionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session ID</FormLabel>
                <FormControl>
                  <Input placeholder="session_xxx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="viewportWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="viewportHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="800" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="300000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="device"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device</FormLabel>
                  <FormControl>
                    <Input placeholder="Desktop Chrome" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="userAgent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Agent</FormLabel>
                  <FormControl>
                    <Input placeholder="Custom UA" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale</FormLabel>
                  <FormControl>
                    <Input placeholder="en-US" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="timezoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="America/Los_Angeles" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colorScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Scheme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">light</SelectItem>
                      <SelectItem value="dark">dark</SelectItem>
                      <SelectItem value="no-preference">no-preference</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="reducedMotion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reduced Motion</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reduce">reduce</SelectItem>
                      <SelectItem value="no-preference">no-preference</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="geolocationLat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Latitude</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="37.7749" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geolocationLng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Longitude</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="-122.4194" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geolocationAccuracy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Accuracy</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="permissionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissions JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='["geolocation"]' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Global Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='{"x-debug":"1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="httpUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Username</FormLabel>
                  <FormControl>
                    <Input placeholder="user" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="httpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="recordVideoWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordVideoHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="720" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="javaScriptEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>JavaScript</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ignoreHTTPSErrors"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Ignore HTTPS Errors</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="offline"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Offline</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptDownloads"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Accept Downloads</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordVideoEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Record Video</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!apiKey}>
              Create Session
            </Button>
            <Button type="button" variant="outline" onClick={onStatus} disabled={!apiKey}>
              Get Status
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={!apiKey}>
              Close Session
            </Button>
          </div>
          {sessionInfo && <CodeBlock code={formatJson(sessionInfo)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type OpenUrlSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserOpenValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserOpenValues) => void;
  result: BrowserOpenResponse | null;
};

function OpenUrlSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: OpenUrlSectionProps) {
  return (
    <CollapsibleSection title="Open URL" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="waitUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait Until</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="load">load</SelectItem>
                      <SelectItem value="domcontentloaded">domcontentloaded</SelectItem>
                      <SelectItem value="networkidle">networkidle</SelectItem>
                      <SelectItem value="commit">commit</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoped Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='{"x-session":"demo"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Open URL
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type SnapshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserSnapshotValues) => void;
  result: BrowserSnapshotResponse | null;
};

function SnapshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: SnapshotSectionProps) {
  return (
    <CollapsibleSection title="Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="interactive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Interactive Only</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compact"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Compact</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="maxDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Depth</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="20" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope Selector</FormLabel>
                  <FormControl>
                    <Input placeholder="#content" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKey}>
            Capture Snapshot
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type DeltaSnapshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserDeltaSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserDeltaSnapshotValues) => void;
  result: BrowserDeltaSnapshotResponse | null;
};

function DeltaSnapshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: DeltaSnapshotSectionProps) {
  return (
    <CollapsibleSection title="Delta Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="delta"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Delta Mode</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Capture Delta
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ActionSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserActionValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserActionValues) => void;
  result: BrowserActionResponse | null;
};

function ActionSection({ apiKey, form, open, onOpenChange, onSubmit, result }: ActionSectionProps) {
  return (
    <CollapsibleSection title="Action" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="actionJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action JSON</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder='{"type":"click","selector":"@e1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Execute Action
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ActionBatchSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserActionBatchValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserActionBatchValues) => void;
  result: BrowserActionBatchResponse | null;
};

function ActionBatchSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ActionBatchSectionProps) {
  return (
    <CollapsibleSection title="Action Batch" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="actionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actions JSON (array)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder='[{"type":"click","selector":"@e1"},{"type":"wait","waitFor":{"time":1000}}]'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stopOnError"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Stop On Error</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Execute Batch
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ScreenshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserScreenshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserScreenshotValues) => void;
  result: BrowserScreenshotResponse | null;
};

function ScreenshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ScreenshotSectionProps) {
  const format = useWatch({ control: form.control, name: 'format' });
  const isJpeg = format === 'jpeg';

  return (
    <CollapsibleSection title="Screenshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="selector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selector (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="#main" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="png" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="png">png</SelectItem>
                      <SelectItem value="jpeg">jpeg</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80" disabled={!isJpeg} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullPage"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Full Page</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKey}>
            Capture Screenshot
          </Button>
          {result && (
            <div className="space-y-2">
              <CodeBlock code={formatJson(result)} language="json" />
              <img
                src={`data:${result.mimeType};base64,${result.data}`}
                alt="Screenshot"
                className="max-h-64 rounded-md border border-border-muted"
              />
            </div>
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type TabsSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserTabsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: BrowserTabInfo[] | null;
  dialogHistory: unknown[];
  onCreateTab: () => void;
  onListTabs: () => void;
  onSwitchTab: (values: BrowserTabsValues) => void;
  onCloseTab: (values: BrowserTabsValues) => void;
  onDialogHistory: () => void;
};

function TabsSection({
  apiKey,
  form,
  open,
  onOpenChange,
  tabs,
  dialogHistory,
  onCreateTab,
  onListTabs,
  onSwitchTab,
  onCloseTab,
  onDialogHistory,
}: TabsSectionProps) {
  return (
    <CollapsibleSection title="Tabs" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="tabIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tab Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onCreateTab} disabled={!apiKey}>
              Create Tab
            </Button>
            <Button type="button" variant="outline" onClick={onListTabs} disabled={!apiKey}>
              List Tabs
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchTab)}
              disabled={!apiKey}
            >
              Activate Tab
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseTab)}
              disabled={!apiKey}
            >
              Close Tab
            </Button>
          </div>
          {tabs && <CodeBlock code={formatJson(tabs)} language="json" />}
          <Button type="button" variant="outline" onClick={onDialogHistory}>
            Get Dialog History
          </Button>
          {dialogHistory.length > 0 && (
            <CodeBlock code={formatJson(dialogHistory)} language="json" />
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type WindowsSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserWindowsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windows: BrowserWindowInfo[] | null;
  onCreateWindow: (values: BrowserWindowsValues) => void;
  onListWindows: () => void;
  onSwitchWindow: (values: BrowserWindowsValues) => void;
  onCloseWindow: (values: BrowserWindowsValues) => void;
};

function WindowsSection({
  apiKey,
  form,
  open,
  onOpenChange,
  windows,
  onCreateWindow,
  onListWindows,
  onSwitchWindow,
  onCloseWindow,
}: WindowsSectionProps) {
  return (
    <CollapsibleSection title="Windows" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="windowIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Window Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="viewportWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="viewportHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="800" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="device"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device</FormLabel>
                  <FormControl>
                    <Input placeholder="Desktop Chrome" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userAgent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Agent</FormLabel>
                  <FormControl>
                    <Input placeholder="Custom UA" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale</FormLabel>
                  <FormControl>
                    <Input placeholder="en-US" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="America/Los_Angeles" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="colorScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Scheme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">light</SelectItem>
                      <SelectItem value="dark">dark</SelectItem>
                      <SelectItem value="no-preference">no-preference</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reducedMotion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reduced Motion</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reduce">reduce</SelectItem>
                      <SelectItem value="no-preference">no-preference</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="geolocationLat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Latitude</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="37.7749" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geolocationLng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Longitude</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="-122.4194" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geolocationAccuracy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Accuracy</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="permissionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissions JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='["geolocation"]' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Global Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='{"x-debug":"1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="httpUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Username</FormLabel>
                  <FormControl>
                    <Input placeholder="user" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="httpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="recordVideoWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordVideoHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="720" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="offline"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Offline</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptDownloads"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Accept Downloads</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordVideoEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Record Video</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onCreateWindow)} disabled={!apiKey}>
              Create Window
            </Button>
            <Button type="button" variant="outline" onClick={onListWindows} disabled={!apiKey}>
              List Windows
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchWindow)}
              disabled={!apiKey}
            >
              Activate Window
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseWindow)}
              disabled={!apiKey}
            >
              Close Window
            </Button>
          </div>
          {windows && <CodeBlock code={formatJson(windows)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type InterceptSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserInterceptValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: unknown[] | null;
  onSetRules: (values: BrowserInterceptValues) => void;
  onAddRule: (values: BrowserInterceptValues) => void;
  onRemoveRule: (values: BrowserInterceptValues) => void;
  onClearRules: () => void;
  onListRules: () => void;
};

function InterceptSection({
  apiKey,
  form,
  open,
  onOpenChange,
  rules,
  onSetRules,
  onAddRule,
  onRemoveRule,
  onClearRules,
  onListRules,
}: InterceptSectionProps) {
  return (
    <CollapsibleSection title="Network Intercept" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="rulesJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rules JSON (array)</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="[]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Single Rule JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"urlPattern":"*"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rule ID</FormLabel>
                <FormControl>
                  <Input placeholder="rule_123" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSetRules)} disabled={!apiKey}>
              Set Rules
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onAddRule)}
              disabled={!apiKey}
            >
              Add Rule
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onRemoveRule)}
              disabled={!apiKey}
            >
              Remove Rule
            </Button>
            <Button type="button" variant="ghost" onClick={onClearRules} disabled={!apiKey}>
              Clear Rules
            </Button>
            <Button type="button" variant="outline" onClick={onListRules} disabled={!apiKey}>
              List Rules
            </Button>
          </div>
          {rules && <CodeBlock code={formatJson(rules)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type HeadersSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserHeadersValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BrowserHeadersResult | null;
  onSetHeaders: (values: BrowserHeadersValues) => void;
  onClearHeaders: (values: BrowserHeadersValues) => void;
};

function HeadersSection({
  apiKey,
  form,
  open,
  onOpenChange,
  result,
  onSetHeaders,
  onClearHeaders,
}: HeadersSectionProps) {
  return (
    <CollapsibleSection title="Headers" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"x-debug":"1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clearGlobal"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Clear Global</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSetHeaders)} disabled={!apiKey}>
              Set Headers
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onClearHeaders)}
              disabled={!apiKey}
            >
              Clear Headers
            </Button>
          </div>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type NetworkHistorySectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserNetworkHistoryValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: BrowserNetworkRequestRecord[] | null;
  onFetch: (values: BrowserNetworkHistoryValues) => void;
  onClear: () => void;
};

function NetworkHistorySection({
  apiKey,
  form,
  open,
  onOpenChange,
  history,
  onFetch,
  onClear,
}: NetworkHistorySectionProps) {
  return (
    <CollapsibleSection title="Network History" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urlFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Filter</FormLabel>
                  <FormControl>
                    <Input placeholder="*.png" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onFetch)} disabled={!apiKey}>
              Get History
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKey}>
              Clear History
            </Button>
          </div>
          {history && <CodeBlock code={formatJson(history)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type DiagnosticsSectionProps = {
  apiKey: string;
  logForm: UseFormReturn<BrowserDiagnosticsLogValues>;
  traceForm: UseFormReturn<BrowserDiagnosticsTraceValues>;
  harForm: UseFormReturn<BrowserDiagnosticsHarValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consoleMessages: BrowserConsoleMessage[] | null;
  pageErrors: BrowserPageError[] | null;
  traceResult: BrowserTraceStopResult | null;
  harResult: BrowserHarStopResult | null;
  onFetchConsole: (values: BrowserDiagnosticsLogValues) => void;
  onClearConsole: () => void;
  onFetchErrors: (values: BrowserDiagnosticsLogValues) => void;
  onClearErrors: () => void;
  onStartTrace: (values: BrowserDiagnosticsTraceValues) => void;
  onStopTrace: (values: BrowserDiagnosticsTraceValues) => void;
  onStartHar: (values: BrowserDiagnosticsHarValues) => void;
  onStopHar: (values: BrowserDiagnosticsHarValues) => void;
};

function DiagnosticsSection({
  apiKey,
  logForm,
  traceForm,
  harForm,
  open,
  onOpenChange,
  consoleMessages,
  pageErrors,
  traceResult,
  harResult,
  onFetchConsole,
  onClearConsole,
  onFetchErrors,
  onClearErrors,
  onStartTrace,
  onStopTrace,
  onStartHar,
  onStopHar,
}: DiagnosticsSectionProps) {
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
              <Button
                type="button"
                onClick={logForm.handleSubmit(onFetchConsole)}
                disabled={!apiKey}
              >
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
              <Button
                type="button"
                onClick={traceForm.handleSubmit(onStartTrace)}
                disabled={!apiKey}
              >
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
      </div>
    </CollapsibleSection>
  );
}

type StorageSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserStorageValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportResult: BrowserStorageExportResult | null;
  onExport: (values: BrowserStorageValues) => void;
  onImport: (values: BrowserStorageValues) => void;
  onClear: () => void;
};

function StorageSection({
  apiKey,
  form,
  open,
  onOpenChange,
  exportResult,
  onExport,
  onImport,
  onClear,
}: StorageSectionProps) {
  return (
    <CollapsibleSection title="Storage" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="exportOptionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Export Options JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"include":{"cookies":true}}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importDataJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Import Data JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"cookies":[]}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onExport)} disabled={!apiKey}>
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onImport)}
              disabled={!apiKey}
            >
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKey}>
              Clear
            </Button>
          </div>
          {exportResult && <CodeBlock code={formatJson(exportResult)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ProfileSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserProfileValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveResult: BrowserProfileSaveResult | null;
  loadResult: BrowserProfileLoadResult | null;
  onSave: (values: BrowserProfileValues) => void;
  onLoad: (values: BrowserProfileValues) => void;
};

function ProfileSection({
  apiKey,
  form,
  open,
  onOpenChange,
  saveResult,
  loadResult,
  onSave,
  onLoad,
}: ProfileSectionProps) {
  return (
    <CollapsibleSection title="Profile" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="profileId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile ID (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="profile_123" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="includeSessionStorage"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Include Session Storage</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="loadProfileId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Load Profile ID</FormLabel>
                <FormControl>
                  <Input placeholder="profile_123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSave)} disabled={!apiKey}>
              Save Profile
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onLoad)}
              disabled={!apiKey}
            >
              Load Profile
            </Button>
          </div>
          {saveResult && <CodeBlock code={formatJson(saveResult)} language="json" />}
          {loadResult && <CodeBlock code={formatJson(loadResult)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

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

function StreamingSection({
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

type CdpSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserCdpValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: BrowserSessionInfo | null;
  onConnect: (values: BrowserCdpValues) => void;
};

function CdpSection({ apiKey, form, open, onOpenChange, session, onConnect }: CdpSectionProps) {
  return (
    <CollapsibleSection title="CDP Connect" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onConnect)} className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="browserbase">browserbase</SelectItem>
                    <SelectItem value="browseruse">browseruse</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wsEndpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WebSocket Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="ws://localhost:9222/devtools/browser/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="9222" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKey}>
            Connect CDP
          </Button>
          {session && <CodeBlock code={formatJson(session)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

export {
  SessionSection,
  OpenUrlSection,
  SnapshotSection,
  DeltaSnapshotSection,
  ActionSection,
  ActionBatchSection,
  ScreenshotSection,
  TabsSection,
  WindowsSection,
  InterceptSection,
  HeadersSection,
  NetworkHistorySection,
  DiagnosticsSection,
  StorageSection,
  ProfileSection,
  StreamingSection,
  CdpSection,
};
