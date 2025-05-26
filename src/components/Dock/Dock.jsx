import React, { useState } from 'react';
import './Dock.css';

const DockItem = ({ icon, label, onClick, isOpen, appId }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    onClick();
  };

  return (
    <div className="dock-item">
      <div 
        className="dock-icon-wrapper"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <img 
          src={icon} 
          alt={label} 
          className="dock-icon"
          draggable={false}
        />
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
  showMusic 
}) {
  const dockApps = [
    {
      id: 'website',
      icon: '/assets/icon-browser.webp',
      label: 'Neighborhood Navigator',
      isOpen: openApps.includes('website'),
      onClick: () => onAppClick('website')
    },
    {
      id: 'musicPlayer',
      icon: '/assets/radio.png',
      label: 'GNF Mixtape',
      isOpen: showMusic,
      onClick: () => onAppClick('musicPlayer')
    },
    {
      id: 'buddyMessenger',
      icon: '/assets/BuddyMessenger-icon.webp',
      label: 'Buddy Messenger',
      isOpen: showMessenger,
      onClick: () => onAppClick('buddyMessenger')
    },
    {
      id: 'founderMap',
      icon: '/assets/FounderMap-icon.webp',
      label: 'Awardee Map',
      isOpen: showFounderMap,
      onClick: () => onAppClick('founderMap')
    },
    {
      id: 'lpPortal',
      icon: '/assets/icon-review.webp',
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
            icon={app.icon}
            label={app.label}
            onClick={app.onClick}
            isOpen={app.isOpen}
            appId={app.id}
          />
        ))}
      </div>
    </div>
  );
}