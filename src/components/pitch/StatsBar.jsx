// StatsBar.jsx - Persistent stats display for LP Portal (Windows 95 styled)
import React from 'react';
import { getCurrentQuarter } from '../../services/statsTracking';
import { BADGES } from '../../data/badgeDefinitions';
import BadgeIcon from '../icons/BadgeIcon';

// Strip a leading emoji "word" from a stored badge name (legacy format).
const stripBadgeEmoji = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  return parts.slice(1).join(' ');
};

export default function StatsBar({ user, stats, badges = [], pitchStats = {} }) {
  // Get current quarter reviews
  const currentQuarter = getCurrentQuarter();
  const quarterReviews = stats?.quarterlyReviews?.[currentQuarter] || 0;

  // Calculate chapter stats
  const currentYear = new Date().getFullYear();
  const pitchesThisQuarter = pitchStats?.quarterlyPitches?.[currentQuarter] || 0;
  const pitchesThisYear = pitchStats?.yearlyPitches?.[currentYear] || 0;
  const totalGrantWinners = pitchStats?.totalGrantWinners || 0;
  // Prefer the caller's computed total (sum of per-winner awardAmount with
  // chapter-default fallback). Fall back to winners × $1,000 for legacy call
  // sites that haven't been updated to pass an explicit total.
  const totalDollarsAwarded = Number.isFinite(pitchStats?.totalDollarsAwarded)
    ? pitchStats.totalDollarsAwarded
    : totalGrantWinners * 1000;

  // Find next milestone badge — id maps to the matching entry in BADGES.
  const milestoneBadges = [
    { count: 1, id: 'first_review', name: 'First Review' },
    { count: 10, id: 'welcome_neighborhood', name: 'New Kid on the Block' },
    { count: 25, id: 'block_captain', name: 'Neighborhood Watch' },
    { count: 50, id: 'super_reviewer', name: 'Review Pro' },
    { count: 75, id: 'review_champion', name: 'Review Champion' },
    { count: 100, id: 'going_platinum', name: 'Platinum Status' },
    { count: 200, id: 'review_legend', name: 'Review Legend' },
    { count: 500, id: 'god_mode', name: 'Grand Master' }
  ];

  const totalReviews = stats?.totalReviews || 0;
  const nextMilestone = milestoneBadges.find(m => m.count > totalReviews);
  const reviewsUntilNext = nextMilestone ? nextMilestone.count - totalReviews : 0;

  // Win95 styled stat cell
  const statCellStyle = {
    textAlign: 'center',
    padding: '6px 10px',
    border: '2px solid',
    borderColor: 'var(--mb-ink)',
    boxShadow: '0 0 0 0 var(--mb-ink)',
    background: 'var(--mb-chalk)',
    minWidth: '70px'
  };

  // Win95 divider between groups
  const groupDividerStyle = {
    width: '2px',
    alignSelf: 'stretch',
    borderLeft: '1px solid var(--gnf-border-pink)',
    borderRight: '1px solid rgba(255,255,255,0.8)',
    margin: '0 5px'
  };

  return (
    <div className="stats-bar" style={{
      background: 'var(--mb-paper)',
      border: '2px solid',
      borderColor: 'var(--mb-ink)',
      padding: '10px 16px',
      fontFamily: 'var(--font-content)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Stats Sections */}
        <div className="stats-sections" style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {/* LP Stats Group */}
          <div className="stats-group" style={{
            padding: '8px 12px'
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--gnf-text)',
              marginBottom: '6px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              borderBottom: '1px solid var(--gnf-border-pink)',
              paddingBottom: '4px'
            }}>LP Stats</div>
            <div className="stats-items" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={statCellStyle}>
                <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '2px' }}>{currentQuarter}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>{quarterReviews}</div>
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)' }}>Reviews</div>
              </div>

              <div style={statCellStyle}>
                <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '2px' }}>All Time</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>{totalReviews}</div>
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)' }}>Reviews</div>
              </div>
            </div>
          </div>

          <div style={groupDividerStyle} />

          {/* Chapter Stats Group */}
          <div className="stats-group" style={{
            padding: '8px 12px'
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--gnf-text)',
              marginBottom: '6px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              borderBottom: '1px solid var(--gnf-border-pink)',
              paddingBottom: '4px'
            }}>Chapter Stats</div>
            <div className="stats-items" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={statCellStyle}>
                <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '2px' }}>{currentQuarter}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>{pitchesThisQuarter}</div>
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)' }}>Pitches</div>
              </div>

              <div style={statCellStyle}>
                <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '2px' }}>{currentYear}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>{pitchesThisYear}</div>
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)' }}>Pitches</div>
              </div>

              <div style={statCellStyle}>
                <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '2px' }}>Awarded</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>
                  ${totalDollarsAwarded.toLocaleString()}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--gnf-text-muted)' }}>{totalGrantWinners} winners</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="badges-section" style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          {/* Recent Badges */}
          {badges.length > 0 && badges
            .filter(badge => badge.earnedAt || badge.earnedDate)
            .sort((a, b) => {
              const dateA = new Date(a.earnedAt || a.earnedDate || 0);
              const dateB = new Date(b.earnedAt || b.earnedDate || 0);
              return dateB - dateA;
            })
            .slice(0, 2)
            .map((badge) => {
              const badgeData = BADGES[badge.id || badge.badgeId];
              if (!badgeData) return null;

              let earnedDate;
              const dateValue = badge.earnedAt || badge.earnedDate;
              if (dateValue?.toDate) {
                earnedDate = dateValue.toDate();
              } else if (dateValue instanceof Date) {
                earnedDate = dateValue;
              } else if (dateValue) {
                earnedDate = new Date(dateValue);
              } else {
                earnedDate = null;
              }

              const isRecent = earnedDate && !isNaN(earnedDate.getTime()) && (Date.now() - earnedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;

              return (
                <div key={badge.id || badge.badgeId} style={{
                  background: 'var(--mb-paper)',
                  padding: '8px 12px',
                  border: '2px solid',
                  borderColor: 'var(--mb-ink)',
                        textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '70px',
                  minWidth: '70px',
                  position: 'relative'
                }} title={`${badgeData.name}${isRecent ? ' (Recently Earned!)' : ''}\nEarned: ${earnedDate && !isNaN(earnedDate.getTime()) ? earnedDate.toLocaleDateString() : 'Date unknown'}`}>
                  <div style={{ marginBottom: '2px', display: 'flex', justifyContent: 'center' }}>
                    <BadgeIcon id={badgeData.id} size={28} />
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--gnf-text-secondary)', lineHeight: '1.2', fontWeight: 'bold' }}>
                    {stripBadgeEmoji(badgeData.name)}
                  </div>
                  {isRecent && (
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '10px',
                      height: '10px',
                      background: 'var(--gnf-pink-300)',
                      border: '1px solid var(--mb-ink)',
                      borderRadius: '50%'
                    }} />
                  )}
                  {isRecent && (
                    <div className="win95-badge-new" style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '8px'
                    }}>NEW!</div>
                  )}
                </div>
              );
            })
            .filter(Boolean)
          }

          {/* Next Badge Progress */}
          {nextMilestone && (
            <div style={{
              background: 'var(--mb-paper)',
              padding: '8px 12px',
              border: '2px solid',
              borderColor: 'var(--mb-ink)',
                display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '70px'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--gnf-text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}>Next Badge</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <BadgeIcon id={nextMilestone.id} size={18} />
                {nextMilestone.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{
                  width: '80px',
                  height: '10px',
                  border: '2px solid',
                  borderColor: 'var(--mb-ink)',
                  boxShadow: '0 0 0 0 var(--mb-ink)',
                  background: 'var(--mb-chalk)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(totalReviews / nextMilestone.count) * 100}%`,
                    height: '100%',
                    background: 'var(--gnf-pink-300)',
                    transition: 'none'
                  }} />
                </div>
                <span style={{ fontSize: '9px', color: 'var(--gnf-text-muted)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                  {reviewsUntilNext} left
                </span>
              </div>
            </div>
          )}

          {/* Trophy Count */}
          <div style={{
            background: 'var(--gnf-pink-100)',
            padding: '8px 12px',
            border: '2px solid',
            borderColor: 'var(--mb-ink)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '70px',
            minWidth: '80px'
          }}>
            <div style={{ marginBottom: '2px', display: 'flex', justifyContent: 'center' }}>
              <BadgeIcon category="elite" size={28} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--gnf-text)' }}>{badges.length}</div>
            <div style={{ fontSize: '9px', color: 'var(--gnf-text-secondary)', fontWeight: 'bold' }}>Unlocked</div>
          </div>
        </div>
      </div>
    </div>
  );
}