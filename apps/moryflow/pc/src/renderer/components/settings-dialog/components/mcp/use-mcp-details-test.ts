import { useState, useCallback } from 'react';
import type { McpTestInput, McpTestResult } from '@shared/ipc';
import type { FormValues } from '../../const';
import type { McpServerType } from './constants';

type CurrentServerData =
  | FormValues['mcp']['stdio'][number]
  | FormValues['mcp']['streamableHttp'][number]
  | undefined;

type UseMcpDetailsTestParams = {
  currentData: CurrentServerData;
  serverType: McpServerType;
  testServer: (input: McpTestInput) => Promise<McpTestResult>;
};

export const useMcpDetailsTest = ({
  currentData,
  serverType,
  testServer,
}: UseMcpDetailsTestParams) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [verifiedTools, setVerifiedTools] = useState<string[]>([]);

  const closeTestResult = useCallback(() => {
    setTestResult(null);
  }, []);

  const handleTest = useCallback(async () => {
    if (!currentData) return;

    setTesting(true);
    setTestResult(null);

    try {
      let input: McpTestInput;
      if (serverType === 'stdio') {
        const data = currentData as FormValues['mcp']['stdio'][number];
        input = {
          type: 'stdio',
          config: {
            name: data.name || 'Test Server',
            command: data.command,
            args: data.args?.trim() ? data.args.trim().split(/\s+/) : undefined,
            cwd: data.cwd || undefined,
            env:
              data.env && data.env.length > 0
                ? Object.fromEntries(data.env.filter((entry) => entry.key.trim()).map((entry) => [entry.key, entry.value]))
                : undefined,
          },
        };
      } else {
        const data = currentData as FormValues['mcp']['streamableHttp'][number];
        input = {
          type: 'http',
          config: {
            name: data.name || 'Test Server',
            url: data.url,
            authorizationHeader: data.authorizationHeader || undefined,
            headers:
              data.headers && data.headers.length > 0
                ? Object.fromEntries(
                    data.headers.filter((header) => header.key.trim()).map((header) => [header.key, header.value])
                  )
                : undefined,
          },
        };
      }

      const result = await testServer(input);
      setTestResult(result);
      if (result.success && result.toolNames) {
        setVerifiedTools(result.toolNames);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  }, [currentData, serverType, testServer]);

  return {
    testing,
    testResult,
    verifiedTools,
    handleTest,
    closeTestResult,
  };
};
