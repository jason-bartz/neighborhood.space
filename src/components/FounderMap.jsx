import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "./FounderMap.css";

const chapterCenters = {
  "Western New York": { lat: 42.88, lng: -77.8, zoom: 8 }, // Zoomed out to show full WNY region
  Denver: { lat: 39.7392, lng: -104.9903, zoom: 10 },
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [zipcodeData, setZipcodeData] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const markerMapRef = useRef(new Map()); // Map founder ID to marker
  
  // Force initialization function (exposed for debugging)
  const forceInitMap = () => {
    console.log("Force initializing map...");
    if (mapInstanceRef.current) {
      console.log("Removing existing map instance");
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setMapReady(false);
    setTimeout(() => {
      const container = mapRef.current;
      if (!container || !window.L) {
        console.error("Cannot force init - missing container or Leaflet");
        return;
      }
      try {
        const map = window.L.map(container, {
          center: [mapCenter.lat, mapCenter.lng],
          zoom: mapCenter.zoom
        });
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        mapInstanceRef.current = map;
        setMapReady(true);
        map.invalidateSize();
        console.log("Force init successful!");
      } catch (err) {
        console.error("Force init failed:", err);
      }
    }, 100);
  };
  
  // Expose for debugging
  useEffect(() => {
    window._debugForceInitMap = forceInitMap;
    return () => {
      delete window._debugForceInitMap;
    };
  }, []);

  // Load zipcode data
  useEffect(() => {
    console.log("Loading zipcode data...");
    fetch('/data/zipcodes.json')
      .then(res => res.json())
      .then(data => {
        setZipcodeData(data);
        console.log("Zipcode data loaded successfully");
      })
      .catch(err => {
        console.error('Failed to load zipcode data:', err);
        setError('Failed to load location data');
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
    
    console.log(`No coordinates found for zip code: ${normalizedZip}`);
    return null;
  };

  // Force initialization when component mounts and container is ready
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkLeafletAndInit = () => {
      attempts++;
      console.log(`Leaflet check attempt ${attempts}/${maxAttempts}`);
      
      // Check if Leaflet is available
      if (!window.L) {
        console.warn("Leaflet not yet available, waiting...");
        if (attempts < maxAttempts) {
          setTimeout(checkLeafletAndInit, 500);
        } else {
          console.error("Leaflet failed to load after 10 attempts");
          setError("Unable to load map library. Please refresh the page.");
          setLoading(false);
        }
        return;
      }
      
      console.log("Leaflet is available!");
      
      // Ensure Leaflet CSS is loaded
      const leafletCSSId = 'leaflet-css-check';
      if (!document.getElementById(leafletCSSId)) {
        console.log("Adding Leaflet CSS...");
        const link = document.createElement('link');
        link.id = leafletCSSId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      
      // Now wait for container
      const waitForContainer = () => {
        if (!mapRef.current) {
          console.log("Container not ready, waiting...");
          setTimeout(waitForContainer, 100);
          return;
        }
        
        console.log("Container is ready, initializing map...");
        initializeMap();
      };
      
      waitForContainer();
    };
    
    const initializeMap = () => {
      if (mapInstanceRef.current) {
        console.log("Map already initialized");
        setMapReady(true);
        return;
      }
      
      const container = mapRef.current;
      if (!container) {
        console.error("Container lost reference");
        return;
      }
      
      // Get container dimensions
      const rect = container.getBoundingClientRect();
      console.log("Container dimensions:", { width: rect.width, height: rect.height });
      
      if (rect.width === 0 || rect.height === 0) {
        console.warn("Container has zero dimensions, retrying...");
        setTimeout(initializeMap, 200);
        return;
      }
      
      try {
        // Remove any existing Leaflet instance
        if (container._leaflet_id) {
          console.log("Removing stale Leaflet instance");
          delete container._leaflet_id;
        }
        
        console.log("Creating new Leaflet map...");
        const map = window.L.map(container, {
          center: [mapCenter.lat, mapCenter.lng],
          zoom: mapCenter.zoom,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true // Better performance
        });
        
        console.log("Adding tile layer...");
        const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          crossOrigin: true
        });
        
        tileLayer.addTo(map);
        
        // Wait for tiles to start loading
        tileLayer.on('tileloadstart', () => {
          console.log("Tiles started loading");
        });
        
        tileLayer.on('load', () => {
          console.log("Initial tiles loaded");
        });
        
        mapInstanceRef.current = map;
        setMapReady(true);
        
        // Force a proper resize
        setTimeout(() => {
          console.log("Forcing map resize and redraw");
          map.invalidateSize(true);
          map.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom);
        }, 100);
        
        console.log("✅ Map initialization complete!");
        
      } catch (err) {
        console.error("Failed to initialize map:", err);
        setError(`Map initialization failed: ${err.message}`);
        setLoading(false);
      }
    };
    
    // Start the initialization process
    checkLeafletAndInit();
    
    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        try {
          console.log("Removing map instance");
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          setMapReady(false);
        } catch (err) {
          console.error("Error removing map:", err);
        }
      }
    };
  }, []); // Empty deps to run once on mount

  // Update map view when center changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom);
    }
  }, [mapCenter]);

  // Add markers when locations change OR map becomes ready
  useEffect(() => {
    console.log("Marker effect triggered", { 
      mapReady, 
      hasMapInstance: !!mapInstanceRef.current, 
      locationCount: locations.length 
    });

    if (!mapInstanceRef.current || !mapReady) {
      console.log("Waiting for map to be ready before adding markers");
      return;
    }

    if (locations.length === 0) {
      console.log("No locations to display yet");
      return;
    }

    // Small delay to ensure map is fully rendered
    const timeoutId = setTimeout(() => {
      console.log(`Adding ${locations.length} markers to map`);

      // Clear existing markers
      markersRef.current.forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      markersRef.current = [];
      markerMapRef.current.clear();

      let addedCount = 0;

      // Add new markers
      locations.forEach((founder) => {
        if (!founder.coords?.lat || !founder.coords?.lng) {
          console.log(`Skipping founder ${founder.businessName} - missing coordinates`);
          return;
        }

        try {
          const marker = window.L.marker([founder.coords.lat, founder.coords.lng])
            .addTo(mapInstanceRef.current);

          const popupContent = `
            <div style="font-size: 14px; max-width: 280px;">
              ${founder.photo ? `
                <div style="text-align: center; margin-bottom: 8px;">
                  <img src="${founder.photo}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 4px;" />
                </div>
              ` : ''}
              <div style="font-weight: bold; margin-bottom: 6px; font-size: 16px;">🏆 ${founder.businessName || 'Business'}</div>
              <div style="margin-bottom: 4px;"><strong>Founder:</strong> ${founder.founderName || 'Unknown'}</div>
              <div style="margin-bottom: 4px;"><strong>Quarter:</strong> ${founder.quarter || 'N/A'}</div>
              ${founder.zipCode ? `<div style="margin-bottom: 4px;"><strong>Location:</strong> ${founder.zipCode}</div>` : ''}
              ${founder.chapter ? `<div style="margin-bottom: 4px;"><strong>Chapter:</strong> ${founder.chapter}</div>` : ''}
              ${founder.about ? `
                <div style="margin: 8px 0; padding: 8px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px;">
                  <strong>About:</strong> ${founder.about}
                </div>
              ` : ''}
              ${founder.website ? `
                <div style="margin-top: 8px;">
                  <a href="${founder.website.startsWith('http') ? founder.website : `https://${founder.website}`}" target="_blank" style="color: #0066cc; text-decoration: none;">
                    Visit Website →
                  </a>
                </div>
              ` : ''}
            </div>
          `;

          marker.bindPopup(popupContent);
          
          marker.on('click', () => {
            setSelectedFounder(founder);
          });

          markersRef.current.push(marker);
          markerMapRef.current.set(founder.id, marker);
          addedCount++;
        } catch (err) {
          console.error(`Failed to add marker for ${founder.businessName}:`, err);
        }
      });

      console.log(`✅ Successfully added ${addedCount} markers`);
      
      // Force a map update
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200); // Small delay to ensure map is ready

    return () => clearTimeout(timeoutId);
  }, [locations, mapReady]); // Add mapReady as dependency

  // Fetch founders data
  useEffect(() => {
    const fetchFounders = async () => {
      // Wait for zipcode data to load
      if (!zipcodeData) {
        console.log("Waiting for zipcode data before fetching founders...");
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const q = query(
          collection(db, "pitches"),
          where("isWinner", "==", true)
        );
        const snap = await getDocs(q);
        const data = [];
        
        console.log(`Found ${snap.docs.length} winner documents`);
        let skippedCount = 0;
        let usingLatLngCount = 0;
        let usingZipCount = 0;
        
        snap.docs.forEach((doc) => {
          const d = doc.data();
          let coords = null;
          
          // First try zip code
          const zipCode = d.zipCode || d.zip || d["zip-code"] || d.postalCode;
          if (zipCode) {
            coords = getCoordinatesFromZip(zipCode);
            if (coords) {
              usingZipCount++;
              console.log(`Using zip ${zipCode} for ${d.businessName || d["business-name"]}`);
            }
          }
          
          // Fall back to lat/lng if available and zip lookup failed
          if (!coords && d.latitude && d.longitude) {
            coords = { lat: d.latitude, lng: d.longitude };
            usingLatLngCount++;
            console.log(`Using lat/lng for ${d.businessName || d["business-name"]} (zip lookup failed)`);
          }
          
          if (coords) {
            data.push({
              ...d,
              id: doc.id,
              coords: coords,
              zipCode: zipCode,
              quarter: getQuarterFromTimestamp(d.createdAt),
              photo: d["pitch-photo"] || d.photo,
              businessName: d.businessName || d["business-name"],
              founderName: d.founderName || d["founder-name"]
            });
          } else {
            skippedCount++;
            console.log(`Skipped ${d.businessName || d["business-name"] || 'unnamed'} - no zip or coords`, {
              zip: zipCode,
              lat: d.latitude,
              lng: d.longitude
            });
          }
        });
        
        console.log(`Location data summary:
          - ${usingZipCount} founders located via zip code
          - ${usingLatLngCount} founders using lat/lng fallback
          - ${skippedCount} founders skipped (no location data)`);
        
        data.sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "")
        );
        
        console.log(`Fetched ${data.length} founders with location data`);
        setFounders(data);
        setLocations(data);
      } catch (err) {
        console.error("Error fetching founders:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFounders();
  }, [zipcodeData]); // Re-run when zipcode data loads

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
    console.log(`Business clicked: ${founder.businessName}`);
    setSelectedFounder(founder);
    
    if (mapInstanceRef.current && founder.coords) {
      // Center the map on the founder's location
      mapInstanceRef.current.setView([founder.coords.lat, founder.coords.lng], 14);
      
      // Find and open the corresponding marker popup
      const marker = markerMapRef.current.get(founder.id);
      if (marker) {
        console.log(`Opening popup for ${founder.businessName}`);
        // Small delay to allow map to center first
        setTimeout(() => {
          marker.openPopup();
          // Pan the map up slightly so popup is fully visible
          setTimeout(() => {
            mapInstanceRef.current.panBy([0, -100]);
          }, 100);
        }, 300);
      } else {
        console.log(`No marker found for founder ${founder.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        Loading map data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        <div style={{ textAlign: "center", color: "red" }}>
          <div>Error: {error}</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: "10px" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Sidebar */}
      <div style={{
        width: 250,
        borderRight: "1px solid #aaa",
        overflowY: "auto",
        padding: 10,
        backgroundColor: "#f9f9f9",
        flexShrink: 0
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 16,
          borderBottom: "1px solid #ccc",
          paddingBottom: 8,
        }}>
          Founders ({locations.length})
        </h3>
        <div style={{ overflowY: "auto", maxHeight: "calc(100% - 40px)" }}>
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
                backgroundColor: selectedFounder?.id === founder.id ? "#e3f2fd" : "#fff",
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
            </div>
          ))}
        </div>
      </div>

      {/* Map + Controls */}
      <div style={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        padding: 10,
        height: "100%",
        minWidth: 0
      }}>
        <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="Search founder or business"
            value={search}
            onChange={handleSearch}
            style={{ flexGrow: 1, padding: 6 }}
          />
          <select
            value={chapterFilter}
            onChange={handleChapterChange}
            style={{ padding: 6 }}
          >
            <option value="">All Chapters</option>
            <option value="Western New York">Western New York</option>
            <option value="Denver">Denver</option>
          </select>
        </div>

        <div
          ref={mapRef}
          style={{
            flexGrow: 1,
            borderRadius: 4,
            border: "2px solid #aaa",
            minHeight: "400px",
            backgroundColor: "#f0f0f0",
            backgroundImage: "repeating-linear-gradient(45deg, #e0e0e0 0px, #e0e0e0 10px, #f0f0f0 10px, #f0f0f0 20px)",
            position: "relative"
          }}
        >
          {!mapReady && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#666",
              fontSize: "14px",
              textAlign: "center",
              padding: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{ marginBottom: "10px" }}>🗺️</div>
              Map Container Ready<br/>
              <small>Initializing map...</small>
              <div style={{ marginTop: "10px", fontSize: "12px" }}>
                Check console for detailed logs
              </div>
              <button 
                onClick={() => window.location.reload()} 
                style={{
                  marginTop: "15px",
                  padding: "5px 15px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Refresh Map
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {expandedImage && (
        <div 
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
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </div>
  );
}