import React, { useState } from 'react';
import DockIcon from '../icons/DockIcon';
import './Dock.css';

const DockItem = ({ iconType, label, onClick, isOpen, badgeCount }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const showBadge = badgeCount > 0;
  const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);
  const ariaLabel = showBadge
    ? `${label} (${badgeCount} new ${badgeCount === 1 ? 'message' : 'messages'})`
    : label;

  return (
    <div className="dock-item">
      <div
        className="dock-icon-wrapper"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={ariaLabel}
      >
        <DockIcon type={iconType} size={30} />
        {showBadge && (
          <span className="dock-badge" aria-hidden="true">{badgeLabel}</span>
        )}
        {showTooltip && (
          <div className="dock-tooltip">
            {label}
          </div>
        )}
      </div>
      {isOpen && <div className="dock-indicator" />}
    </div>
  );
};

export default function Dock({
  openApps,
  onAppClick,
  showMessenger,
  showFounderMap,
  unreadMessengerCount = 0
}) {
  const dockApps = [
    {
      id: 'website',
      iconType: 'website',
      label: 'Neighborhood Navigator',
      isOpen: openApps.includes('website'),
      onClick: () => onAppClick('website')
    },
    {
      id: 'submit',
      iconType: 'submit',
      label: 'Submit Pitch',
      isOpen: openApps.includes('submit'),
      onClick: () => onAppClick('submit')
    },
    {
      id: 'buddyMessenger',
      iconType: 'buddyMessenger',
      label: 'Buddy Messenger',
      isOpen: showMessenger,
      badgeCount: unreadMessengerCount,
      onClick: () => onAppClick('buddyMessenger')
    },
    {
      id: 'founderMap',
      iconType: 'founderMap',
      label: 'Awardee Map',
      isOpen: showFounderMap,
      onClick: () => onAppClick('founderMap')
    },
    {
      id: 'lpPortal',
      iconType: 'lpPortal',
      label: 'LP Portal',
      isOpen: openApps.includes('lpPortal'),
      onClick: () => onAppClick('lpPortal')
    }
  ];

  return (
    <div className="dock-container">
      <div className="dock">
        {dockApps.map(app => (
          <DockItem
            key={app.id}
            iconType={app.iconType}
            label={app.label}
            onClick={app.onClick}
            isOpen={app.isOpen}
            badgeCount={app.badgeCount}
          />
        ))}
      </div>
    </div>
  );
}
