import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 * 处理条件类名和重复类名
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
