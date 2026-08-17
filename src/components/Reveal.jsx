import { useInView } from '../hooks/useInView';

/**
 * Scroll-reveal wrapper. Children start hidden + slightly shifted and
 * settle ONCE when scrolled into view. Fully static under
 * `prefers-reduced-motion` (handled in CSS — see `.reveal`).
 *
 * variant: '' (up) | 'left' | 'right' | 'scale'
 * delay:   stagger in ms (applied only while animating in)
 */
export default function Reveal({
  as: Tag = 'div',
  variant = '',
  delay = 0,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const [ref, inView] = useInView();
  const variantClass = variant ? `reveal-${variant}` : '';

  return (
    <Tag
      ref={ref}
      className={`reveal ${variantClass} ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms', ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
