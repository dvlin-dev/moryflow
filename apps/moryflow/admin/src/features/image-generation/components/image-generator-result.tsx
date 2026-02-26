import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { resolveGeneratedImageSource } from '../view-state';
import {
  selectImageGeneratorViewState,
  useImageGeneratorStore,
  type ImageGenerationResult,
} from '../store';

function GeneratedImageCard({
  source,
  alt,
}: {
  source: string | null;
  alt: string;
}) {
  if (!source) {
    return <div className="flex h-32 items-center justify-center text-muted-foreground">无图片数据</div>;
  }

  return <img src={source} alt={alt} className="h-auto w-full object-cover" />;
}

function ReadyStateResult({
  result,
  rawResponseOpen,
  onRawResponseOpenChange,
}: {
  result: ImageGenerationResult;
  rawResponseOpen: boolean;
  onRawResponseOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {result.response.data.map((image, index) => {
          const source = resolveGeneratedImageSource(image);

          return (
            <div key={index} className="overflow-hidden rounded-lg border bg-muted">
              <GeneratedImageCard source={source} alt={`Generated ${index + 1}`} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>耗时: {(result.duration / 1000).toFixed(2)}s</span>
        <span>图片数: {result.response.data.length}</span>
      </div>

      <Collapsible open={rawResponseOpen} onOpenChange={onRawResponseOpenChange}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            {rawResponseOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            原始响应
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
            {JSON.stringify(result.response, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function ImageGeneratorResult() {
  const viewState = useImageGeneratorStore(selectImageGeneratorViewState);
  const result = useImageGeneratorStore((state) => state.result);
  const error = useImageGeneratorStore((state) => state.error);
  const rawResponseOpen = useImageGeneratorStore((state) => state.rawResponseOpen);
  const setRawResponseOpen = useImageGeneratorStore((state) => state.setRawResponseOpen);

  const renderContentByState = () => {
    switch (viewState) {
      case 'loading':
        return (
          <div className="flex h-64 items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        );
      case 'error':
        return (
          <div className="flex h-64 items-center justify-center text-center text-destructive">
            {error ?? '生成失败，请稍后重试'}
          </div>
        );
      case 'ready':
        if (!result) {
          return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              暂无可展示的图片
            </div>
          );
        }

        return (
          <ReadyStateResult
            result={result}
            rawResponseOpen={rawResponseOpen}
            onRawResponseOpenChange={setRawResponseOpen}
          />
        );
      case 'idle':
      default:
        return <div className="flex h-64 items-center justify-center text-muted-foreground">点击"生成图片"开始</div>;
    }
  };

  return renderContentByState();
}
