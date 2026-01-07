import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
// @ts-expect-error TanStack Start 类型声明文件缺失，运行时正常
import { getRouterManifest } from '@tanstack/react-start/router-manifest';
import { createRouter } from './router';

export default (createStartHandler as any)({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler);
