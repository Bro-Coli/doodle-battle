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
  deepShadowColor?: string;
  deepShadowOffsetY?: string;
  deepShadowStrokeWidth?: number;
  deepShadowBlur?: string;
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
  deepShadowColor,
  deepShadowOffsetY,
  deepShadowStrokeWidth,
  deepShadowBlur,
}: StrokeShadowTextProps) {
  const firstStrokeStyle: CSSProperties = {
    WebkitTextStroke: `${firstStrokeWidth}px ${firstStrokeColor}`,
  };

  const secondStrokeStyle: CSSProperties = {
    WebkitTextStroke: `${secondStrokeWidth}px ${secondStrokeColor}`,
  };

  const deepShadowStyle: CSSProperties | undefined = deepShadowColor
    ? {
        WebkitTextStroke: `${deepShadowStrokeWidth ?? firstStrokeWidth}px ${deepShadowColor}`,
        transform: `translateY(${deepShadowOffsetY ?? '0.5rem'})`,
        filter: deepShadowBlur ? `blur(${deepShadowBlur})` : undefined,
      }
    : undefined;

  return (
    <span className="relative inline-flex items-center justify-center">
      {deepShadowStyle && (
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 text-center uppercase text-transparent', className)}
          style={deepShadowStyle}
        >
          {children}
        </span>
      )}
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
