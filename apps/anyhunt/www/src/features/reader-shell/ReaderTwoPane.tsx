/**
 * [PROPS]: children
 * [POS]: Reader 两栏布局（SidePanel + Main）
 */

import type { ReactNode } from 'react';
import { ReaderShell } from './ReaderShell';

interface ReaderTwoPaneProps {
  children: ReactNode;
}

export function ReaderTwoPane({ children }: ReaderTwoPaneProps) {
  return <ReaderShell layout="two-pane" detail={children} />;
}
