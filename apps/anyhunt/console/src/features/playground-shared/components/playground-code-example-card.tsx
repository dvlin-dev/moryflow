/**
 * [PROPS]: endpoint/method/apiKey/apiKeyValue/body
 * [EMITS]: none
 * [POS]: Playground 代码示例卡片（统一样式）
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import { CodeExample } from './code-example';

type PlaygroundCodeExampleCardProps = {
  endpoint: string;
  method: string;
  apiKey: string;
  apiKeyValue: string;
  body: unknown;
  title?: string;
  description?: string;
};

export function PlaygroundCodeExampleCard({
  endpoint,
  method,
  apiKey,
  apiKeyValue,
  body,
  title = 'Code Example',
  description = 'Copy and use this code in your application',
}: PlaygroundCodeExampleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <CodeExample
          endpoint={endpoint}
          method={method}
          apiKey={apiKey}
          apiKeyValue={apiKeyValue}
          body={body}
        />
      </CardContent>
    </Card>
  );
}
