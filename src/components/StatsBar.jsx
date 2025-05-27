// StatsBar.jsx - Persistent stats display for LP Portal
import React from 'react';
import { getCurrentQuarter } from '../services/statsTracking';
import { BADGES } from '../data/badgeDefinitions';

export default function StatsBar({ user, stats, badges = [], pitchStats = {} }) {
  // Calculate success rate
  const successRate = stats?.totalPredictions > 0 
    ? Math.round((stats.correctPredictions / stats.totalPredictions) * 100)
    : 0;

  // Get current quarter reviews
  const currentQuarter = getCurrentQuarter();
  const quarterReviews = stats?.quarterlyReviews?.[currentQuarter] || 0;
  
  // Calculate chapter stats
  const currentYear = new Date().getFullYear();
  const pitchesThisQuarter = pitchStats?.quarterlyPitches?.[currentQuarter] || 0;
  const pitchesThisYear = pitchStats?.yearlyPitches?.[currentYear] || 0;
  const totalGrantWinners = pitchStats?.totalGrantWinners || 0;
  const totalDollarsAwarded = totalGrantWinners * 1000;

  // Find next milestone badge
  const milestoneBadges = [
    { count: 1, name: '👼 First Review' },
    { count: 10, name: '🏘️ New Kid on the Block' },
    { count: 25, name: '🔍 Neighborhood Watch' },
    { count: 50, name: '⭐ Silver LP' },
    { count: 75, name: '🏆 Review CHAMP' },
    { count: 100, name: '💿 Platinum Status' },
    { count: 200, name: '👑 Review Legend' },
    { count: 500, name: '⚡️ GodMode.exe' }
  ];

  const totalReviews = stats?.totalReviews || 0;
  const nextMilestone = milestoneBadges.find(m => m.count > totalReviews);
  const reviewsUntilNext = nextMilestone ? nextMilestone.count - totalReviews : 0;

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #e0e0e0',
      padding: '12px 20px',
      fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        {/* Stats Sections */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* LP Stats */}
          <div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', fontWeight: '600' }}>LP Stats</div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{currentQuarter}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{quarterReviews}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Reviews</div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: '#e0e0e0' }} />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>All Time</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{totalReviews}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Reviews</div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: '#e0e0e0' }} />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Success Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: successRate >= 70 ? '#4CAF50' : '#333' }}>
                  {successRate}%
                </div>
                <div style={{ fontSize: '10px', color: '#888' }}>
                  {stats?.correctPredictions || 0}/{stats?.totalPredictions || 0}
                </div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: '#e0e0e0' }} />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Current Streak</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF6B6B' }}>
                  🔥 {stats?.currentStreak || 0}
                </div>
                <div style={{ fontSize: '10px', color: '#888' }}>weeks</div>
              </div>
            </div>
          </div>

          {/* Chapter Stats */}
          <div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', fontWeight: '600' }}>Chapter Stats</div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{currentQuarter}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{pitchesThisQuarter}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Pitches</div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: '#e0e0e0' }} />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{currentYear}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{pitchesThisYear}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Pitches</div>
              </div>
              
              <div style={{ width: '1px', height: '40px', background: '#e0e0e0' }} />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Total Awarded</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                  ${totalDollarsAwarded.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#888' }}>{totalGrantWinners} winners</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section - All together on the right */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
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
              
              // Handle different date formats
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
              
              const isRecent = earnedDate && !isNaN(earnedDate.getTime()) && (Date.now() - earnedDate.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
              
              return (
                <div key={badge.id || badge.badgeId} style={{
                  background: '#f8f8f8',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '80px',
                  minWidth: '80px',
                  position: 'relative',
                  filter: 'none'
                }} title={`${badgeData.name}${isRecent ? ' (Recently Earned!)' : ''}\nEarned: ${earnedDate && !isNaN(earnedDate.getTime()) ? earnedDate.toLocaleDateString() : 'Date unknown'}`}>
                  <div style={{ fontSize: '24px', marginBottom: '2px' }}>{badgeData.name.split(' ')[0]}</div>
                  <div style={{ fontSize: '9px', color: '#666', lineHeight: '1.2' }}>
                    {badgeData.name.split(' ').slice(1).join(' ')}
                  </div>
                  {isRecent && (
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      fontSize: '14px'
                    }}>✨</div>
                  )}
                  {isRecent && (
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '8px',
                      color: '#FF6B6B',
                      fontWeight: 'bold'
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
              background: '#f8f8f8',
              borderRadius: '8px',
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '80px'
            }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Next Badge Goal</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{nextMilestone.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{
                  width: '100px',
                  height: '6px',
                  background: '#f0f0f0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    width: `${(totalReviews / nextMilestone.count) * 100}%`,
                    height: '100%',
                    background: '#FFB6D9',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span style={{ fontSize: '10px', color: '#666', whiteSpace: 'nowrap' }}>
                  {reviewsUntilNext} left
                </span>
              </div>
            </div>
          )}

          {/* Trophy Count */}
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '6px',
            padding: '8px 12px',
            border: '1px solid #FFB6D9',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '80px',
            minWidth: '90px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '2px' }}>🏆</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{badges.length}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>Badges Unlocked</div>
          </div>
        </div>
      </div>

      {/* Tier Status */}
      {badges.length >= 10 && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px'
        }}>
          <span style={{ color: '#666' }}>Elite Status:</span>
          {badges.length >= 50 && <span>💎 Diamond LP</span>}
          {badges.length >= 30 && badges.length < 50 && <span>🥇 Gold LP</span>}
          {badges.length >= 20 && badges.length < 30 && <span>🥈 Silver LP</span>}
          {badges.length >= 10 && badges.length < 20 && <span>🥉 Bronze LP</span>}
          <span style={{ marginLeft: 'auto', color: '#888' }}>
            {badges.length < 20 && `${20 - badges.length} badges until Silver LP`}
            {badges.length >= 20 && badges.length < 30 && `${30 - badges.length} badges until Gold`}
            {badges.length >= 30 && badges.length < 50 && `${50 - badges.length} badges until Diamond`}
          </span>
        </div>
      )}
    </div>
  );
}