import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type StrokeShadowTextProps = {
  children: ReactNode;
  className?: string;
  fillClassName?: string;
  fillStyle?: CSSProperties;
  firstStrokeColor: string;
  secondStrokeColor: string;
  firstStrokeWidth?: number;
  secondStrokeWidth?: number;
  shadowOffsetY?: string;
};

export function StrokeShadowText({
  children,
  className,
  fillClassName,
  fillStyle,
  firstStrokeColor,
  secondStrokeColor,
  firstStrokeWidth = 8,
  secondStrokeWidth = 8,
  shadowOffsetY = '0.25rem',
}: StrokeShadowTextProps) {
  const firstStrokeStyle: CSSProperties = {
    WebkitTextStroke: `${firstStrokeWidth}px ${firstStrokeColor}`,
  };

  const secondStrokeStyle: CSSProperties = {
    WebkitTextStroke: `${secondStrokeWidth}px ${secondStrokeColor}`,
  };

  return (
    <span className="relative inline-flex items-center justify-center">
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 text-center uppercase text-transparent', className)}
        style={{
          ...firstStrokeStyle,
          transform: `translateY(${shadowOffsetY})`,
        }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 text-center uppercase text-transparent', className)}
        style={secondStrokeStyle}
      >
        {children}
      </span>
      <span
        className={cn('relative text-center uppercase text-white', className, fillClassName)}
        style={fillStyle}
      >
        {children}
      </span>
    </span>
  );
}
