import { useState, useEffect, useRef } from 'react';

/**
 * One-shot in-view detector for scroll-reveal / count-up.
 * Returns [ref, inView]. Once an element has been seen it stays `true`
 * (unless `once: false`). Degrades gracefully to visible when
 * IntersectionObserver is unavailable (SSR / very old browsers).
 */
export function useInView({ threshold = 0.15, rootMargin = '0px 0px -40px 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
