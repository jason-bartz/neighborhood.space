import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icon component
const createCustomIcon = (isWinner) => {
  return L.divIcon({
    html: `<div style="
      font-size: 24px; 
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      cursor: pointer;
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
  
  // Lookup function to get coordinates from zip code
  const getCoordinatesFromZip = (zipCode) => {
    if (!zipcodeData || !zipCode) return null;
    
    // Normalize zip code (remove spaces, ensure string)
    const normalizedZip = String(zipCode).trim();
    
    // Search in Western NY counties
    const wnyCounties = zipcodeData.western_new_york;
    for (const countyName in wnyCounties) {
      const county = wnyCounties[countyName];
      if (Array.isArray(county)) {
        const found = county.find(entry => entry.zip === normalizedZip);
        if (found) {
          return { lat: found.lat, lng: found.lon };
        }
      }
    }
    
    // Search in Denver
    if (zipcodeData.denver_colorado && zipcodeData.denver_colorado.zip_codes) {
      const denverZip = zipcodeData.denver_colorado.zip_codes.find(
        entry => entry.zip === normalizedZip
      );
      if (denverZip) {
        return { lat: denverZip.lat, lng: denverZip.lon };
      }
    }
    
    console.log(`PitchMap: No coordinates found for zip code: ${normalizedZip}`);
    return null;
  };
  
  // Add coordinates to pitches when zipcode data is loaded
  useEffect(() => {
    if (!zipcodeData || !pitches.length) return;
    
    console.log('PitchMap: Adding coordinates to pitches...');
    const pitchesWithNewCoords = pitches.map(pitch => {
      // If pitch already has coordinates, use them
      if (pitch.lat && pitch.lng) {
        return pitch;
      }
      
      // Try to get coordinates from zipcode or zip field
      const zipField = pitch.zipcode || pitch.zip || pitch.zipCode;
      if (zipField) {
        const coords = getCoordinatesFromZip(zipField);
        if (coords) {
          console.log(`PitchMap: Found coordinates for ${pitch.businessName} at zip ${zipField}`);
          return { ...pitch, ...coords };
        }
      }
      
      return pitch;
    });
    
    setPitchesWithCoords(pitchesWithNewCoords);
    console.log('PitchMap: Pitches with coordinates:', pitchesWithNewCoords.filter(p => p.lat && p.lng).length);
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
      {/* Filters Bar */}
      <div style={{ 
        padding: '15px', 
        background: 'white', 
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search business or founder..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            flex: '1',
            minWidth: '200px'
          }}
        />
        
        {/* Quarter Filter */}
        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white'
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
            padding: '8px 16px',
            border: `1px solid ${showWinnersOnly ? '#FFB6D9' : '#e0e0e0'}`,
            borderRadius: '6px',
            background: showWinnersOnly ? '#FFB6D9' : 'white',
            color: showWinnersOnly ? 'white' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🏆 Winners Only
        </button>
        
        {/* Stats */}
        <div style={{ 
          marginLeft: 'auto',
          display: 'flex',
          gap: '20px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>📍 {stats.visible} pitches</span>
          <span>🏆 {stats.winners} winners</span>
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
              icon={createCustomIcon(pitch.isWinner)}
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
        
        {/* Loading indicator for geocoding */}
        {pitches.some(p => !p.lat || !p.lng) && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px 15px',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '12px',
            color: '#666'
          }}>
            🔄 Geocoding addresses...
          </div>
        )}
      </div>
    </div>
  );
}