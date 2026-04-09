import { cloneElement } from 'react';
import { iconDefinitions } from './icons/index';
import type { IconProps } from './icon.defs';

export function Icon({
  className,
  color = 'currentColor',
  decorative = true,
  name,
  secondColor,
  size = '1em',
  strokeWidth,
  title,
  style,
  ...props
}: IconProps): React.JSX.Element {
  const definition = iconDefinitions[name];
  const resolvedStrokeWidth = strokeWidth ?? definition.defaultProps?.strokeWidth ?? 3;
  const resolvedSecondColor = secondColor ?? definition.secondColor ?? definition.defaultProps?.secondColor;
  const content = Array.isArray(definition.element)
    ? definition.element.map((element, index) => cloneElement(element, { key: element.key ?? index }))
    : definition.element;

  return (
    <svg
      viewBox={definition.viewBox ?? '0 0 64 64'}
      width={size}
      height={size}
      className={className}
      style={{
        ...style,
        color,
        ['--icon-accent' as string]: resolvedSecondColor,
        ['--icon-stroke-width' as string]: String(resolvedStrokeWidth),
      }}
      aria-hidden={decorative}
      role={decorative ? undefined : 'img'}
      {...props}
    >
      {!decorative && title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
