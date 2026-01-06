/**
 * Site Module Constants
 * 站点模块常量
 *
 * [DEFINES]: Reserved subdomains, regex patterns, domain config
 * [USED_BY]: SiteService, SiteController, dto/site.schema.ts
 */

/** 保留的子域名列表 */
export const RESERVED_SUBDOMAINS = [
  'api',
  'admin',
  'www',
  'app',
  'dashboard',
  'preview',
  'static',
  'assets',
  'cdn',
  'mail',
  'email',
  'blog',
  'docs',
  'help',
  'support',
  'status',
  'auth',
  'login',
  'signup',
  'register',
  'account',
  'settings',
  'profile',
  'user',
  'users',
  'test',
  'dev',
  'staging',
  'prod',
  'production',
  'demo',
  'beta',
  'alpha',
  'internal',
  'private',
  'public',
  'official',
  'moryflow',
];

/** 子域名格式正则：3-32位小写字母、数字、连字符 */
export const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

/** 站点域名后缀 */
export const SITE_DOMAIN = 'moryflow.app';
