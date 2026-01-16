import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';
import { createRouter } from './router';

const router = createRouter();

// @ts-expect-error TanStack Start 类型定义不完整，运行时正常
hydrateRoot(document, <StartClient router={router} />);
