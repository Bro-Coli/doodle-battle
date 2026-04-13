import type { CSSProperties } from 'react';
import { Icon } from '@/ui/icon/Icon';
import type { IconName } from '@/ui/icon/icon.defs';

interface NeonIconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  neonColor?: string;
  neonIntensity?: number;
  className?: string;
}

export function NeonIcon({
  name,
  size = 48,
  color = 'currentColor',
  neonColor = '#00BFFF',
  neonIntensity = 3,
  className,
}: NeonIconProps) {
  const glowStyle: CSSProperties = {
    filter: `
      drop-shadow(0 0 ${neonIntensity}px ${neonColor})
      drop-shadow(0 0 ${neonIntensity * 2}px ${neonColor})
      drop-shadow(0 0 ${neonIntensity * 3}px ${neonColor})
      drop-shadow(0 0 ${neonIntensity * 4}px ${neonColor})
    `,
  };

  return (
    <div style={glowStyle} className={className}>
      <Icon name={name} size={size} color={color} />
    </div>
  );
}
