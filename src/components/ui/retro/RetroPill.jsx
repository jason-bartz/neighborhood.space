// RetroPill.jsx — compact status / role pill.
//
// Wraps the `.retro-pill` CSS class with tone variants. Use for:
//   - role labels ("Chapter Director", "LP")
//   - pitch review outcomes ("Favorite", "Ineligible")
//   - pitch pipeline status ("Grant Winner", "Needs Review")

import React from 'react';

const TONE_CLASSES = {
  default: 'retro-pill',
  pink:    'retro-pill retro-pill--pink',
  blue:    'retro-pill retro-pill--blue',
  green:   'retro-pill retro-pill--green',
  yellow:  'retro-pill retro-pill--yellow',
  purple:  'retro-pill retro-pill--purple',
  error:   'retro-pill retro-pill--error',
  warn:    'retro-pill retro-pill--warn',
};

export default function RetroPill({
  children,
  tone = 'default',
  icon,
  title,
  className = '',
}) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.default;
  const finalClass = className ? `${toneClass} ${className}` : toneClass;
  return (
    <span className={finalClass} title={title}>
      {icon != null && (
        <span aria-hidden="true" className="retro-pill__icon">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
