/**
 * [PROVIDES]: Origin 匹配工具（支持通配符子域）
 * [DEPENDS]: 无
 * [POS]: CORS/CSRF/Origin 校验通用逻辑
 */

export const matchOrigin = (origin: string, pattern: string): boolean => {
  if (origin === pattern) {
    return true;
  }

  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace('*', '[a-zA-Z0-9-]+') + '$',
    );
    return regex.test(origin);
  }

  return false;
};
