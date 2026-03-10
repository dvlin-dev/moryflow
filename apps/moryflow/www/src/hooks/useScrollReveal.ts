/**
 * [PROVIDES]: useScrollReveal — IntersectionObserver 驱动的入场动画
 * [DEPENDS]: globals.css scroll-reveal 动画类
 */

import { useEffect, useRef } from 'react';

type Animation = 'fade-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right';

interface ScrollRevealOptions {
  /** 动画类型 */
  animation?: Animation;
  /** 动画持续时间 (ms) */
  duration?: number;
  /** 延迟 (ms)，用于 stagger 效果 */
  delay?: number;
  /** IntersectionObserver threshold */
  threshold?: number;
}

/**
 * 为单个元素添加滚动入场动画。
 *
 * ```tsx
 * const ref = useScrollReveal<HTMLDivElement>({ animation: 'fade-up', delay: 100 });
 * return <div ref={ref}>...</div>;
 * ```
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { animation = 'fade-up', duration = 600, delay = 0, threshold = 0.1 } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add('scroll-reveal');
    el.dataset.animation = animation;
    el.style.animationDuration = `${duration}ms`;
    if (delay > 0) el.style.animationDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animation, duration, delay, threshold]);

  return ref;
}

/**
 * 为一组子元素添加 stagger 滚动入场动画。
 * 在父容器上使用，自动给 [data-reveal-item] 子元素添加阶梯延迟。
 *
 * ```tsx
 * const ref = useScrollRevealGroup<HTMLDivElement>({ stagger: 80 });
 * return (
 *   <div ref={ref}>
 *     <div data-reveal-item>A</div>
 *     <div data-reveal-item>B</div>
 *   </div>
 * );
 * ```
 */
export function useScrollRevealGroup<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions & { stagger?: number } = {}
) {
  const {
    animation = 'fade-up',
    duration = 600,
    delay = 0,
    stagger = 80,
    threshold = 0.1,
  } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>('[data-reveal-item]');
    items.forEach((item, i) => {
      item.classList.add('scroll-reveal');
      item.dataset.animation = animation;
      item.style.animationDuration = `${duration}ms`;
      item.style.animationDelay = `${delay + i * stagger}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          items.forEach((item) => item.classList.add('is-visible'));
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [animation, duration, delay, stagger, threshold]);

  return ref;
}
