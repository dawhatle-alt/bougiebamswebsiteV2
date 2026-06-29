import React, { CSSProperties, ReactNode, HTMLAttributes } from 'react';

type AnimationMode = 'auto-rotate' | 'rotate-on-hover' | 'stop-rotate-on-hover';

interface BorderRotateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  className?: string;
  animationMode?: AnimationMode;
  animationSpeed?: number;
  gradientColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  backgroundColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  style?: CSSProperties;
}

const defaultGradientColors = {
  primary: '#584827',
  secondary: '#c7a03c',
  accent: '#f9de90',
};

const BorderRotate: React.FC<BorderRotateProps> = ({
  children,
  className = '',
  animationMode = 'auto-rotate',
  animationSpeed = 5,
  gradientColors = defaultGradientColors,
  backgroundColor = '#2d230f',
  borderWidth = 2,
  borderRadius = 20,
  style = {},
  ...props
}) => {
  const getSpinClass = () => {
    switch (animationMode) {
      case 'auto-rotate':
        return 'spin-auto';
      case 'rotate-on-hover':
        return 'spin-on-hover';
      case 'stop-rotate-on-hover':
        return 'spin-stop-on-hover';
      default:
        return '';
    }
  };

  const outerStyle = {
    position: 'relative',
    borderRadius: `${borderRadius}px`,
    backgroundColor,
    ...style,
  } as CSSProperties;

  const ringStyle = {
    position: 'absolute',
    inset: 0,
    zIndex: 30,
    pointerEvents: 'none',
    borderRadius: `${borderRadius}px`,
    padding: `${borderWidth}px`,
    overflow: 'hidden',
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
  } as CSSProperties;

  const spinnerStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200%',
    aspectRatio: '1 / 1',
    animationDuration: `${animationSpeed}s`,
    backgroundImage: `conic-gradient(
      from 0deg,
      ${gradientColors.secondary} 0deg,
      ${gradientColors.primary} 100deg,
      ${gradientColors.secondary} 200deg,
      ${gradientColors.accent} 270deg,
      ${gradientColors.secondary} 340deg,
      ${gradientColors.secondary} 360deg
    )`,
  } as CSSProperties;

  return (
    <div
      className={`gradient-border-component ${className}`}
      style={outerStyle}
      {...props}
    >
      {children}
      <div className="gb-ring" style={ringStyle} aria-hidden="true">
        <div className={`gb-spinner ${getSpinClass()}`} style={spinnerStyle} />
      </div>
    </div>
  );
};

export { BorderRotate };
