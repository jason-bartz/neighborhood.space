// EmptyState.jsx — consistent "no data" panel for admin tabs.
//
// Renders an icon in a beveled Win95 frame plus a title and optional body.
// Pass an `action` slot to include a call-to-action button.

import React from 'react';

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  className = '',
}) {
  const finalClass = className ? `retro-empty ${className}` : 'retro-empty';
  return (
    <div className={finalClass} role="status">
      {icon && (
        <div className="retro-empty-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <div className="retro-empty-title">{title}</div>}
      {description && <div className="retro-empty-body">{description}</div>}
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  );
}
