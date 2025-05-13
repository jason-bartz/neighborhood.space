import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "./FounderMap.css";

// Access the leaflet library from the CDN (loaded in index.html)
const L = window.L;

// Custom implementation for MapContainer that uses CDN-loaded leaflet
class MapContainerWithMarkers extends React.Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.markerRefs = {};
    this.markers = [];
    this.handleMarkerClick = this.handleMarkerClick.bind(this);
  }
  
  // Method to handle marker clicks and pass them to the parent component
  handleMarkerClick(founderId) {
    // Find the parent onClick handler
    const { children } = this.props;
    React.Children.forEach(children, child => {
      if (child && child.type && child.type.name === 'Marker' && child.props.id === founderId) {
        if (child.props.onClick) {
          // Parse data-info to get founder info
          try {
            const founderInfo = JSON.parse(child.props['data-info']);
            child.props.onClick({
              id: founderId,
              ...founderInfo
            });
          } catch (e) {
            console.error('Error handling marker click:', e);
          }
        }
      }
    });
  }
  
  componentDidMount() {
    if (!window.L) {
      console.error("Leaflet library not available");
      return;
    }
    
    // Initialize the map
    const { center, zoom } = this.props;
    this.map = L.map(this.mapRef.current).setView([center[0], center[1]], zoom);
    
    // Customize popup styling
    this.map.options.maxZoom = 18;
    this.map.options.minZoom = 2;
    
    // Add the tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    
    // Get markers from children and add them to the map
    this.addMarkers();
    
    // Add a slight delay to ensure proper rendering
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }
  
  componentDidUpdate(prevProps) {
    const { center, zoom } = this.props;
    
    // Update view if center or zoom changed
    if (this.map && (prevProps.center !== center || prevProps.zoom !== zoom)) {
      this.map.setView([center[0], center[1]], zoom);
    }
    
    // Check if we need to update markers
    if (prevProps.children !== this.props.children) {
      this.clearMarkers();
      this.addMarkers();
    }
  }
  
  componentWillUnmount() {
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
  
  clearMarkers() {
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.markers = [];
    this.markerRefs = {};
  }
  
  addMarkers() {
    if (!this.map) return;
    
    // Process children and add markers
    React.Children.forEach(this.props.children, child => {
      if (child && child.type && child.type.name === 'Marker') {
        const { position, children, id, "data-info": dataInfoStr } = child.props;
        
        // Skip markers without position
        if (!position || !position.lat || !position.lng) return;
        
        // Create marker
        const marker = L.marker([position.lat, position.lng]).addTo(this.map);
        this.markers.push(marker);
        
        // Store marker reference for id
        if (id) {
          this.markerRefs[id] = marker;
          
          // Make marker accessible via ref
          if (child.ref) {
            child.ref(marker);
          }
          
          // Add click handler to open popup and trigger handleBusinessClick
          marker.on('click', () => {
            marker.openPopup();
            this.handleMarkerClick(id);
          });
        }
        
        // Parse founder data if available
        let founderData = {};
        try {
          if (dataInfoStr) {
            founderData = JSON.parse(dataInfoStr);
          }
        } catch (e) {
          console.error("Error parsing founder data", e);
        }
        
        // Create popup content
        const popupEl = document.createElement('div');
        popupEl.className = 'founder-popup';
        popupEl.style.fontSize = '14px';
        popupEl.style.maxWidth = '300px';
        
        // Add photo if available
        if (founderData.photo) {
          const photoDiv = document.createElement('div');
          photoDiv.style.marginBottom = '10px';
          photoDiv.style.textAlign = 'center';
          
          const img = document.createElement('img');
          img.src = founderData.photo;
          img.alt = `${founderData.businessName || 'Business'} photo`;
          img.style.width = '180px';
          img.style.height = '180px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '4px';
          img.style.cursor = 'pointer';
          
          // Add the click handler to show expanded image
          img.onclick = () => {
            // Find the setExpandedImage function from props
            this.props.children.forEach(child => {
              if (child.props && child.props.onClick && child.props.id === id) {
                // Trigger the parent component's expanded image handling
                const expandImageEvent = new CustomEvent('expandImage', { 
                  detail: { 
                    imageUrl: founderData.photo,
                    founderId: id 
                  } 
                });
                window.dispatchEvent(expandImageEvent);
              }
            });
          };
          
          photoDiv.appendChild(img);
          popupEl.appendChild(photoDiv);
        }
        
        // Add business name
        const nameDiv = document.createElement('div');
        nameDiv.style.fontSize = '18px';
        nameDiv.style.marginBottom = '8px';
        nameDiv.innerHTML = `🏆 <strong>${founderData.businessName || 'Business'}</strong>`;
        popupEl.appendChild(nameDiv);
        
        // Add founder name
        const founderDiv = document.createElement('div');
        founderDiv.style.marginBottom = '4px';
        founderDiv.textContent = `Founder: ${founderData.founderName || 'Unknown'}`;
        popupEl.appendChild(founderDiv);
        
        // Add about section if available
        if (founderData.about) {
          const aboutDiv = document.createElement('div');
          aboutDiv.style.margin = '8px 0';
          aboutDiv.style.padding = '8px';
          aboutDiv.style.backgroundColor = '#f5f5f5';
          aboutDiv.style.borderRadius = '4px';
          aboutDiv.style.fontSize = '13px';
          aboutDiv.innerHTML = `<strong>About:</strong> ${founderData.about}`;
          popupEl.appendChild(aboutDiv);
        }
        
        // Add quarter
        const quarterDiv = document.createElement('div');
        quarterDiv.textContent = `Quarter: ${founderData.quarter || 'N/A'}`;
        popupEl.appendChild(quarterDiv);
        
        // Add website link if available
        if (founderData.website) {
          const websiteDiv = document.createElement('div');
          websiteDiv.style.marginTop = '8px';
          
          const link = document.createElement('a');
          link.href = founderData.website.startsWith('http') 
            ? founderData.website 
            : `https://${founderData.website}`;
          link.target = '_blank';
          link.rel = 'noreferrer';
          link.style.color = '#0066cc';
          link.style.textDecoration = 'none';
          link.textContent = 'Visit Website →';
          
          websiteDiv.appendChild(link);
          popupEl.appendChild(websiteDiv);
        }
        
        marker.bindPopup(popupEl);
      }
    });
  }
  
  render() {
    const { className, style, children } = this.props;
    
    return (
      <MapContext.Provider value={this.map}>
        <div
          ref={this.mapRef}
          className={className}
          style={style}
        />
        {/* Render children for context access */}
        <div style={{ display: 'none' }}>
          {React.Children.map(children, child => {
            if (child && child.type && 
                (child.type.name === 'MapZoom' || child.type.name === 'MapController')) {
              return child;
            }
            return null;
          })}
        </div>
      </MapContext.Provider>
    );
  }
}

