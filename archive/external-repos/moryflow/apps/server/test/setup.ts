/**
 * E2E Test Setup
 * 配置环境变量和全局设置
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载 .env 文件
config({ path: resolve(__dirname, '../.env') });

// 设置测试超时时间
jest.setTimeout(30000);
