// BadgeDisplay.jsx - Trophy Case and Badge Notification System (Windows 95 styled)
import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { BADGES, BADGE_CATEGORIES, getBadgesByCategory } from '../../data/badgeDefinitions';
import BadgeIcon from '../icons/BadgeIcon';

// Strip the leading emoji glyph from a stored badge.name like "👼 First Review".
// Falls back to the full string if no leading emoji is present.
const stripBadgeNameEmoji = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  return parts.slice(1).join(' ');
};

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
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        background: 'var(--mb-chalk)',
        border: '2px solid var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-lg)',
        padding: '0',
        textAlign: 'center',
        zIndex: 10000,
        fontFamily: 'var(--font-content)'
      }}>
        {/* Title bar — cream + pixel font to match Navigator theme */}
        <div style={{
          background: 'var(--mb-paper)',
          color: 'var(--mb-ink)',
          padding: '6px 10px',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'var(--font-pixel)',
          fontSize: '11px',
          letterSpacing: '0.04em',
          textAlign: 'left',
          userSelect: 'none',
          borderBottom: '1px solid var(--mb-ink)'
        }}>
          Achievement Unlocked!
        </div>
        <div style={{ padding: '25px 30px', background: 'var(--mb-paper)' }}>
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
            <BadgeIcon id={badge.id || badge.badgeId} size={84} />
          </div>
          <h3 style={{ marginBottom: '10px', color: 'var(--mb-ink)', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, letterSpacing: '-0.01em' }}>{stripBadgeNameEmoji(badge.name)}</h3>
          <p style={{ marginBottom: '20px', color: 'var(--mb-ink-60)' }}>{badge.description}</p>
          <button
            onClick={onClose}
            style={{
              background: 'var(--mb-magenta)',
              color: 'var(--mb-chalk)',
              border: '2px solid var(--mb-ink)',
              boxShadow: 'var(--shadow-hard-sm)',
              padding: '8px 30px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'var(--font-content)',
              letterSpacing: '0.04em'
            }}
          >
            OK
          </button>
        </div>
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
      if (a.hidden && !b.hidden) return 1;
      if (!a.hidden && b.hidden) return -1;
      return 0;
    });

  // Category labels for display (icons rendered separately via BadgeIcon)
  const categoryNames = {
    [BADGE_CATEGORIES.MILESTONES]: 'Review Milestones',
    [BADGE_CATEGORIES.ENGAGEMENT]: 'Engagement',
    [BADGE_CATEGORIES.ACCURACY]: 'Accuracy & Success',
    [BADGE_CATEGORIES.TIMING]: 'Consistency & Timing',
    [BADGE_CATEGORIES.PATTERNS]: 'Rating Patterns',
    [BADGE_CATEGORIES.GENERAL]: 'General',
    [BADGE_CATEGORIES.ELITE]: 'Elite Tiers',
    [BADGE_CATEGORIES.STREAK]: 'Streaks',
    [BADGE_CATEGORIES.EASTER_EGG]: 'Easter Eggs'
  };

  return (
    <div className="lp-tab-page">
      <section className="admin-section admin-section--hero admin-section--butter">
        <div className="admin-section-head">
          <span className="admin-section-head__eyebrow">Trophy Case · Achievements</span>
          <h2 className="admin-section-head__title">
            Hardware you've <em>earned</em>.
          </h2>
          <p className="admin-section-head__lede">
            Every milestone and streak you've unlocked through your reviews.
            <strong style={{ fontFamily: 'var(--font-numeral)', fontWeight: 700, marginLeft: 6 }}>
              {badges.length}
            </strong> badge{badges.length === 1 ? '' : 's'} collected so far.
          </p>
        </div>
      </section>

      <section className="admin-section admin-section--paper" style={{ padding: '20px' }}>
      {/* Category Filter - Win95 tab bar style */}
      <div style={{
        marginBottom: '15px',
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        background: 'var(--mb-paper-deep)',
        padding: '8px',
        border: '2px solid',
        borderColor: 'var(--mb-ink)',
        boxShadow: '0 0 0 0 var(--mb-ink)'
      }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '4px 10px',
            background: selectedCategory === 'all' ? 'var(--btn-primary-bg)' : 'var(--btn-bg)',
            border: '2px solid',
            borderColor: selectedCategory === 'all' ? 'var(--mb-ink)' : 'var(--mb-ink)',
            boxShadow: selectedCategory === 'all' ? '0 0 0 0 var(--mb-ink)' : 'var(--shadow-hard-sm)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            fontFamily: 'var(--font-content)'
          }}
        >
          All Badges
        </button>
        {Object.entries(categoryNames).map(([key, name]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            style={{
              padding: '4px 10px',
              background: selectedCategory === key ? 'var(--btn-primary-bg)' : 'var(--btn-bg)',
              border: '2px solid',
              borderColor: selectedCategory === key ? 'var(--mb-ink)' : 'var(--mb-ink)',
              boxShadow: selectedCategory === key ? '0 0 0 0 var(--mb-ink)' : 'var(--shadow-hard-sm)',
              cursor: 'pointer',
              fontWeight: selectedCategory === key ? 'bold' : 'normal',
              fontSize: '11px',
              fontFamily: 'var(--font-content)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <BadgeIcon category={key} size={16} />
            {name}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '8px'
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
                background: isEarned ? 'var(--gnf-pink-100)' : 'var(--mb-paper-deep)',
                border: '2px solid',
                borderColor: isEarned ? 'var(--mb-ink)' : '#ccc #fff #fff #ccc',
                boxShadow: isEarned ? 'var(--shadow-hard-sm)' : 'none',
                padding: '12px 8px',
                textAlign: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'none'
              }}
            >
              <div style={{
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'center',
                filter: !isEarned ? 'grayscale(100%)' : 'none',
                opacity: isEarned ? 1 : 0.55,
              }}>
                <BadgeIcon
                  id={badge.id}
                  locked={badge.hidden && !isEarned}
                  size={40}
                />
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                marginBottom: '4px',
                color: 'var(--gnf-text)',
                opacity: isEarned ? 1 : 0.7,
              }}>
                {badge.hidden && !isEarned ? 'Hidden Badge' : stripBadgeNameEmoji(badge.name)}
              </div>

              {/* Progress Bar for unearned badges - Win95 inset style */}
              {!isEarned && progress > 0 && (
                <div style={{
                  width: '100%',
                  height: '10px',
                  border: '2px solid',
                  borderColor: 'var(--mb-ink)',
                  boxShadow: '0 0 0 0 var(--mb-ink)',
                  background: 'var(--gnf-bg)',
                  marginTop: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: 'var(--gnf-pink-300)',
                    transition: 'none'
                  }} />
                </div>
              )}

              {/* Earned Date */}
              {isEarned && earnedBadge && (
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)', marginTop: '4px' }}>
                  {(() => {
                    const dateValue = earnedBadge.earnedAt || earnedBadge.earnedDate;
                    if (!dateValue) return 'Date unknown';

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

              {/* Hover Tooltip - Win95 styled */}
              {hoveredBadge === badge.id && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--gnf-yellow-100)',
                  color: 'var(--gnf-text)',
                  padding: '4px 8px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                  zIndex: 10,
                  border: '1px solid var(--gnf-text)',
                  fontFamily: 'var(--font-content)'
                }}>
                  {badge.hidden && !isEarned ? badge.hiddenDescription || '???' : badge.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Summary - Win95 group box style */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'var(--mb-paper-deep)',
        border: '2px solid',
        borderColor: 'var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-sm)'
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          marginBottom: '12px',
          borderBottom: '1px solid var(--gnf-border-pink)',
          paddingBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <BadgeIcon category={BADGE_CATEGORIES.MILESTONES} size={16} />
          Badge Statistics
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {Object.entries(categoryNames).map(([category, name]) => {
            const categoryBadges = badges.filter(b => BADGES[b.id || b.badgeId]?.category === category);
            const totalInCategory = getBadgesByCategory(category).length;

            return (
              <div key={category} style={{
                background: 'var(--gnf-bg)',
                padding: '8px 10px',
                border: '2px solid',
                borderColor: 'var(--mb-ink)',
                boxShadow: '0 0 0 0 var(--mb-ink)'
              }}>
                <div style={{ fontSize: '11px', marginBottom: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <BadgeIcon category={category} size={14} />
                  {name}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>
                  {categoryBadges.length} / {totalInCategory}
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  border: '2px solid',
                  borderColor: 'var(--mb-ink)',
                  boxShadow: '0 0 0 0 var(--mb-ink)',
                  background: 'var(--gnf-bg)',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(categoryBadges.length / totalInCategory) * 100}%`,
                    height: '100%',
                    background: 'var(--gnf-pink-300)',
                    transition: 'none'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </section>
    </div>
  );
}