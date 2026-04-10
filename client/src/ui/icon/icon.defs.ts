import type { ReactElement, SVGProps } from 'react';

export type IconName = 'close' | 'lightning' | 'plus' | 'search' | 'user';

export type IconSize = '1em' | '1rem' | 16 | 20 | 24 | 32 | 48 | 64 | number | string;

export interface IconBaseProps {
  className?: string;
  color?: string;
  secondColor?: string;
  size?: IconSize;
  strokeWidth?: SVGProps<SVGSVGElement>['strokeWidth'];
  title?: string;
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'color'>, IconBaseProps {
  decorative?: boolean;
  name: IconName;
}

export interface IconDefinition {
  defaultProps?: Partial<Pick<IconProps, 'color' | 'secondColor' | 'size' | 'strokeWidth'>>;
  element: ReactElement | ReactElement[] | null;
  name: IconName;
  secondColor?: IconProps['secondColor'];
  viewBox?: string;
}

export function defineIcon(definition: IconDefinition): IconDefinition {
  return definition;
}
