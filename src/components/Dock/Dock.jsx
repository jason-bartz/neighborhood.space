import React, { useState } from 'react';
import DockIcon from '../icons/DockIcon';
import './Dock.css';

const DockItem = ({ iconType, label, onClick, isOpen }) => {
  const [showTooltip, setShowTooltip] = useState(false);

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
        aria-label={label}
      >
        <DockIcon type={iconType} size={30} />
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
  showFounderMap
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
          />
        ))}
      </div>
    </div>
  );
}
