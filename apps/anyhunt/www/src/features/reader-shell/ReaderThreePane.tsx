/**
 * [PROPS]: list, detail
 * [POS]: Reader 三栏布局（SidePanel + List + Detail）
 */

import type { ReactNode } from 'react';
import { ReaderShell } from './ReaderShell';

interface ReaderThreePaneProps {
  list: ReactNode;
  detail: ReactNode;
}

export function ReaderThreePane({ list, detail }: ReaderThreePaneProps) {
  return <ReaderShell layout="three-pane" list={list} detail={detail} />;
}
