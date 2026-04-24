// RetroButton.jsx — beveled Win95 button with consistent hover/active/focus states.
//
// Replaces the inline `RetroButton` defined at the top of LimitedPartnerPortal.jsx
// and the ~200 raw <button style={{...}}> repetitions scattered across the admin
// panel. All styling lives in .win95-btn / .win95-btn-primary / .win95-btn-danger
// utility classes in win95-base.css so hover/active/focus states are guaranteed.

import React from 'react';

const VARIANT_CLASSES = {
  default: 'win95-btn',
  primary: 'win95-btn win95-btn-primary',
  danger:  'win95-btn win95-btn-danger',
};

function sizeStyle(size) {
  switch (size) {
    case 'sm':
      return { padding: '5px 12px', fontSize: '12px' };
    case 'lg':
      return { padding: '12px 22px', fontSize: '14px' };
    default:
      return null;
  }
}

const RetroButton = React.forwardRef(function RetroButton(
  {
    children,
    onClick,
    type = 'button',
    variant,
    primary = false, // legacy prop kept so existing call sites (`primary`) keep working
    size = 'md',
    disabled = false,
    title,
    ariaLabel,
    className = '',
    style,
    ...rest
  },
  ref,
) {
  const resolvedVariant = variant || (primary ? 'primary' : 'default');
  const variantClass = VARIANT_CLASSES[resolvedVariant] || VARIANT_CLASSES.default;
  const finalClass = className ? `${variantClass} ${className}` : variantClass;
  const merged = { ...sizeStyle(size), ...(style || {}) };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={finalClass}
      style={merged}
      {...rest}
    >
      {children}
    </button>
  );
});

export default RetroButton;
