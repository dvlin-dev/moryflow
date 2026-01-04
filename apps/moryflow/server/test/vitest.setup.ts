/**
 * Vitest Setup File
 * 加载环境变量和全局配置
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载 .env 文件
config({ path: resolve(__dirname, '../.env') });
