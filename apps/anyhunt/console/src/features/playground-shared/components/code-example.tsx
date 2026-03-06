/**
 * 代码示例展示组件
 */
import { useState } from 'react';
import { Copy, CircleCheck } from 'lucide-react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@moryflow/ui';

interface CodeExampleProps {
  endpoint: string;
  method: string;
  apiKey: string;
  apiKeyValue?: string;
  body?: unknown;
}

export function CodeExample({ endpoint, method, apiKey, apiKeyValue, body }: CodeExampleProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'https://server.anyhunt.app';
  const fullUrl = `${baseUrl}${endpoint}`;
  const resolvedKey = apiKeyValue || apiKey;

  const curlCode = generateCurl(fullUrl, method, apiKey, body);
  const jsCode = generateJavaScript(fullUrl, method, apiKey, body);
  const pythonCode = generatePython(fullUrl, method, apiKey, body);
  const curlCopyCode = apiKeyValue ? generateCurl(fullUrl, method, resolvedKey, body) : curlCode;
  const jsCopyCode = apiKeyValue ? generateJavaScript(fullUrl, method, resolvedKey, body) : jsCode;
  const pythonCopyCode = apiKeyValue
    ? generatePython(fullUrl, method, resolvedKey, body)
    : pythonCode;

  const copyToClipboard = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      <Tabs defaultValue="curl">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="curl" className="text-xs">
              cURL
            </TabsTrigger>
            <TabsTrigger value="javascript" className="text-xs">
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="python" className="text-xs">
              Python
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="curl" className="relative m-0">
          <CodeBlock
            code={curlCode}
            copied={copied === 'curl'}
            onCopy={() => copyToClipboard(curlCopyCode, 'curl')}
          />
        </TabsContent>

        <TabsContent value="javascript" className="relative m-0">
          <CodeBlock
            code={jsCode}
            copied={copied === 'javascript'}
            onCopy={() => copyToClipboard(jsCopyCode, 'javascript')}
          />
        </TabsContent>

        <TabsContent value="python" className="relative m-0">
          <CodeBlock
            code={pythonCode}
            copied={copied === 'python'}
            onCopy={() => copyToClipboard(pythonCopyCode, 'python')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CodeBlock({
  code,
  copied,
  onCopy,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const IconComponent = copied ? CircleCheck : Copy;
  return (
    <div className="relative">
      <pre className="overflow-x-auto p-4 text-xs font-mono text-muted-foreground">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-7 w-7 p-0"
        onClick={onCopy}
      >
        <IconComponent className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
      </Button>
    </div>
  );
}

function generateCurl(url: string, method: string, apiKey: string, body?: unknown): string {
  const lines = [`curl -X ${method} "${url}"`];
  lines.push(`  -H "Authorization: Bearer ${apiKey}"`);
  lines.push(`  -H "Content-Type: application/json"`);
  if (body) {
    lines.push(`  -d '${JSON.stringify(body, null, 2)}'`);
  }
  return lines.join(' \\\n');
}

function generateJavaScript(url: string, method: string, apiKey: string, body?: unknown): string {
  return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  }${
    body
      ? `,
  body: JSON.stringify(${JSON.stringify(body, null, 2)})`
      : ''
  }
});

const data = await response.json();
console.log(data);`;
}

function generatePython(url: string, method: string, apiKey: string, body?: unknown): string {
  // 转换 JSON 为 Python 格式（true->True, false->False, null->None）
  const jsonBody = body
    ? JSON.stringify(body, null, 4)
        .replace(/: true/g, ': True')
        .replace(/: false/g, ': False')
        .replace(/: null/g, ': None')
    : '';
  return `import requests

response = requests.${method.toLowerCase()}(
    "${url}",
    headers={
        "Authorization": f"Bearer ${apiKey}",
        "Content-Type": "application/json"
    }${
      body
        ? `,
    json=${jsonBody}`
        : ''
    }
)

print(response.json())`;
}
