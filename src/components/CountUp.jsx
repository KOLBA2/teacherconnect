import { useState, useEffect } from 'react';
import { useInView, prefersReducedMotion } from '../hooks/useInView';

/**
 * Count-up number that animates from 0 → `end` ONCE, the first time it
 * scrolls into view. Respects reduced-motion (jumps straight to the
 * final value). One-shot only — never loops.
 */
export default function CountUp({
  end,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (prefersReducedMotion() || duration <= 0) {
      setValue(end);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US');

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
