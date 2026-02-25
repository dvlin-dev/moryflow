/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Search Playground 页面（react-hook-form + zod，Lucide icons direct render）
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Search, Loader, CircleCheck, Globe } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { useSearch, type SearchRequest, type SearchResponse } from '@/features/search-playground';
import {
  ApiKeySelector,
  CodeExample,
  CollapsibleSection,
  PlaygroundPageShell,
  searchFormSchema,
  searchFormDefaults,
  type SearchFormValues,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

interface SearchSubmitIconProps {
  isPending: boolean;
}

interface SearchResultListProps {
  results: SearchResponse['results'];
}

function SearchSubmitIcon({ isPending }: SearchSubmitIconProps) {
  if (isPending) {
    return <Loader className="h-4 w-4 animate-spin" />;
  }

  return <Search className="h-4 w-4" />;
}

function getSearchResultContent(result: SearchResponse['results'][number]): string {
  return result.markdown || result.content || '';
}

function SearchResultList({ results }: SearchResultListProps) {
  if (results.length === 0) {
    return <p className="text-muted-foreground">No results found</p>;
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-auto">
      {results.map((result, index) => {
        const content = getSearchResultContent(result);
        const contentPreview = content.slice(0, 1000);
        const shouldTruncate = content.length > 1000;

        return (
          <div key={index} className="p-4 rounded-lg border space-y-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {result.title}
            </a>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">{result.url}</span>
            </div>

            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
            )}

            {content && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View scraped content
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32 whitespace-pre-wrap">
                  {contentPreview}
                  {shouldTruncate && '...'}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SearchPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { mutate, isPending, data, error, reset } = useSearch(apiKeyValue);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: searchFormDefaults,
  });

  const handleFormSubmit = (values: SearchFormValues) => {
    const request: SearchRequest = {
      query: values.query,
      limit: values.limit,
    };

    setLastRequest(request);
    reset();
    mutate(request, {
      onSuccess: (result: SearchResponse) => {
        toast.success(`Found ${result.results.length} results`);
      },
      onError: (err: Error) => {
        toast.error(`Search failed: ${err.message}`);
      },
    });
  };

  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  const requestContent = (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Enter a search query</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <ApiKeySelector
              apiKeys={apiKeys}
              selectedKeyId={effectiveKeyId}
              onKeyChange={setSelectedKeyId}
              disabled={isPending}
            />

            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Query</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Best programming languages 2024"
                        className="flex-1"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <Button type="submit" disabled={isPending || !hasActiveKey}>
                      <SearchSubmitIcon isPending={isPending} />
                      <span className="ml-2">Search</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CollapsibleSection title="Options" open={optionsOpen} onOpenChange={setOptionsOpen}>
              <FormField
                control={form.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Results Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={20} disabled={isPending} {...field} />
                    </FormControl>
                    <FormDescription>Maximum number of results to return</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleSection>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  const renderCodeExampleContent = () => {
    if (!lastRequest) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Code Example</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeExample
            endpoint={FETCHX_API.SEARCH}
            method="POST"
            apiKey={apiKeyDisplay}
            apiKeyValue={apiKeyValue}
            body={lastRequest}
          />
        </CardContent>
      </Card>
    );
  };

  const codeExampleContent = renderCodeExampleContent();

  const resultContent = (
    <>
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleCheck className="h-5 w-5 text-green-600" />
              {data.results.length} Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SearchResultList results={data.results} />
          </CardContent>
        </Card>
      )}

      {!data && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Enter a query and click "Search" to see results.</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <PlaygroundPageShell
      title="Search Playground"
      description="Search the web and get scraped content from results."
      request={requestContent}
      codeExample={codeExampleContent}
      result={resultContent}
    />
  );
}
