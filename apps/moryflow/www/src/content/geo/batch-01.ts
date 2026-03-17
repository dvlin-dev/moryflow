import type { GeoArticle } from '@/lib/geo-articles';
import { part1 } from './batch-01-part1';
import { part2 } from './batch-01-part2';

export const batch01: GeoArticle[] = [...part1, ...part2];