// Use as compatibility layer
const MapContainer = MapContainerWithMarkers;

// Simplified mocks for other react-leaflet components
const TileLayer = () => null;
const Marker = () => null;
const Popup = () => null;

// Helper hook to access the map instance
const useMap = () => ({
  setView: () => console.log('MapView set'),
  panBy: () => console.log('Map panned')
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const chapterCenters = {
  "Western New York": { lat: 42.8864, lng: -78.8784, zoom: 9 },
  Denver: { lat: 39.7392, lng: -104.9903, zoom: 10 },
};

// MapZoom mock component - handled by MapContainer
function MapZoom({ center, zoom }) {
  return null;
}

// MapController actually needs to connect to our map container instance
// Use a context approach to make this work
const MapContext = React.createContext(null);

function MapController({ selectedFounder }) {
  const mapInstance = React.useContext(MapContext);
  
  React.useEffect(() => {
    if (mapInstance && selectedFounder && selectedFounder.coords) {
      // Follow the same behavior as the original component
      mapInstance.setView([selectedFounder.coords.lat, selectedFounder.coords.lng], 14);
      
      // Pan up for popup visibility
      setTimeout(() => {
        mapInstance.panBy([0, -120]);
      }, 100);
    }
  }, [mapInstance, selectedFounder]);
  
  return null;
}

function getQuarterFromTimestamp(timestamp) {
  try {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    const q = Math.floor(date.getMonth() / 3) + 1;
    return `Q${q} ${date.getFullYear()}`;
  } catch {
    return "N/A";
  }
}

export default function FounderMap({ onClose, windowId, bringToFront, isEmbedded = false }) {
  const [founders, setFounders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [chapterFilter, setChapterFilter] = useState("");
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState({
    lat: 39.5,
    lng: -98.35,
    zoom: 4,
  });
  const [selectedFounder, setSelectedFounder] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const markerRefs = useRef({});

  useEffect(() => {
    const fetchFounders = async () => {
      const q = query(
        collection(db, "pitches"),
        where("isWinner", "==", true)
      );
      const snap = await getDocs(q);
      const data = [];
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.latitude && d.longitude) {
          data.push({
            ...d,
            id: doc.id,
            coords: { lat: d.latitude, lng: d.longitude },
            quarter: getQuarterFromTimestamp(d.createdAt),
          });
        }
      });
      data.sort((a, b) =>
        (a.businessName || "").localeCompare(b.businessName || "")
      );
      setFounders(data);
      setLocations(data);
    };
    fetchFounders();
    
    // Add event listener for image expansion
    const handleExpandImage = (event) => {
      const { imageUrl } = event.detail;
      if (imageUrl) {
        setExpandedImage(imageUrl);
      }
    };
    
    window.addEventListener('expandImage', handleExpandImage);
    
    // Clean up
    return () => {
      window.removeEventListener('expandImage', handleExpandImage);
    };
  }, []);

  const handleChapterChange = (e) => {
    const chapter = e.target.value;
    setChapterFilter(chapter);
    if (chapter && chapterCenters[chapter]) {
      setMapCenter(chapterCenters[chapter]);
      setLocations(founders.filter((f) => f.chapter === chapter));
    } else {
      setMapCenter({ lat: 39.5, lng: -98.35, zoom: 4 });
      setLocations(founders);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value.toLowerCase();
    setSearch(val);
    setLocations(
      founders.filter((f) => {
        const matchesSearch =
          f.businessName?.toLowerCase().includes(val) ||
          f.founderName?.toLowerCase().includes(val);
        const matchesChapter = !chapterFilter || f.chapter === chapterFilter;
        return matchesSearch && matchesChapter;
      })
    );
  };

  const handleBusinessClick = (founder) => {
    setSelectedFounder(founder);
    const marker = markerRefs.current[founder.id];
    if (marker) marker.openPopup();
  };

  const handleWindowClick = () => {
    if (windowId && bringToFront) {
      bringToFront(windowId);
    }
  };

  return (
    <div
      className="founder-map-container"
      style={{ display: "flex", height: "100%", width: "100%" }}
      onClick={handleWindowClick}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 250,
          borderRight: "1px solid #aaa",
          overflowY: "auto",
          padding: 10,
          backgroundColor: "#f9f9f9",
          flexShrink: 0 // Prevent sidebar from shrinking
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            borderBottom: "1px solid #ccc",
            paddingBottom: 8,
          }}
        >
          Founders ({locations.length})
        </h3>
        <div style={{ overflowY: "auto", maxHeight: "calc(100% - 40px)", minHeight: 0 }}>
          {locations.map((founder) => (
            <div
              key={founder.id}
              onClick={() => handleBusinessClick(founder)}
              style={{
                padding: 8,
                margin: "5px 0",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor:
                  selectedFounder?.id === founder.id ? "#e3f2fd" : "#fff",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 14 }}>
                {founder.businessName}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {founder.founderName}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                {founder.chapter}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                Quarter: {founder.quarter}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map + Controls */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          padding: 10,
          height: "100%",
          minWidth: 0, // Prevent content from forcing parent to grow
          overflow: "hidden" // Hide any overflow
        }}
      >
        <div
          className="map-controls"
          style={{ marginBottom: 10, display: "flex", gap: 10 }}
        >
          <input
            type="text"
            placeholder="Search founder or business"
            value={search}
            onChange={handleSearch}
            style={{ flexGrow: 1, padding: 6, fontFamily: "inherit" }}
          />
          <select
            value={chapterFilter}
            onChange={handleChapterChange}
            style={{ padding: 6, fontFamily: "inherit" }}
          >
            <option value="">All Chapters</option>
            <option value="Western New York">Western New York</option>
            <option value="Denver">Denver</option>
          </select>
        </div>

        <MapContainer
          className="no-drag" // ← prevent window-drag when panning
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={mapCenter.zoom}
          style={{ 
            flexGrow: 1, 
            borderRadius: 4, 
            border: "1px solid #aaa",
            width: "100%",
            height: "100%"
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapZoom
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapCenter.zoom}
          />
          <MapController selectedFounder={selectedFounder} />
          {locations.map((f) => (
            <Marker
              key={f.id}
              id={f.id}
              position={f.coords}
              ref={(ref) => {
                markerRefs.current[f.id] = ref;
              }}
              onClick={() => handleBusinessClick(f)}
              data-info={JSON.stringify({
                businessName: f.businessName,
                founderName: f.founderName,
                about: f.about,
                quarter: f.quarter,
                website: f.website,
                photo: f["pitch-photo"]
              })}
            >
              <Popup>
                <div style={{ fontSize: 14, maxWidth: 300 }}>
                  {f["pitch-photo"] && (
                    <div
                      style={{
                        marginBottom: 10,
                        textAlign: "center",
                      }}
                    >
                      <img
                        src={f["pitch-photo"]}
                        alt={`${f.businessName} photo`}
                        style={{
                          width: 180,  // ← fixed square frame
                          height: 180, // ← fixed square frame
                          objectFit: "cover",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedImage(f["pitch-photo"])}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: 18, marginBottom: 8 }}>
                    🏆 <strong>{f.businessName}</strong>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    Founder: {f.founderName}
                  </div>
                  {f.about && (
                    <div
                      style={{
                        margin: "8px 0",
                        padding: 8,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    >
                      <strong>About:</strong> {f.about}
                    </div>
                  )}
                  <div>Quarter: {f.quarter || "N/A"}</div>
                  {f.website && (
                    <div style={{ marginTop: 8 }}>
                      <a
                        href={
                          f.website.startsWith("http")
                            ? f.website
                            : `https://${f.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#0066cc", textDecoration: "none" }}
                      >
                        Visit Website →
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {expandedImage && (
        <div 
          className="image-modal" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => setExpandedImage(null)}
        >
          <div 
            className="image-modal-content" 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <img 
              src={expandedImage} 
              alt="Expanded view" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
            <div 
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(null);
              }}
            >
              ×
            </div>
          </div>
        </div>
      )}
    </div>
  );
}