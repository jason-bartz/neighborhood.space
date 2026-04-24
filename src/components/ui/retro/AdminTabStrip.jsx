// AdminTabStrip.jsx — accessible tab navigation for the admin panel.
//
// Renders a tablist of buttons using the `.admin-tabstrip` / `.admin-tab`
// utility classes. The visual pattern mirrors `.mb-tabs` / `.mb-tab` on
// the public Neighborhood Navigator: a flat horizontal bar with a
// magenta-filled active tab and a pixel-font label. Each button gets
// `role="tab"`, `aria-selected`, and arrow-key navigation.

import React, { useCallback } from 'react';

export default function AdminTabStrip({ tabs, activeKey, onChange, ariaLabel = 'Admin sections' }) {
  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
        return;
      }
      e.preventDefault();
      const len = tabs.length;
      let next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % len;
      else if (e.key === 'ArrowLeft') next = (index - 1 + len) % len;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = len - 1;
      onChange(tabs[next].key);
      // Focus the newly-selected tab.
      const buttons = e.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
      buttons?.[next]?.focus();
    },
    [tabs, onChange],
  );

  return (
    <div role="tablist" aria-label={ariaLabel} className="admin-tabstrip">
      {tabs.map((tab, i) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="admin-tab"
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className="admin-tab-count" aria-label={`${tab.count} items`}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
