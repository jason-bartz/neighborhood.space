import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { makeGeocoder } from '../../helpers/pitchGeocoder';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icon component. `approximate` pins (placed at a chapter center
// because the zip has no precise coordinates yet) render dimmed.
const createCustomIcon = (isWinner, approximate = false) => {
  return L.divIcon({
    html: `<div style="
      font-size: 24px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      cursor: pointer;
      opacity: ${approximate ? 0.6 : 1};
      transform: translate(-12px, -12px);
    ">${isWinner ? '🏆' : '📍'}</div>`,
    iconSize: [24, 24],
    className: 'custom-pitch-marker',
    iconAnchor: [12, 12],
  });
};

// Component to handle map bounds updates
function MapBoundsHandler({ onBoundsChange }) {
  const map = useMap();
  
  useEffect(() => {
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    };
    
    map.on('moveend', handleMoveEnd);
    handleMoveEnd(); // Initial bounds
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);
  
  return null;
}

// Component to auto-fit map to markers
function AutoFitBounds({ markers }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, markers]);
  
  return null;
}

export default function PitchMap({ pitches = [], currentUserChapter, onPitchClick }) {
  const [mapBounds, setMapBounds] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);
  const [zipcodeData, setZipcodeData] = useState(null);
  const [pitchesWithCoords, setPitchesWithCoords] = useState([]);
  
  // Debug logging
  console.log('PitchMap received pitches:', pitches);
  console.log('PitchMap pitches length:', pitches.length);
  console.log('Pitches with coordinates:', pitches.filter(p => p.lat && p.lng).length);
  if (pitches[0]) {
    console.log('Sample pitch fields:', Object.keys(pitches[0]));
    console.log('Sample pitch:', pitches[0]);
  }
  
  // Load zipcode data
  useEffect(() => {
    console.log("PitchMap: Loading zipcode data...");
    fetch('/data/zipcodes.json')
      .then(res => res.json())
      .then(data => {
        setZipcodeData(data);
        console.log("PitchMap: Zipcode data loaded successfully");
      })
      .catch(err => {
        console.error('PitchMap: Failed to load zipcode data:', err);
      });
  }, []);
  
  // Geocode pitches once zipcode data is loaded. The shared geocoder resolves
  // every chapter (precise zip where available, chapter-center fallback
  // otherwise), so no chapter silently drops off the map.
  useEffect(() => {
    if (!zipcodeData) return;

    const geocode = makeGeocoder(zipcodeData);
    const located = pitches.map((pitch) => {
      if (typeof pitch.lat === 'number' && typeof pitch.lng === 'number') {
        return pitch;
      }
      const coords = geocode(pitch);
      return coords
        ? { ...pitch, lat: coords.lat, lng: coords.lng, approximate: coords.approximate }
        : pitch;
    });

    setPitchesWithCoords(located);
    console.log('PitchMap: Pitches with coordinates:', located.filter(p => p.lat && p.lng).length);
  }, [pitches, zipcodeData]);

  // Get unique chapters and quarters for filters
  const chapters = useMemo(() => {
    const uniqueChapters = [...new Set(pitchesWithCoords.map(p => p.chapter).filter(Boolean))];
    return uniqueChapters.sort();
  }, [pitchesWithCoords]);

  const quarters = useMemo(() => {
    const uniqueQuarters = [...new Set(pitchesWithCoords.map(p => p.quarter).filter(Boolean))];
    return uniqueQuarters.sort((a, b) => {
      const [aQ, aY] = a.split(' ');
      const [bQ, bY] = b.split(' ');
      if (bY !== aY) return parseInt(bY) - parseInt(aY);
      return parseInt(aQ.substring(1)) - parseInt(bQ.substring(1));
    });
  }, [pitchesWithCoords]);

  // Filter pitches based on criteria
  const filteredPitches = useMemo(() => {
    return pitchesWithCoords.filter(pitch => {
      // Must have coordinates
      if (!pitch.lat || !pitch.lng) return false;
      
      // Quarter filter
      if (filterQuarter && pitch.quarter !== filterQuarter) return false;
      
      // Winners only filter
      if (showWinnersOnly && !pitch.isWinner) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          pitch.businessName?.toLowerCase().includes(search) ||
          pitch.founderName?.toLowerCase().includes(search) ||
          pitch.city?.toLowerCase().includes(search)
        );
      }
      
      return true;
    });
  }, [pitchesWithCoords, filterQuarter, showWinnersOnly, searchTerm]);

  // Count stats
  const stats = useMemo(() => {
    const visible = filteredPitches.length;
    const winners = filteredPitches.filter(p => p.isWinner).length;
    return { visible, winners };
  }, [filteredPitches]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filters Bar - Win95 styled */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--mb-paper-deep)',
        border: '2px solid',
        borderColor: 'var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-sm)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontFamily: 'var(--font-content)'
      }}>
        <input
          type="text"
          placeholder="Search business or founder..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            height: '30px',
            boxSizing: 'border-box',
            padding: '0 10px',
            flex: '1',
            minWidth: '200px',
            fontSize: '13px',
            border: '2px solid var(--mb-ink)',
            fontFamily: 'var(--font-content)'
          }}
        />

        {/* Quarter Filter */}
        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
          style={{
            height: '30px',
            boxSizing: 'border-box',
            padding: '0 10px',
            fontSize: '13px',
            border: '2px solid var(--mb-ink)',
            fontFamily: 'var(--font-content)',
            background: 'var(--btn-bg)'
          }}
        >
          <option value="">All Quarters</option>
          {quarters.map(quarter => (
            <option key={quarter} value={quarter}>{quarter}</option>
          ))}
        </select>

        {/* Winners Only Toggle */}
        <button
          onClick={() => setShowWinnersOnly(!showWinnersOnly)}
          style={{
            height: '30px',
            boxSizing: 'border-box',
            padding: '0 14px',
            border: '2px solid var(--mb-ink)',
            boxShadow: showWinnersOnly ? '0 0 0 0 var(--mb-ink)' : 'var(--shadow-hard-sm)',
            background: showWinnersOnly ? 'var(--gnf-pink-200)' : 'var(--btn-bg)',
            color: 'var(--gnf-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'var(--font-content)',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        >
          Winners Only
        </button>

        {/* Stats */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--gnf-text-secondary)',
          fontWeight: 'bold'
        }}>
          <span style={{
            height: '30px',
            boxSizing: 'border-box',
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            border: '2px solid var(--mb-ink)',
            boxShadow: '0 0 0 0 var(--mb-ink)',
            background: 'var(--mb-chalk)'
          }}>{stats.visible} pitches</span>
          <span style={{
            height: '30px',
            boxSizing: 'border-box',
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            border: '2px solid var(--mb-ink)',
            boxShadow: '0 0 0 0 var(--mb-ink)',
            background: 'var(--mb-chalk)'
          }}>{stats.winners} winners</span>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[39.8283, -98.5795]} // Center of USA
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapBoundsHandler onBoundsChange={setMapBounds} />
          <AutoFitBounds markers={filteredPitches} />
          
          {filteredPitches.map((pitch) => (
            <Marker
              key={pitch.id}
              position={[pitch.lat, pitch.lng]}
              icon={createCustomIcon(pitch.isWinner, pitch.approximate)}
              eventHandlers={{
                click: () => onPitchClick && onPitchClick(pitch)
              }}
            >
              <Tooltip>
                <div style={{ textAlign: 'center' }}>
                  <strong>{pitch.businessName || 'Unknown Business'}</strong><br />
                  by {pitch.founderName || 'Unknown Founder'}<br />
                  {pitch.city && pitch.state ? `${pitch.city}, ${pitch.state}` : pitch.chapter}<br />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {pitch.quarter} • {pitch.chapter}
                  </span>
                  {pitch.isWinner && (
                    <div style={{ marginTop: '4px', color: '#4CAF50', fontWeight: 'bold' }}>
                      🏆 Grant Winner
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Loading indicator — shown only while the zip dataset is still loading */}
        {!zipcodeData && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'var(--mb-paper-deep)',
            padding: '6px 12px',
            border: '2px solid',
            borderColor: 'var(--mb-ink)',
            boxShadow: 'var(--shadow-hard-sm)',
            fontSize: '11px',
            color: 'var(--gnf-text-secondary)',
            fontFamily: 'var(--font-content)',
            fontWeight: 'bold'
          }}>
            Geocoding addresses...
          </div>
        )}
      </div>
    </div>
  );
}