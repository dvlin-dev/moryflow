import { isValid as mailCheckerIsValid } from 'mailchecker';

/**
 * 硬编码补充黑名单
 * 用于添加 mailchecker 未收录的临时邮箱域名
 */
const EXTRA_BLOCKED_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.org',
  'temp-mail.org',
  'temp-mail.io',
  'mail.tm',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'yopmail.com',
  'emailondeck.com',
  'mohmal.com',
  'crazymailing.com',
  'trashmail.com',
  'trashspam.com',
  'getnada.com',
  'inboxbear.com',
  'throwaway.email',
]);

/**
 * 检查邮箱是否为临时邮箱
 * @param email 邮箱地址
 * @returns true 表示是临时邮箱，false 表示正常邮箱
 */
export function isDisposableEmail(email: string): boolean {
  // mailchecker 返回 false 表示是临时邮箱或格式无效
  if (!mailCheckerIsValid(email)) {
    return true;
  }

  // 检查硬编码补充黑名单
  const domain = email.split('@')[1].toLowerCase();
  return EXTRA_BLOCKED_DOMAINS.has(domain);
}
