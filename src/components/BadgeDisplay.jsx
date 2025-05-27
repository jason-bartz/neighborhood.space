// BadgeDisplay.jsx - Trophy Case and Badge Notification System
import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { BADGES, BADGE_CATEGORIES, getBadgesByCategory } from '../data/badgeDefinitions';

// Badge Notification Modal
export function BadgeNotification({ badge, onClose }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
        />
      )}
      
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        border: '3px solid #FFB6D9',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        zIndex: 10000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        maxWidth: '400px'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>{badge.name.split(' ')[0]}</div>
        <h2 style={{ marginBottom: '10px', color: '#333' }}>Achievement Unlocked!</h2>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>{badge.name}</h3>
        <p style={{ marginBottom: '20px', color: '#666' }}>{badge.description}</p>
        <button
          onClick={onClose}
          style={{
            background: '#FFD6EC',
            border: '2px solid #FFB6D9',
            borderRadius: '6px',
            padding: '10px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Awesome! 🎉
        </button>
      </div>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999
      }} onClick={onClose} />
    </>
  );
}

// Trophy Case Component
export function TrophyCase({ badges = [], userStats = {} }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredBadge, setHoveredBadge] = useState(null);

  console.log('TrophyCase: Received badges:', badges);
  console.log('TrophyCase: Received userStats:', userStats);

  // Get earned badge IDs
  const earnedBadgeIds = badges.map(b => b.id || b.badgeId);
  console.log('TrophyCase: Earned badge IDs:', earnedBadgeIds);

  // Get all badges by category and sort with hidden ones at the end
  const allBadges = (selectedCategory === 'all' 
    ? Object.values(BADGES)
    : getBadgesByCategory(selectedCategory))
    .sort((a, b) => {
      // Sort hidden badges to the end
      if (a.hidden && !b.hidden) return 1;
      if (!a.hidden && b.hidden) return -1;
      return 0;
    });

  // Category names for display
  const categoryNames = {
    [BADGE_CATEGORIES.MILESTONES]: '📊 Review Milestones',
    [BADGE_CATEGORIES.ENGAGEMENT]: '💬 Engagement',
    [BADGE_CATEGORIES.ACCURACY]: '🎯 Accuracy & Success',
    [BADGE_CATEGORIES.TIMING]: '⏰ Consistency & Timing',
    [BADGE_CATEGORIES.PATTERNS]: '🌟 Rating Patterns',
    [BADGE_CATEGORIES.GENERAL]: '🏘️ General',
    [BADGE_CATEGORIES.ELITE]: '🏆 Elite Tiers',
    [BADGE_CATEGORIES.STREAK]: '📈 Streaks',
    [BADGE_CATEGORIES.EASTER_EGG]: '🎮 Easter Eggs'
  };

  return (
    <div style={{ padding: '20px', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif' }}>
      <h2 style={{ marginBottom: '20px', borderBottom: '2px solid #FFB6D9', paddingBottom: '10px' }}>
        🏆 Trophy Case - {badges.length} Badges Earned
      </h2>

      {/* Category Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '6px 12px',
            background: selectedCategory === 'all' ? '#FFD6EC' : '#f0f0f0',
            border: '2px solid #FFB6D9',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: selectedCategory === 'all' ? 'bold' : 'normal'
          }}
        >
          All Badges
        </button>
        {Object.entries(categoryNames).map(([key, name]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            style={{
              padding: '6px 12px',
              background: selectedCategory === key ? '#FFD6EC' : '#f0f0f0',
              border: '2px solid #FFB6D9',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: selectedCategory === key ? 'bold' : 'normal',
              fontSize: '13px'
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '15px'
      }}>
        {allBadges.map(badge => {
          const isEarned = earnedBadgeIds.includes(badge.id);
          const earnedBadge = badges.find(b => (b.id || b.badgeId) === badge.id);
          const progress = badge.progress(userStats, { badges });

          return (
            <div
              key={badge.id}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
              style={{
                background: isEarned ? 'linear-gradient(135deg, #FFE4F1, #FFD6EC)' : '#f5f5f5',
                border: `2px solid ${isEarned ? '#FFB6D9' : '#ddd'}`,
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center',
                position: 'relative',
                cursor: 'pointer',
                transform: hoveredBadge === badge.id ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s ease',
                opacity: isEarned ? 1 : 0.6
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px', filter: !isEarned ? 'grayscale(100%)' : 'none' }}>
                {badge.hidden && !isEarned ? '❓' : badge.name.split(' ')[0]}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {badge.hidden && !isEarned ? 'Hidden Badge' : badge.name.split(' ').slice(1).join(' ')}
              </div>
              
              {/* Progress Bar for unearned badges */}
              {!isEarned && progress > 0 && (
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: '#ddd',
                  borderRadius: '2px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: '#FFB6D9',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}

              {/* Earned Date */}
              {isEarned && earnedBadge && (
                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                  {(() => {
                    const dateValue = earnedBadge.earnedAt || earnedBadge.earnedDate;
                    if (!dateValue) return 'Date unknown';
                    
                    // Handle Firestore Timestamp
                    let date;
                    if (dateValue.toDate) {
                      date = dateValue.toDate();
                    } else if (dateValue instanceof Date) {
                      date = dateValue;
                    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
                      date = new Date(dateValue);
                    } else {
                      return 'Date unknown';
                    }
                    
                    return isNaN(date.getTime()) ? 'Date unknown' : date.toLocaleDateString();
                  })()}
                </div>
              )}

              {/* Hover Tooltip */}
              {hoveredBadge === badge.id && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  marginBottom: '5px',
                  zIndex: 10
                }}>
                  {badge.hidden && !isEarned ? badge.hiddenDescription || '???' : badge.description}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid rgba(0,0,0,0.9)'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginBottom: '15px' }}>📊 Badge Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {Object.entries(categoryNames).map(([category, name]) => {
            const categoryBadges = badges.filter(b => BADGES[b.id || b.badgeId]?.category === category);
            const totalInCategory = getBadgesByCategory(category).length;
            
            return (
              <div key={category} style={{
                background: 'white',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '13px', marginBottom: '5px' }}>{name}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                  {categoryBadges.length} / {totalInCategory}
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: '#eee',
                  borderRadius: '2px',
                  marginTop: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(categoryBadges.length / totalInCategory) * 100}%`,
                    height: '100%',
                    background: '#FFB6D9'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}