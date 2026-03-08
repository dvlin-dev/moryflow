/**
 * [PROVIDES]: useGraphContainerDimensions
 * [DEPENDS]: ResizeObserver, React hooks
 * [POS]: Graph 可视化容器尺寸同步 hook
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useRef, useState } from 'react';

interface GraphContainerDimensions {
  width: number;
  height: number;
}

export function useGraphContainerDimensions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<GraphContainerDimensions>({
    width: 600,
    height: 400,
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }

      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height: Math.max(400, height) });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return {
    containerRef,
    dimensions,
  };
}
