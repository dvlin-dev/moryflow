const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const config = getDefaultConfig(__dirname);

// 配置 Metro 解析器以正确处理跨平台模块和条件导出
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// 配置 resolverMainFields 以支持 React Native 条件导出
// 'react-native' 优先级最高，使 /agents-core 使用 shims-react-native.ts
config.resolver.resolverMainFields = ['react-native', 'browser', 'main', 'module'];

// 配置条件导出（package.json exports 的条件解析）
// 这使得 Metro 能正确解析 "@openai/agents-core/_shims" 的 react-native 条件
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require', 'import'];

// 配置 unstable_enablePackageExports 以启用 package.json exports 解析
config.resolver.unstable_enablePackageExports = true;

// 自定义解析器处理 /agents-core/_shims
// 解决 Metro 对 subpath exports 和包内自引用的兼容性问题
const projectRoot = __dirname;
// apps/moryflow/mobile -> 需要3层到达 workspace root
const workspaceRoot = path.resolve(projectRoot, '../../..');

// alias 映射表（包名 -> shim/替代实现）
// React Native 仅适配 agents-core，避免引入 realtime
const shimsMap = {
  '@openai/agents-core/_shims': 'apps/moryflow/mobile/src/openai-agents-core-shims.ts',
};

// 强制解析的模块路径（确保 monorepo 中所有包使用同一个 React 实例）
const forceResolve = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 强制 react 和 react-native 解析到 apps/mobile 的实例
  // 这解决了 zeego 等 hoisted 包导入不同 React 副本的问题
  if (forceResolve[moduleName]) {
    return {
      filePath: path.join(forceResolve[moduleName], 'index.js'),
      type: 'sourceFile',
    };
  }

  if (moduleName === '@openai/agents') {
    return context.resolveRequest(context, '@openai/agents-core', platform);
  }

  if (moduleName === '@openai/agents/utils') {
    return context.resolveRequest(context, '@openai/agents-core/utils', platform);
  }

  // 处理 _shims 子路径的解析
  if (shimsMap[moduleName]) {
    return {
      filePath: path.resolve(workspaceRoot, shimsMap[moduleName]),
      type: 'sourceFile',
    };
  }
  // 其他模块使用默认解析
  return context.resolveRequest(context, moduleName, platform);
};

// 重要：withUniwindConfig 必须是最外层包装器
module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  polyfills: {
    rem: 14, // 保持与 nativewind 默认值一致
  },
});
