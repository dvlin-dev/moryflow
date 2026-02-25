/**
 * [INPUT]: StealthScriptOptions (locale/userAgent/acceptLanguage)
 * [OUTPUT]: 完整的 init-script 字符串（25+ IIFE 补丁）
 * [POS]: 浏览器指纹补丁集，通过 context.addInitScript() 在页面脚本前注入
 *
 * 移植自 agent-browser-stealth 项目 stealth.ts
 * 每个补丁是独立 IIFE，互不依赖，通过 buildStealthScript() 组合
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { StealthScriptOptions } from './stealth.types';

// ---------------------------------------------------------------------------
// 公共 API
// ---------------------------------------------------------------------------

/**
 * 构建完整的 stealth init-script
 * 返回包含所有补丁的 JavaScript 字符串，注入到 BrowserContext
 */
export function buildStealthScript(options: StealthScriptOptions = {}): string {
  const locale = normalizeLocale(options.locale) ?? 'en-US';
  const languages = deriveLanguages(locale);
  const configScript = `const __abStealth = ${JSON.stringify({ locale, languages })};`;

  return [
    configScript,
    patchNavigatorWebdriver(),
    patchCssSupportsWebdriverHeuristic(),
    patchChromeRuntime(),
    patchNavigatorLanguages(),
    patchNavigatorPluginsAndMimeTypes(),
    patchNavigatorPermissions(),
    patchWebGLVendor(),
    patchCdcProperties(),
    patchWindowDimensions(),
    patchScreenDimensions(),
    patchScreenAvailability(),
    patchNavigatorHardwareConcurrency(),
    patchNotificationPermission(),
    patchActiveTextColorHeuristic(),
    patchNavigatorConnection(),
    patchWorkerConnection(),
    patchNavigatorShare(),
    patchNavigatorContacts(),
    patchContentIndex(),
    patchPrefersColorSchemeHeuristic(),
    patchPdfViewerEnabled(),
    patchMediaDevices(),
    patchUserAgentData(),
    patchUserAgent(),
    patchPerformanceMemory(),
    patchDefaultBackgroundColor(),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

function normalizeLocale(locale?: string): string | undefined {
  if (!locale) return undefined;
  const trimmed = locale.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.split(',')[0]?.split(';')[0]?.replace(/_/g, '-');
  if (!cleaned) return undefined;
  try {
    return new Intl.Locale(cleaned).toString();
  } catch {
    return undefined;
  }
}

function deriveLanguages(locale: string): string[] {
  const base = locale.split('-')[0];
  if (!base || base === locale) return [locale];
  return [locale, base];
}

// ---------------------------------------------------------------------------
// 补丁函数（每个返回独立 IIFE 字符串）
// ---------------------------------------------------------------------------

/** #1 移除 navigator.webdriver — 最基础的自动化检测 */
function patchNavigatorWebdriver(): string {
  return `(function(){
  const removeWebdriver = (target) => {
    if (!target) return;
    try { delete target.webdriver; } catch {}
  };
  removeWebdriver(navigator);
  removeWebdriver(Object.getPrototypeOf(navigator));
  removeWebdriver(Navigator.prototype);
  if (typeof WorkerNavigator !== 'undefined') {
    removeWebdriver(WorkerNavigator.prototype);
  }
})();`;
}

/** #2 CSS.supports('border-end-end-radius: initial') 探针中和 — CreepJS */
function patchCssSupportsWebdriverHeuristic(): string {
  return `(function(){
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return;
  const nativeSupports = CSS.supports.bind(CSS);
  const normalize = (value) => String(value).replace(/\\s+/g, ' ').trim().toLowerCase();
  const target = 'border-end-end-radius: initial';
  const patchedSupports = function(...args) {
    if (args.length === 1 && normalize(args[0]) === target) {
      return false;
    }
    if (args.length >= 2 && normalize(args[0] + ': ' + args[1]) === target) {
      return false;
    }
    return nativeSupports(...args);
  };
  try {
    Object.defineProperty(patchedSupports, 'name', { value: 'supports', configurable: true });
    Object.defineProperty(patchedSupports, 'toString', {
      value: () => nativeSupports.toString(),
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(CSS, 'supports', {
      value: patchedSupports,
      configurable: true,
      writable: true,
    });
  } catch {
    try { CSS.supports = patchedSupports; } catch {}
  }
})();`;
}

/** #3 补全 window.chrome.runtime — headless Chrome 缺失此属性 */
function patchChromeRuntime(): string {
  return `(function(){
  const chromeObject = ('chrome' in window && window.chrome) ? window.chrome : {};
  if (!('chrome' in window)) {
    try {
      Object.defineProperty(Window.prototype, 'chrome', {
        get: () => chromeObject,
        configurable: true,
      });
    } catch {
      try { Object.defineProperty(window, 'chrome', { value: chromeObject, configurable: true }); } catch {}
    }
  }
  if (!chromeObject.runtime) {
    const makeEvent = () => ({
      addListener: () => {},
      removeListener: () => {},
      hasListener: () => false,
      hasListeners: () => false,
      dispatch: () => {},
    });
    const makePort = () => ({
      name: '',
      sender: undefined,
      disconnect: () => {},
      onDisconnect: makeEvent(),
      onMessage: makeEvent(),
      postMessage: () => {},
    });
    const runtime = {
      id: undefined,
      connect: () => makePort(),
      sendMessage: () => undefined,
      onConnect: makeEvent(),
      onMessage: makeEvent(),
    };
    Object.defineProperty(chromeObject, 'runtime', {
      value: runtime,
      configurable: true,
    });
  }
})();`;
}

/** #4 对齐 navigator.language/languages 到 launch locale */
function patchNavigatorLanguages(): string {
  return `(function(){
  const config = (typeof __abStealth === 'object' && __abStealth) ? __abStealth : null;
  if (!config || !Array.isArray(config.languages) || config.languages.length === 0) return;
  const locale = typeof config.locale === 'string' ? config.locale : config.languages[0];
  try {
    Object.defineProperty(navigator, 'language', {
      get: () => locale,
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(navigator, 'languages', {
      get: () => config.languages.slice(),
      configurable: true,
    });
  } catch {}
})();`;
}

/** #5 注入 navigator.plugins/mimeTypes — headless 报告空数组 */
function patchNavigatorPluginsAndMimeTypes(): string {
  return `(function(){
  const makeMimeType = (type, suffixes, description) => {
    const mime = Object.create(MimeType.prototype);
    Object.defineProperties(mime, {
      type: { value: type, enumerable: true },
      suffixes: { value: suffixes, enumerable: true },
      description: { value: description, enumerable: true },
      enabledPlugin: { value: null, writable: true, enumerable: true },
    });
    return mime;
  };

  const makePlugin = (name, description, filename, mimes) => {
    const plugin = Object.create(Plugin.prototype);
    Object.defineProperties(plugin, {
      name: { value: name, enumerable: true },
      description: { value: description, enumerable: true },
      filename: { value: filename, enumerable: true },
      length: { value: mimes.length, enumerable: true },
    });
    mimes.forEach((mime, i) => {
      Object.defineProperty(plugin, i, {
        value: mime,
        enumerable: true,
      });
      Object.defineProperty(plugin, mime.type, {
        value: mime,
        enumerable: false,
      });
      try { mime.enabledPlugin = plugin; } catch {}
    });
    return plugin;
  };

  const pdfMime = makeMimeType('application/pdf', 'pdf', 'Portable Document Format');
  const chromePdfMime = makeMimeType(
    'application/x-google-chrome-pdf',
    'pdf',
    'Portable Document Format'
  );
  const naclMime = makeMimeType('application/x-nacl', '', 'Native Client Executable');
  const pnaclMime = makeMimeType('application/x-pnacl', '', 'Portable Native Client Executable');

  const plugins = [
    makePlugin('Chrome PDF Plugin', 'Portable Document Format', 'internal-pdf-viewer', [chromePdfMime]),
    makePlugin('Chrome PDF Viewer', '', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', [pdfMime]),
    makePlugin('Native Client', '', 'internal-nacl-plugin', [naclMime, pnaclMime]),
  ];
  const pluginArray = Object.create(PluginArray.prototype);
  plugins.forEach((p, i) => {
    pluginArray[i] = p;
    pluginArray[p.name] = p;
  });
  Object.defineProperty(pluginArray, 'length', { get: () => plugins.length });
  pluginArray.item = (i) => plugins[i] || null;
  pluginArray.namedItem = (name) => plugins.find(p => p.name === name) || null;
  pluginArray.refresh = () => {};
  pluginArray[Symbol.iterator] = function*() { for (const p of plugins) yield p; };

  const mimeTypes = [chromePdfMime, pdfMime, naclMime, pnaclMime];
  const mimeTypeArray = Object.create(MimeTypeArray.prototype);
  mimeTypes.forEach((m, i) => {
    mimeTypeArray[i] = m;
    mimeTypeArray[m.type] = m;
  });
  Object.defineProperty(mimeTypeArray, 'length', { get: () => mimeTypes.length });
  mimeTypeArray.item = (i) => mimeTypes[i] || null;
  mimeTypeArray.namedItem = (name) => mimeTypes.find(m => m.type === name) || null;
  mimeTypeArray[Symbol.iterator] = function*() { for (const m of mimeTypes) yield m; };

  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray,
    configurable: true,
  });
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => mimeTypeArray,
    configurable: true,
  });
})();`;
}

/** #6 修正 navigator.permissions.query({name:'notifications'}) */
function patchNavigatorPermissions(): string {
  return `(function(){
  if (!navigator.permissions || !navigator.permissions.query) return;
  const origQuery = navigator.permissions.query.bind(navigator.permissions);
  const makePermissionStatus = (state) => {
    if (typeof PermissionStatus !== 'undefined') {
      const status = Object.create(PermissionStatus.prototype);
      Object.defineProperty(status, 'state', {
        value: state,
        writable: false,
        enumerable: true,
      });
      Object.defineProperty(status, 'onchange', {
        value: null,
        writable: true,
        enumerable: true,
      });
      return status;
    }
    return { state, onchange: null };
  };
  const patchedQuery = new Proxy(origQuery, {
    apply(target, thisArg, argList) {
      const params = argList && argList[0];
      if (params && params.name === 'notifications') {
        const state = (typeof Notification !== 'undefined' && Notification.permission) || 'default';
        return Promise.resolve(makePermissionStatus(state));
      }
      return Reflect.apply(target, navigator.permissions, argList);
    }
  });
  try {
    Object.defineProperty(navigator.permissions, 'query', {
      value: patchedQuery,
      configurable: true,
      writable: true,
    });
  } catch {}
})();`;
}

/** #7 WebGL vendor/renderer 替换 — SwiftShader 指纹 */
function patchWebGLVendor(): string {
  return `(function(){
  const getCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    const ctx = getCtx.call(this, type, attrs);
    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
      const origGetParameter = ctx.getParameter.bind(ctx);
      ctx.getParameter = function(param) {
        const ext = ctx.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          if (param === ext.UNMASKED_VENDOR_WEBGL) {
            const real = origGetParameter(param);
            return (real && real.includes('SwiftShader')) ? 'Intel Inc.' : real;
          }
          if (param === ext.UNMASKED_RENDERER_WEBGL) {
            const real = origGetParameter(param);
            return (real && real.includes('SwiftShader')) ? 'Intel Iris OpenGL Engine' : real;
          }
        }
        return origGetParameter(param);
      };
    }
    return ctx;
  };
})();`;
}

/** #8 清理 cdc_ 属性 — Chrome DevTools 属性检测 */
function patchCdcProperties(): string {
  return `(function(){
  const clean = (target) => {
    for (const key of Object.keys(target)) {
      if (/^cdc_|^\\$cdc_/.test(key)) {
        delete target[key];
      }
    }
  };
  clean(document);
  if (document.documentElement) clean(document.documentElement);
})();`;
}

/** #9 window 尺寸修正 — 窗口 == 视口检测 */
function patchWindowDimensions(): string {
  return `(function(){
  const widthDelta = 12;
  const heightDelta = 74;
  const patchWidth =
    !Number.isFinite(window.outerWidth) ||
    window.outerWidth === 0 ||
    Math.abs(window.outerWidth - window.innerWidth) <= 1;
  const patchHeight =
    !Number.isFinite(window.outerHeight) ||
    window.outerHeight === 0 ||
    Math.abs(window.outerHeight - window.innerHeight) <= 1;
  if (patchWidth) {
    try {
      Object.defineProperty(window, 'outerWidth', {
        get: () => Math.max(window.innerWidth + widthDelta, window.innerWidth),
        configurable: true,
      });
    } catch {}
  }
  if (patchHeight) {
    try {
      Object.defineProperty(window, 'outerHeight', {
        get: () => Math.max(window.innerHeight + heightDelta, window.innerHeight),
        configurable: true,
      });
    } catch {}
  }
  const patchScreenPosition =
    (!Number.isFinite(window.screenX) || !Number.isFinite(window.screenY)) ||
    (window.screenX === 0 && window.screenY === 0 && (patchWidth || patchHeight));
  if (patchScreenPosition) {
    try {
      Object.defineProperty(window, 'screenX', {
        get: () => 16,
        configurable: true,
      });
      Object.defineProperty(window, 'screenY', {
        get: () => 72,
        configurable: true,
      });
      Object.defineProperty(window, 'screenLeft', {
        get: () => 16,
        configurable: true,
      });
      Object.defineProperty(window, 'screenTop', {
        get: () => 72,
        configurable: true,
      });
    } catch {}
  }
})();`;
}

/** #10 screen 尺寸修正 — 避免 screen == viewport 指纹 */
function patchScreenDimensions(): string {
  return `(function(){
  const patchNumber = (target, key, value) => {
    try {
      Object.defineProperty(target, key, {
        get: () => value,
        configurable: true,
      });
    } catch {}
  };
  const width = Number(screen.width);
  const height = Number(screen.height);
  const innerWidth = Number(window.innerWidth);
  const innerHeight = Number(window.innerHeight);
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Number.isFinite(innerWidth) &&
    Number.isFinite(innerHeight) &&
    width === innerWidth &&
    height === innerHeight
  ) {
    patchNumber(screen, 'width', Math.max(innerWidth + 86, 1366));
    patchNumber(screen, 'height', Math.max(innerHeight + 48, 768));
  }
})();`;
}

/** #11 screen 可用区域修正 — 模拟任务栏/菜单栏 */
function patchScreenAvailability(): string {
  return `(function(){
  const patchNumber = (target, key, value) => {
    try {
      Object.defineProperty(target, key, {
        get: () => value,
        configurable: true,
      });
    } catch {}
  };
  const availWidth = Number(screen.availWidth);
  const availHeight = Number(screen.availHeight);
  const width = Number(screen.width);
  const height = Number(screen.height);
  if (Number.isFinite(width) && Number.isFinite(availWidth) && availWidth >= width) {
    patchNumber(screen, 'availWidth', Math.max(width - 8, 0));
  }
  if (Number.isFinite(height) && Number.isFinite(availHeight) && availHeight >= height) {
    patchNumber(screen, 'availHeight', Math.max(height - 40, 0));
  }
  if (Number.isFinite(screen.availLeft) && screen.availLeft === 0) {
    patchNumber(screen, 'availLeft', 0);
  }
  if (Number.isFinite(screen.availTop) && screen.availTop === 0) {
    patchNumber(screen, 'availTop', 24);
  }
})();`;
}

/** #12 hardwareConcurrency 修正 — CI 环境常报 2 核 */
function patchNavigatorHardwareConcurrency(): string {
  return `(function(){
  if (navigator.hardwareConcurrency < 4) {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 4,
      configurable: true,
    });
  }
})();`;
}

/** #13 Notification 权限修正 */
function patchNotificationPermission(): string {
  return `(function(){
  if (typeof Notification === 'undefined') return;
  const current = Notification.permission;
  if (current === 'granted') return;
  try {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
      configurable: true,
    });
  } catch {}
})();`;
}

/** #14 ActiveText 颜色修正 — CreepJS 颜色探针 */
function patchActiveTextColorHeuristic(): string {
  return `(function(){
  if (typeof Element === 'undefined' || !Element.prototype) return;
  const nativeSetAttribute = Element.prototype.setAttribute;
  if (typeof nativeSetAttribute !== 'function') return;
  const normalize = (value) => String(value).replace(/\\s+/g, ' ').trim().toLowerCase();
  const probeStyle = 'background-color: activetext';
  const replacement = 'background-color: rgb(0, 0, 0)';
  const patchedSetAttribute = function(name, value) {
    if (String(name).toLowerCase() === 'style' && normalize(value) === probeStyle) {
      return nativeSetAttribute.call(this, name, replacement);
    }
    return nativeSetAttribute.call(this, name, value);
  };
  try {
    Object.defineProperty(patchedSetAttribute, 'name', {
      value: 'setAttribute',
      configurable: true,
    });
    Object.defineProperty(patchedSetAttribute, 'toString', {
      value: () => nativeSetAttribute.toString(),
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(Element.prototype, 'setAttribute', {
      value: patchedSetAttribute,
      configurable: true,
      writable: true,
    });
  } catch {
    try { Element.prototype.setAttribute = patchedSetAttribute; } catch {}
  }
})();`;
}

/** #15 connection.downlinkMax 补全 */
function patchNavigatorConnection(): string {
  return `(function(){
  if (!navigator.connection) return;
  const conn = navigator.connection;
  if (typeof conn.downlinkMax === 'number') return;
  const defineDownlinkMax = (target) => {
    if (!target) return false;
    try {
      Object.defineProperty(target, 'downlinkMax', {
        get: () => 10,
        configurable: true,
      });
      return true;
    } catch {
      return false;
    }
  };
  try {
    const proto = Object.getPrototypeOf(conn);
    if (defineDownlinkMax(proto)) {
      try { delete conn.downlinkMax; } catch {}
      return;
    }
  } catch {}
  defineDownlinkMax(conn);
})();`;
}

/** #16 Worker 中 connection.downlinkMax 补全 */
function patchWorkerConnection(): string {
  return `(function(){
  if (typeof Worker !== 'function') return;
  const NativeWorker = Worker;
  const workerPrelude = \`
(() => {
  try {
    if (!navigator || !navigator.connection) return;
    const conn = navigator.connection;
    if (typeof conn.downlinkMax === 'number') return;
    const defineDownlinkMax = (target) => {
      if (!target) return false;
      try {
        Object.defineProperty(target, 'downlinkMax', {
          get: () => 10,
          configurable: true,
        });
        return true;
      } catch {
        return false;
      }
    };
    try {
      const proto = Object.getPrototypeOf(conn);
      if (defineDownlinkMax(proto)) {
        try { delete conn.downlinkMax; } catch {}
        return;
      }
    } catch {}
    defineDownlinkMax(conn);
  } catch {}
})();
\`;
  const buildPatchedScript = (url, options) => {
    const scriptUrl = String(url);
    const isModule = options && options.type === 'module';
    const loader = isModule
      ? \`import \${JSON.stringify(scriptUrl)};\`
      : \`importScripts(\${JSON.stringify(scriptUrl)});\`;
    return \`\${workerPrelude}\\n\${loader}\`;
  };
  const WrappedWorker = function(scriptURL, options) {
    try {
      const source = buildPatchedScript(scriptURL, options);
      const blob = new Blob([source], { type: 'application/javascript' });
      const patchedUrl = URL.createObjectURL(blob);
      return new NativeWorker(patchedUrl, options);
    } catch {
      return new NativeWorker(scriptURL, options);
    }
  };
  WrappedWorker.prototype = NativeWorker.prototype;
  try {
    Object.setPrototypeOf(WrappedWorker, NativeWorker);
  } catch {}
  try {
    Object.defineProperty(WrappedWorker, 'name', { value: 'Worker', configurable: true });
  } catch {}
  try {
    Object.defineProperty(WrappedWorker, 'toString', {
      value: () => NativeWorker.toString(),
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(window, 'Worker', {
      value: WrappedWorker,
      configurable: true,
      writable: true,
    });
  } catch {}
})();`;
}

/** #17 navigator.share/canShare 补全 */
function patchNavigatorShare(): string {
  return `(function(){
  if (typeof navigator.share !== 'function') {
    try {
      Object.defineProperty(navigator, 'share', {
        value: async () => undefined,
        configurable: true,
      });
    } catch {}
  }
  if (typeof navigator.canShare !== 'function') {
    try {
      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
      });
    } catch {}
  }
})();`;
}

/** #18 Contacts Manager 补全 */
function patchNavigatorContacts(): string {
  return `(function(){
  const ContactsCtor = typeof ContactsManager === 'function'
    ? ContactsManager
    : function ContactsManager() {};
  try {
    Object.defineProperty(window, 'ContactsManager', {
      value: ContactsCtor,
      configurable: true,
    });
  } catch {}
  const manager = Object.create(ContactsCtor.prototype || Object.prototype);
  if (typeof manager.select !== 'function') {
    manager.select = async () => [];
  }
  if (typeof manager.getProperties !== 'function') {
    manager.getProperties = () => ['name', 'email', 'tel', 'address', 'icon'];
  }
  const defineContacts = (target) => {
    if (!target) return false;
    try {
      Object.defineProperty(target, 'contacts', {
        get: () => manager,
        configurable: true,
      });
      return true;
    } catch {
      return false;
    }
  };
  if (defineContacts(navigator)) return;
  try {
    defineContacts(Object.getPrototypeOf(navigator));
  } catch {}
})();`;
}

/** #19 ContentIndex API 补全 */
function patchContentIndex(): string {
  return `(function(){
  const ContentIndexCtor = typeof ContentIndex === 'function'
    ? ContentIndex
    : function ContentIndex() {};
  try {
    Object.defineProperty(window, 'ContentIndex', {
      value: ContentIndexCtor,
      configurable: true,
    });
  } catch {}
  const index = Object.create(ContentIndexCtor.prototype || Object.prototype);
  if (typeof index.add !== 'function') {
    index.add = async () => undefined;
  }
  if (typeof index.delete !== 'function') {
    index.delete = async () => undefined;
  }
  if (typeof index.getAll !== 'function') {
    index.getAll = async () => [];
  }
  if (typeof ServiceWorkerRegistration === 'undefined') return;
  const defineIndex = (key) => {
    try {
      Object.defineProperty(ServiceWorkerRegistration.prototype, key, {
        get: () => index,
        configurable: true,
      });
      return true;
    } catch {
      return false;
    }
  };
  if (!('contentIndex' in ServiceWorkerRegistration.prototype)) {
    defineIndex('contentIndex');
  }
  if (!('index' in ServiceWorkerRegistration.prototype)) {
    defineIndex('index');
  }
})();`;
}

/** #20 prefers-color-scheme 中和 — CreepJS 弱信号 */
function patchPrefersColorSchemeHeuristic(): string {
  return `(function(){
  if (typeof window.matchMedia !== 'function') return;
  const nativeMatchMedia = window.matchMedia.bind(window);
  const normalize = (query) => String(query).replace(/\\s+/g, ' ').trim().toLowerCase();
  const prefersLight = '(prefers-color-scheme: light)';
  const patchMediaQueryList = (mql) => {
    if (!mql || typeof mql !== 'object') return mql;
    return new Proxy(mql, {
      get(target, prop, receiver) {
        if (prop === 'matches') return false;
        return Reflect.get(target, prop, receiver);
      },
    });
  };
  const patchedMatchMedia = function(query) {
    const mql = nativeMatchMedia(query);
    if (normalize(query) === prefersLight) {
      return patchMediaQueryList(mql);
    }
    return mql;
  };
  try {
    Object.defineProperty(patchedMatchMedia, 'name', { value: 'matchMedia', configurable: true });
    Object.defineProperty(patchedMatchMedia, 'toString', {
      value: () => nativeMatchMedia.toString(),
      configurable: true,
    });
  } catch {}
  try {
    Object.defineProperty(window, 'matchMedia', {
      value: patchedMatchMedia,
      configurable: true,
      writable: true,
    });
  } catch {
    try { window.matchMedia = patchedMatchMedia; } catch {}
  }
})();`;
}

/** #21 pdfViewerEnabled 补全 */
function patchPdfViewerEnabled(): string {
  return `(function(){
  if (navigator.pdfViewerEnabled === true) return;
  try {
    Object.defineProperty(navigator, 'pdfViewerEnabled', {
      get: () => true,
      configurable: true,
    });
  } catch {}
})();`;
}

/** #22 mediaDevices.enumerateDevices 补全 — 避免空设备列表 */
function patchMediaDevices(): string {
  return `(function(){
  if (!navigator.mediaDevices) return;
  const orig = navigator.mediaDevices.enumerateDevices;
  if (!orig) return;
  navigator.mediaDevices.enumerateDevices = async function() {
    const devices = await orig.call(navigator.mediaDevices);
    if (devices.length === 0) {
      return [
        { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'default' },
        { deviceId: 'default', kind: 'videoinput', label: '', groupId: 'default' },
        { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'default' },
      ];
    }
    return devices;
  };
})();`;
}

/** #23 userAgentData brands 清理 — HeadlessChrome 标记 */
function patchUserAgentData(): string {
  return `(function(){
  const uaData = navigator.userAgentData;
  if (!uaData) return;
  const sanitizeBrand = (brand) => {
    if (typeof brand !== 'string') return brand;
    return brand.replace(/HeadlessChrome/gi, 'Google Chrome');
  };
  const patchBrandList = (value) => {
    if (!Array.isArray(value)) return value;
    return value.map((entry) => ({
      ...entry,
      brand: sanitizeBrand(entry.brand),
    }));
  };
  const patched = Object.create(Object.getPrototypeOf(uaData));
  Object.defineProperties(patched, {
    brands: {
      get: () => patchBrandList(uaData.brands),
      enumerable: true,
    },
    mobile: {
      get: () => uaData.mobile,
      enumerable: true,
    },
    platform: {
      get: () => uaData.platform,
      enumerable: true,
    },
  });
  patched.toJSON = () => ({
    brands: patchBrandList(uaData.brands),
    mobile: uaData.mobile,
    platform: uaData.platform,
  });
  patched.getHighEntropyValues = async (hints) => {
    const values = await uaData.getHighEntropyValues(hints);
    if (values && typeof values === 'object') {
      if ('brands' in values) values.brands = patchBrandList(values.brands);
      if ('fullVersionList' in values) {
        values.fullVersionList = patchBrandList(values.fullVersionList);
      }
    }
    return values;
  };
  try {
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => patched,
      configurable: true,
    });
  } catch {}
})();`;
}

/** #24 navigator.userAgent 中 HeadlessChrome → Chrome */
function patchUserAgent(): string {
  return `(function(){
  const ua = navigator.userAgent;
  if (ua.includes('HeadlessChrome')) {
    const patched = ua.replace(/HeadlessChrome/g, 'Chrome');
    Object.defineProperty(navigator, 'userAgent', {
      get: () => patched,
      configurable: true,
    });
    Object.defineProperty(navigator, 'appVersion', {
      get: () => patched.replace('Mozilla/', ''),
      configurable: true,
    });
  }
})();`;
}

/** #25 performance.memory 补全 — headless 缺失此非标准属性 */
function patchPerformanceMemory(): string {
  return `(function(){
  if (!performance.memory) {
    Object.defineProperty(performance, 'memory', {
      get: () => ({
        jsHeapSizeLimit: 2172649472,
        totalJSHeapSize: 35839739,
        usedJSHeapSize: 22592767,
      }),
      configurable: true,
    });
  }
})();`;
}

/** #26 默认背景色修正 — headless 透明背景检测 */
function patchDefaultBackgroundColor(): string {
  return `(function(){
  if (document.documentElement) {
    const style = getComputedStyle(document.documentElement);
    const bg = style.backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
      document.documentElement.style.backgroundColor = 'rgb(255, 255, 255)';
    }
  }
})();`;
}
