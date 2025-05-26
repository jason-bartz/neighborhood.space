// MobileLanding.jsx 
import React, { useState, useEffect, useRef, useCallback } from "react";
import StandalonePitchPage from "./StandalonePitchPage";
import MobileNeighborhoodResources from "./components/MobileNeighborhoodResources";
import MobileBuddyMessenger from "./components/MobileBuddyMessenger";
import MobileLPPortal from "./components/MobileLPPortal";
import MobileBootScreen from "./MobileBootScreen";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./App.css";

export default function MobileLanding({ initialBootDone = false }) {
  // Boot sequence state
  const [bootSequence, setBootSequence] = useState(initialBootDone ? "complete" : "booting");
  const [desktopReady, setDesktopReady] = useState(initialBootDone);
  
  // State management
  const [currentTime, setCurrentTime] = useState("");
  const [activeApp, setActiveApp] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [history, setHistory] = useState(["home"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showBuddyMessenger, setShowBuddyMessenger] = useState(false);
  const [showLPPortal, setShowLPPortal] = useState(false);
  const [awardees, setAwardees] = useState([]);
  const [filteredAwardees, setFilteredAwardees] = useState([]);
  const [awardeesLoading, setAwardeesLoading] = useState(false);
  const [awardeeChapterFilter, setAwardeeChapterFilter] = useState("");
  const [awardeeSearchTerm, setAwardeeSearchTerm] = useState("");
  const [marqueeRef, setMarqueeRef] = useState(null);
  const [awardeesMarqueeRef, setAwardeesMarqueeRef] = useState(null);
  
  // Boot sequence handling
  const handleBootProgress = (isPreloading) => {
    if (isPreloading) {
      setBootSequence("preloaded");
    } else {
      setBootSequence("complete");
      setTimeout(() => {
        setDesktopReady(true);
      }, 300);
    }
  };

  // Clock functionality
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(`${dateStr} ${timeStr} 2002`);
    };
    
    updateClock(); // Call once immediately
    const interval = setInterval(updateClock, 60000); // Then every minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Navigation functions
  const setPage = (page) => {
    const newHistory = [...history.slice(0, historyIndex + 1), page];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActiveTab(page); // Keep tab and page in sync
  };
  
  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setActiveTab(history[historyIndex - 1]); // Update active tab
    }
  };
  
  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setActiveTab(history[historyIndex + 1]); // Update active tab
    }
  };

  // Handle app opening (without sound)
  const handleOpenApp = (appName) => {
    setActiveApp(appName);
    // Removed sound effects for mobile
  };

  // Close active app and return to desktop
  const handleCloseApp = () => {
    setActiveApp(null);
  };

  // Load awardees from Firestore - memoized with useCallback
  const fetchAwardees = useCallback(async () => {
    setAwardeesLoading(true);
    
    try {
      const q = query(
        collection(db, "pitches"),
        where("isWinner", "==", true)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setAwardees([]);
        setFilteredAwardees([]);
        setAwardeesLoading(false);
        return;
      }
      
      const awardeesData = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Calculate quarter from timestamp
        let quarter = "Unknown Quarter";
        if (data.createdAt) {
          try {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const q = Math.floor(date.getMonth() / 3) + 1;
            quarter = `Q${q} ${date.getFullYear()}`;
          } catch (e) {
            console.error("Error parsing date for doc " + doc.id, e);
          }
        }
        
        awardeesData.push({
          id: doc.id,
          businessName: data.businessName || "Unnamed Business",
          founderName: data.founderName || "Unknown Founder",
          about: data.about || "",
          website: data.website || "",
          photoUrl: data["pitch-photo"] || data.founderPhotoUrl || "",
          chapter: data.chapter || "Unknown Chapter",
          quarter: quarter
        });
      });
      
      // Sort alphabetically by business name
      awardeesData.sort((a, b) => 
        a.businessName.localeCompare(b.businessName)
      );
      
      setAwardees(awardeesData);
      setFilteredAwardees(awardeesData);
    } catch (error) {
      console.error("Error fetching awardees:", error);
    }
    
    setAwardeesLoading(false);
  }, []);

  // Fetch grant awardees whenever the awardees page is visited
  useEffect(() => {
    if (activeTab === "awardees" && awardees.length === 0) {
      fetchAwardees();
    }
  }, [activeTab, awardees.length, fetchAwardees]);

  // Filter awardees based on search term and chapter
  useEffect(() => {
    if (awardees.length > 0) {
      const filtered = awardees.filter(awardee => {
        const matchesSearch = awardeeSearchTerm === "" || 
          awardee.businessName.toLowerCase().includes(awardeeSearchTerm.toLowerCase()) ||
          awardee.founderName.toLowerCase().includes(awardeeSearchTerm.toLowerCase());
        
        const matchesChapter = awardeeChapterFilter === "" || 
          awardee.chapter === awardeeChapterFilter;
        
        return matchesSearch && matchesChapter;
      });
      
      setFilteredAwardees(filtered);
    }
  }, [awardeeSearchTerm, awardeeChapterFilter, awardees]);

  // Marquee effects for press mentions and awardees
  useEffect(() => {
    if (activeTab === "home") {
      // Press mentions marquee animation
      const animatePressMarquee = () => {
        if (marqueeRef) {
          if (marqueeRef.scrollLeft >= marqueeRef.scrollWidth / 2) {
            marqueeRef.scrollLeft = 0;
          } else {
            marqueeRef.scrollLeft += 1;
          }
        }
      };
      
      // Awardees marquee animation - slightly slower speed
      const animateAwardeesMarquee = () => {
        if (awardeesMarqueeRef) {
          if (awardeesMarqueeRef.scrollLeft >= awardeesMarqueeRef.scrollWidth / 2) {
            awardeesMarqueeRef.scrollLeft = 0;
          } else {
            awardeesMarqueeRef.scrollLeft += 0.7; // Slightly slower speed
          }
        }
      };
      
      const pressIntervalId = marqueeRef ? setInterval(animatePressMarquee, 30) : null;
      const awardeesIntervalId = awardeesMarqueeRef ? setInterval(animateAwardeesMarquee, 30) : null;
      
      return () => {
        if (pressIntervalId) clearInterval(pressIntervalId);
        if (awardeesIntervalId) clearInterval(awardeesIntervalId);
      };
    }
  }, [marqueeRef, awardeesMarqueeRef, activeTab]);

  // Press mentions data - complete data from BrowserWindow.jsx
  const pressLinks = [
    {
      title: "Buffalo News",
      url: "https://buffalonews.com/news/local/business/good-neighbor-fund-will-give-1-000-grants-to-entrepreneurs/article_b7c4f284-a900-11ed-ad61-8f0cb76d8c3e.html",
      logo: "/assets/press/buffalo-news.webp"
    },
    {
      title: "Buffalo Rising",
      url: "https://www.buffalorising.com/2023/01/the-good-neighbor-fund-micro-grants-for-start-ups/",
      logo: "/assets/press/buffalo-rising.webp"
    },
    {
      title: "Buffalo Business Journal",
      url: "https://www.bizjournals.com/buffalo/inno/stories/news/2023/01/20/good-neighbor-fund-micro-grant-program-launches.html",
      logo: "/assets/press/buffalo-business.webp"
    },
    {
      title: "Invest Buffalo Niagara",
      url: "https://podcasts.apple.com/us/podcast/jason-bartz-on-good-neighbor-fund/id1260713044?i=1000618789834",
      logo: "/assets/press/invest-buffalo.webp"
    },
    {
      title: "Denver Post",
      url: "https://www.denverpost.com/2023/02/21/denver-microgrants-entrepreneurs-good-neighbor-fund/",
      logo: "/assets/press/denver-post.webp"
    },
    {
      title: "Colorado Sun",
      url: "https://coloradosun.com/2023/08/05/denver-venture-capital-impact-investment/",
      logo: "/assets/press/colorado-sun.webp"
    }
  ];


  // Desktop Icons render function - Mac OS X style
  const renderDesktopIcon = (icon, label, onClick, size = 40) => (
    <div 
      className="mobile-desktop-icon"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: size + 12,
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        zIndex: 1
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = "scale(1.15) translateY(-6px)";
        e.currentTarget.style.zIndex = "10";
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.zIndex = "1";
        setTimeout(() => {
          if (e.currentTarget) {
            e.currentTarget.style.zIndex = "1";
          }
        }, 200);
      }}
    >
      {/* Icon container with subtle reflection effect */}
      <div style={{
        position: "relative",
        marginBottom: "2px"
      }}>
        <img 
          src={icon} 
          alt={label}
          style={{ 
            width: size, 
            height: size, 
            objectFit: "contain",
            filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.3))",
            position: "relative",
            zIndex: 2
          }} 
        />
        {/* Subtle reflection effect */}
        <div style={{
          position: "absolute",
          bottom: -8,
          left: 0,
          width: "100%",
          height: "12px",
          background: `radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)`,
          transform: "scaleY(0.3)",
          zIndex: 1,
          opacity: 0.5
        }}></div>
      </div>
      <span style={{ 
        fontSize: "10px", 
        marginTop: "4px", 
        color: "#fff", 
        textAlign: "center",
        textShadow: "0 1px 2px rgba(0,0,0,0.7)",
        maxWidth: size + 12,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        fontWeight: "bold"
      }}>
        {label}
      </span>
    </div>
  );


  // Render appropriate content based on active tab
  // Common style for all tab content
  const commonFontStyle = {
    fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
  };

  const renderTabContent = () => {
    const currentPage = activeTab;
    
    switch (currentPage) {
      case "home":
        return (
          <>
            <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Good Neighbor Fund - $1,000 Micro-Grants for Buffalo and Denver Startups</h1>
            {/* Hero Section */}
            <div style={{ 
              background: "linear-gradient(135deg, #ffeaf9, #e6f2ff)", 
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "15px"
            }}>
              <h2 style={{ 
                fontSize: "16px", 
                marginTop: 0,
                marginBottom: "10px",
                background: "linear-gradient(to right, #ff00cc, #3333cc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "1px 1px 0px rgba(255,255,255,0.5)"
              }}>
                $1,000 Micro-Grants for Bold Business Ideas 💫
              </h2>
              
              <p style={{ 
                fontSize: "12px", 
                lineHeight: "1.4",
                marginBottom: "12px"
              }}>
                <strong>We back brilliant ideas before they're "ready."</strong> No pitch deck required.
                No equity taken. Just belief in your vision and potential.
              </p>
              
              <button 
                onClick={() => handleOpenApp("submit")} 
                style={{ 
                  background: "#FFD6EC", 
                  border: "none", 
                  borderRadius: "30px", 
                  padding: "8px 15px", 
                  fontSize: "12px", 
                  fontWeight: "bold", 
                  cursor: "pointer",
                  fontFamily: "Comic Sans MS",
                  color: "#222",
                  boxShadow: "0 2px 5px rgba(255,112,176,0.3)",
                }}
              >
                🦄 Submit Your Pitch Today!
              </button>
            </div>
            
            {/* Impact Stats Section */}
            <div style={{ 
              background: "linear-gradient(to bottom right, #f0faff, #eaf5ff)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "15px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
            }}>
              <h3 style={{ 
                color: "#0066aa", 
                marginTop: 0,
                marginBottom: "10px",
                fontSize: "14px",
                textAlign: "center"
              }}>
                Our Impact Since 2023
              </h3>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)", 
                gap: "8px",
                textAlign: "center"
              }}>
                <div style={{ 
                  background: "#ffffff", 
                  padding: "8px", 
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#0082d4", display: "block" }}>25</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>Ideas Funded</span>
                </div>
                
                <div style={{ 
                  background: "#ffffff", 
                  padding: "8px", 
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#d400aa", display: "block" }}>80%</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>Women-Owned</span>
                </div>
                
                <div style={{ 
                  background: "#ffffff", 
                  padding: "8px", 
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#ff6d00", display: "block" }}>52%</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>BIPOC-Owned</span>
                </div>
                
                <div style={{ 
                  background: "#ffffff", 
                  padding: "8px", 
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#6200ea", display: "block" }}>$25K+</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>Grants Awarded</span>
                </div>
              </div>
            </div>


            {/* How It Works Section */}
            <div style={{ 
              background: "#fff8e6", 
              padding: "12px", 
              borderRadius: "8px", 
              marginBottom: "15px",
              border: "1px dashed #ffe0b2"
            }}>
              <h3 style={{ 
                marginTop: 0, 
                textAlign: "center",
                color: "#874A00",
                fontSize: "14px"
              }}>
                How It Works 💡
              </h3>
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                textAlign: "center",
                gap: "8px"
              }}>
                <div style={{ 
                  flex: "1", 
                  background: "white",
                  padding: "8px 6px",
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "5px" }}>📝</div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#874A00", fontSize: "12px" }}>1.Submit</h4>
                  <p style={{ fontSize: "10px", margin: 0 }}>Upload a simple 60-sec pitch video</p>
                </div>
                
                <div style={{ 
                  flex: "1", 
                  background: "white",
                  padding: "8px 6px",
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "5px" }}>👀</div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#874A00", fontSize: "12px" }}>2.Review</h4>
                  <p style={{ fontSize: "10px", margin: 0 }}>LPs review each quarter</p>
                </div>
                
                <div style={{ 
                  flex: "1", 
                  background: "white",
                  padding: "8px 6px",
                  borderRadius: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "5px" }}>💸</div>
                  <h4 style={{ margin: "0 0 5px 0", color: "#874A00", fontSize: "12px" }}>3.Award</h4>
                  <p style={{ fontSize: "10px", margin: 0 }}>Receive a $1,000 micro-grant</p>
                </div>
              </div>
            </div>
            
            {/* Press Mentions with horizontal scrolling marquee */}
            <div style={{ 
              marginBottom: "15px", 
              background: "linear-gradient(to right, #f8f8f8, #fff)",
              borderRadius: "8px",
              padding: "12px"
            }}>
              <h3 style={{ 
                textAlign: "center", 
                marginTop: 0,
                marginBottom: "10px",
                color: "#333",
                fontSize: "14px"
              }}>
                As Featured In 
              </h3>
              
              <div 
                ref={ref => setMarqueeRef(ref)}
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "flex", gap: "15px" }}>
                  {pressLinks.map((press, index) => (
                    <a 
                      key={`press-${press.title}-${index}`}
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        opacity: 0.8,
                        height: "40px", 
                        display: "flex",
                        alignItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {press.logo ? (
                        <img 
                          src={press.logo} 
                          alt={`${press.title} logo - Good Neighbor Fund press coverage`} 
                          style={{ 
                            height: "100%",
                            maxWidth: "120px",
                            objectFit: "contain"
                          }} 
                        />
                      ) : (
                        <span style={{ fontSize: "12px", color: "#555" }}>{press.title}</span>
                      )}
                    </a>
                  ))}
                </div>
                {/* Duplicate content for seamless loop */}
                <div style={{ display: "flex", gap: "15px" }}>
                  {pressLinks.map((press, index) => (
                    <a 
                      key={`dup-press-${press.title}-${index}`}
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        opacity: 0.8,
                        height: "40px", 
                        display: "flex",
                        alignItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {press.logo ? (
                        <img 
                          src={press.logo} 
                          alt={`${press.title} logo - Good Neighbor Fund press coverage`} 
                          style={{ 
                            height: "100%",
                            maxWidth: "120px",
                            objectFit: "contain"
                          }} 
                        />
                      ) : (
                        <span style={{ fontSize: "12px", color: "#555" }}>{press.title}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Testimonial */}
            <div style={{ 
              background: "#eef9ee", 
              padding: "15px", 
              borderRadius: "8px",
              border: "1px solid #c8e6c9",
              position: "relative",
              marginBottom: "15px",
              fontSize: "12px"
            }}>
              <div style={{ 
                fontSize: "24px", 
                color: "rgba(0,150,50,0.1)", 
                position: "absolute", 
                top: "8px", 
                left: "10px" 
              }}>❝</div>
              
              <blockquote style={{ 
                fontStyle: "italic", 
                fontSize: "12px", 
                lineHeight: "1.4", 
                margin: "0 0 10px 0",
                paddingLeft: "15px"
              }}>
                "The Good Neighbor Fund grant that I received was far more than a financial contribution to jump starting my business. It provided validation for an idea & passion that I have had for some time and support and encouragement to realize a dream of entrepreneurship after a 22 year teaching career. The grant money, resources and connections have been invaluable to help the seeds of my business grow and I feel blessed to be a part of this community of Good Neighbors.c"
              </blockquote>
              
              <div style={{ 
                display: "flex", 
                alignItems: "center",
                gap: "10px",
                marginTop: "10px"
              }}>
                <div style={{ 
                  width: "30px", 
                  height: "30px", 
                  borderRadius: "50%", 
                  background: "#c8e6c9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px"
                }}>
                  🌱
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "12px" }}>Tracy Csavina</strong>
                  <span style={{ fontSize: "10px", color: "#555" }}>Founder @ Sustainably Rooted LLC</span>
                </div>
              </div>
            </div>
            
            {/* Featured Awardees with auto-scroll */}
            <div style={{ 
              marginBottom: "15px", 
              borderRadius: "8px",
              border: "1px solid #eee",
              padding: "12px"
            }}>
              <h3 style={{ 
                textAlign: "center", 
                marginTop: 0,
                marginBottom: "10px",
                color: "#333",
                fontSize: "14px"
              }}>
                Neighborhood Dreams at Work 🌈
              </h3>
              
              {/* Auto-scrolling awardees marquee */}
              <div 
                ref={ref => setAwardeesMarqueeRef(ref)}
                style={{ 
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  position: "relative"
                }}
              >
                {/* First set of images */}
                <div style={{ display: "inline-flex", gap: "20px", padding: "0 10px" }}>
                  {[
                    { src: "/assets/Ernies2.webp", alt: "Ernie's Pop Shop - Buffalo small business $1,000 grant winner from Good Neighbor Fund" },
                    { src: "/assets/BFR2.webp", alt: "Buffalo Fashion Runway - Western New York fashion startup funded by Good Neighbor Fund micro-grant" },
                    { src: "/assets/Trinas2.webp", alt: "Trina's Speedy Cleaning - Buffalo cleaning service business funded by Good Neighbor Fund $1,000 grant" },
                    { src: "/assets/gnf-kamil.webp", alt: "Kamil Social - Denver social media startup funded by Good Neighbor Fund micro-grant program" }
                  ].map((img, index) => (
                    <img 
                      key={`awardee-img-${index}`}
                      src={img.src} 
                      alt={img.alt} 
                      style={{ 
                        height: "100px", 
                        width: "100px",
                        borderRadius: "6px", 
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        objectFit: "cover",
                        flex: "0 0 auto"
                      }} 
                    />
                  ))}
                </div>
                
                {/* Duplicate images for seamless scrolling */}
                <div style={{ display: "inline-flex", gap: "20px", padding: "0 10px", marginLeft: "20px" }}>
                  {[
                    { src: "/assets/Ernies2.webp", alt: "Ernie's Pop Shop - Buffalo small business $1,000 grant winner from Good Neighbor Fund" },
                    { src: "/assets/BFR2.webp", alt: "Buffalo Fashion Runway - Western New York fashion startup funded by Good Neighbor Fund micro-grant" },
                    { src: "/assets/Trinas2.webp", alt: "Trina's Speedy Cleaning - Buffalo cleaning service business funded by Good Neighbor Fund $1,000 grant" },
                    { src: "/assets/gnf-kamil.webp", alt: "Kamil Social - Denver social media startup funded by Good Neighbor Fund micro-grant program" }
                  ].map((img, index) => (
                    <img 
                      key={`dup-awardee-img-${index}`}
                      src={img.src} 
                      alt={img.alt} 
                      style={{ 
                        height: "100px", 
                        width: "100px",
                        borderRadius: "6px", 
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        objectFit: "cover",
                        flex: "0 0 auto"
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ 
              background: "#fff0f5", 
              padding: "12px", 
              borderRadius: "8px", 
              marginBottom: "15px",
              border: "2px dashed #ffb6d9"
            }}>
              <h3 style={{ 
                textAlign: "center", 
                color: "#cc3366", 
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                A Collective of Good Neighbors 🤝
              </h3>
              <p style={{ fontSize: "12px", lineHeight: "1.5", textAlign: "center" }}>
                GNF is powered by a growing network of Limited Partners who pool their capital to fund quarterly micro-grants.
                No overhead. No staff. Just real people voting on the ideas they want to support.
              </p>
              <p style={{ fontSize: "11px", fontStyle: "italic", textAlign: "center", marginTop: "6px" }}>
                Every dollar goes to a founder. Every grant starts with a neighbor saying: “I believe in you.”
              </p>
            </div>
          </>
        );
        
      case "chapters":
        return (
          <div style={{ ...commonFontStyle, color: "#222", fontSize: "13px" }}>
            <h2 style={{ fontSize: "18px" }}>GNF Chapters</h2>
            <p>Good Neighbor Fund operates through local chapters, each with their own community of Limited Partners who review applications and select quarterly awardees.</p>
            
            {/* Chapter boxes */}
            <div style={{ marginBottom: "15px" }}>
              <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "16px", marginTop: 0 }}>Western New York</h3>
                <p style={{ margin: "8px 0", fontSize: "12px" }}><strong>Founded:</strong> 2023</p>
                <p style={{ margin: "8px 0", fontSize: "12px" }}>Where it all started, serving Buffalo and the surrounding 8 counties.</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button 
                    onClick={() => window.open('/wny', '_blank')} 
                    style={{ 
                      background: "#dceeff",
                      border: "2px outset #88bbdd",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "Comic Sans MS"
                    }}
                  >
                    Visit Chapter Page
                  </button>
                  <button 
                    onClick={() => window.open('https://airtable.com/app38xfYxu9HY6yT3/pagy7R4p6BCdXBpzF/form', '_blank')}
                    style={{ 
                      background: "#dceeff",
                      border: "2px outset #88bbdd",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "Comic Sans MS"
                    }}
                  >
                    Join Chapter
                  </button>
                </div>
              </div>
              
              <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}>
                <h3 style={{ fontSize: "16px", marginTop: 0 }}>Denver</h3>
                <p style={{ margin: "8px 0", fontSize: "12px" }}><strong>Founded:</strong> 2023</p>
                <p style={{ margin: "8px 0", fontSize: "12px" }}>Serving the greater Denver metropolitan area.</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button 
                    onClick={() => window.open('/denver', '_blank')} 
                    style={{ 
                      background: "#dceeff",
                      border: "2px outset #88bbdd",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "Comic Sans MS"
                    }}
                  >
                    Visit Chapter Page
                  </button>
                  <button 
                    onClick={() => window.open('https://airtable.com/app38xfYxu9HY6yT3/pagy7R4p6BCdXBpzF/form', '_blank')}
                    style={{ 
                      background: "#dceeff",
                      border: "2px outset #88bbdd",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "Comic Sans MS"
                    }}
                  >
                    Join Chapter
                  </button>
                </div>
              </div>
            </div>
            
            {/* How It Works */}
            <div style={{ background: "#e6f7ff", padding: "15px", border: "2px dashed #88ccff", borderRadius: "8px", marginBottom: "15px" }}>
              <h3 style={{ color: "#004488", marginTop: 0, fontSize: "15px" }}>How It Works</h3>
              <p style={{ fontSize: "12px" }}>GNF is a collective giving organization: a diverse group of founders, business executives, and creators that share a passion for entrepreneurship and community. Our LPs pool their own resources, knowledge, and networks. We meet quarterly to select new micro-grant award winners.</p>
            </div>
            
            {/* Start a Chapter */}
            <div style={{ background: "#fff0f5", padding: "15px", border: "2px groove #cc88aa", borderRadius: "8px", textAlign: "center" }}>
              <h3 style={{ color: "#cc3366", marginTop: 0, fontSize: "15px" }}>Start a Chapter in Your City</h3>
              <p style={{ fontSize: "12px" }}>Interested in launching a GNF chapter in your own community? We're always looking for passionate good neighbors to help spread the belief capital.</p>
              <div style={{ display: "flex", gap: "8px", flexDirection: "column", alignItems: "center", marginTop: "10px" }}>
                <button onClick={() => window.location.href = "https://airtable.com/app38xfYxu9HY6yT3/pagYPQAHYvAUxPfuX/form"} style={{ background: "#ffccee", border: "2px outset #ff99cc", borderRadius: "6px", padding: "8px 15px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", width: "90%", maxWidth: "250px" }}>✉️ Contact Us to Start a Chapter</button>
                <button onClick={() => window.open("https://jasonbartz.notion.site/Good-Neighbor-Fund-Chapter-Handbook-1fc6fdd6d4c680e2a523eb2cbd5cf365", "_blank")} style={{ background: "#ffccee", border: "2px outset #ff99cc", borderRadius: "6px", padding: "8px 15px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", width: "90%", maxWidth: "250px" }}>📖 View our New Chapter Handbook</button>
              </div>
            </div>
          </div>
        );
      
        
      case "awardees":
        return (
          <div style={{ ...commonFontStyle, color: "#222", fontSize: "13px" }}>
            <h2 style={{ fontSize: "18px" }}>Meet Our Grant Awardees 🏆</h2>
            
            <div style={{ background: "#fff8e1", padding: "15px", borderRadius: "8px", border: "1px solid #ffd54f", marginBottom: "15px" }}>
              <div style={{ fontSize: "12px" }}>
                <p>
                  We're proud to showcase our incredible Good Neighbor Fund grant recipients! Each of these remarkable entrepreneurs 
                  received $1,000 in belief capital to pursue their dreams and bring their business ideas to life.
                </p>
                <p>
                  These founders represent the vibrant, diverse entrepreneurial spirit we aim to nurture in our communities. 
                </p>
              </div>
            </div>
            
            {/* Simple Chapter Filter */}
            <div style={{ marginBottom: "15px", display: "flex", background: "#f5f5f5", padding: "10px", borderRadius: "6px" }}>
              <select
                value={awardeeChapterFilter}
                onChange={(e) => setAwardeeChapterFilter(e.target.value)}
                style={{ 
                  padding: "6px", 
                  border: "1px solid #ccc", 
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  flex: 1
                }}
              >
                <option value="">All Chapters</option>
                {[...new Set(awardees.map(a => a.chapter))].filter(Boolean).sort().map(chapter => (
                  <option key={chapter} value={chapter}>{chapter}</option>
                ))}
              </select>
            </div>
            
            {/* Loading State */}
            {awardeesLoading && (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <p>Loading grant awardees...</p>
              </div>
            )}
            
            {/* No Results */}
            {!awardeesLoading && filteredAwardees.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", background: "#f9f9f9", border: "1px dashed #ccc", borderRadius: "8px" }}>
                <p>No awardees match your criteria. Try adjusting your filters.</p>
              </div>
            )}
            
            {/* Awardees Cards */}
            <div style={{ display: "grid", gap: "15px" }}>
              {filteredAwardees.map(awardee => (
                <div key={awardee.id} style={{ 
                  background: "#fff", 
                  border: "1px solid #ddd", 
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {awardee.photoUrl && (
                      <div style={{ width: "80px", marginBottom: "10px" }}>
                        <img 
                          src={awardee.photoUrl} 
                          alt={`${awardee.businessName} - ${awardee.chapter} Good Neighbor Fund $1,000 grant recipient`}
                          style={{ 
                            width: "80px", 
                            height: "80px", 
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #eee" 
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: "0 0 3px 0", color: "#00468b", fontSize: "15px" }}>
                        {awardee.businessName}
                      </h3>
                      <p style={{ margin: "0 0 8px 0", color: "#777", fontSize: "12px" }}>
                        by {awardee.founderName}
                      </p>
                      <div style={{ fontSize: "11px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                        <span>{awardee.chapter}</span>
                        <span>{awardee.quarter}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    margin: "10px 0", 
                    padding: "8px", 
                    background: "#f9f9f9", 
                    borderRadius: "6px",
                    fontSize: "11px"
                  }}>
                    <p style={{ margin: "0" }}>
                      {awardee.about}
                    </p>
                  </div>
                  
                  {awardee.website && (
                    <a 
                      href={awardee.website.startsWith('http') ? awardee.website : `http://${awardee.website}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        background: "#E6F7FF",
                        color: "#0070f3",
                        textDecoration: "none",
                        borderRadius: "4px",
                        border: "1px solid #0070f3",
                        fontWeight: "bold",
                        fontSize: "11px",
                        textAlign: "center",
                        marginTop: "auto"
                      }}
                    >
                      Visit Website →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case "donate":
        return (
          <div style={{ ...commonFontStyle, color: "#222", fontSize: "13px" }}>
            <h2 style={{ fontSize: "18px" }}>Support Our Mission 💖</h2>
            
            <div style={{ 
              background: "linear-gradient(135deg, #f5fcf5, #e8f5e8)",
              padding: "15px", 
              borderRadius: "8px", 
              marginBottom: "15px",
              border: "1px solid #c8e6c9",
              textAlign: "center"
            }}>
              <div style={{ 
                width: "50px", 
                height: "50px", 
                borderRadius: "50%",
                margin: "0 auto 10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#e8f5e9",
                border: "1px solid #c8e6c9"
              }}>
                <img 
                  src="/assets/donate.webp" 
                  alt="Donate to Good Neighbor Fund - Support Buffalo and Denver entrepreneurs" 
                  style={{ width: "30px", height: "30px", objectFit: "contain" }}
                />
              </div>
              
              <h3 style={{ 
                color: "#2E7D32", 
                fontSize: "15px",
                marginTop: "0",
                marginBottom: "10px" 
              }}>
                Growing Communities Through Belief Capital
              </h3>
              
              <p style={{ 
                fontSize: "12px",
                lineHeight: "1.4",
                margin: "0 0 10px 0"
              }}>
                We are a 100% volunteer-led organization. Your donation directly supports our Micro-Grant program 
                and helps nurture entrepreneurship in communities.
              </p>
            </div>
            
            {/* Donation Options */}
            <div style={{ 
              background: "#fff", 
              borderRadius: "8px", 
              padding: "15px",
              border: "1px solid #ddd",
              marginBottom: "15px"
            }}>
              <h3 style={{ 
                color: "#0277BD", 
                fontSize: "15px",
                marginTop: "0",
                borderBottom: "1px solid #E1F5FE",
                paddingBottom: "8px"
              }}>
                Make a One-Time Donation
              </h3>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
                <a 
                  href="https://buy.stripe.com/8wMaEW0mqaYB1jOaEH"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px 20px",
                    background: "linear-gradient(135deg, #635BFF, #8A84FF)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(99, 91, 255, 0.3)",
                    width: "100%",
                    maxWidth: "260px"
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.376 0 0 5.376 0 12C0 18.624 5.376 24 12 24C18.624 24 24 18.624 24 12C24 5.376 18.624 0 12 0ZM5.04 14.832C4.464 14.832 3.96 14.328 3.96 13.728C3.96 13.128 4.464 12.624 5.04 12.624H9.72C10.32 12.624 10.8 13.128 10.8 13.728C10.8 14.328 10.32 14.832 9.72 14.832H5.04ZM19.2 10.08C19.2 10.68 18.72 11.16 18.12 11.16H4.08C3.48 11.16 3 10.68 3 10.08C3 9.48 3.48 9 4.08 9H18.12C18.72 9 19.2 9.48 19.2 10.08ZM19.68 7.44C19.68 8.04 19.2 8.52 18.6 8.52H7.92C7.32 8.52 6.84 8.04 6.84 7.44C6.84 6.84 7.32 6.36 7.92 6.36H18.6C19.2 6.36 19.68 6.84 19.68 7.44Z" fill="white"/>
                  </svg>
                  Donate via Stripe
                </a>
              </div>
              
              <p style={{ fontSize: "10px", color: "#666", marginTop: "12px", textAlign: "center" }}>
                All transactions are processed through our fiscal sponsor, BootSector, a registered 501(c)3 non-profit (EIN: 85-4082950)
              </p>
            </div>
            
            {/* GNF Club Membership */}
            <div style={{ 
              background: "#fff", 
              borderRadius: "8px", 
              padding: "15px",
              border: "1px solid #ddd",
              marginBottom: "15px"
            }}>
              <h3 style={{ 
                color: "#9C27B0", 
                fontSize: "15px",
                marginTop: "0",
                borderBottom: "1px solid #F3E5F5",
                paddingBottom: "8px"
              }}>
                Become a GNF Club Member
              </h3>
              
              <div style={{ 
                background: "#F9F4FC", 
                borderRadius: "6px", 
                padding: "10px", 
                marginBottom: "10px",
                border: "1px solid #E1BEE7",
                fontSize: "11px"
              }}>
                <strong style={{ fontSize: "12px" }}>Membership Benefits:</strong>
                <ul style={{ 
                  paddingLeft: "20px", 
                  margin: "5px 0",
                  lineHeight: "1.4"
                }}>
                  <li>Free access to all GNF-hosted events</li>
                  <li>Private GNF Slack community</li>
                  <li>Social media shoutout</li>
                  <li>GNF Club stickers</li>
                </ul>
              </div>
              
              <div style={{ display: "flex", justifyContent: "center" }}>
                <a 
                  href="https://buy.stripe.com/dR68wO3yCgiVaUo6oq"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px 20px",
                    background: "linear-gradient(135deg, #9C27B0, #7B1FA2)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(156, 39, 176, 0.3)",
                    width: "100%",
                    maxWidth: "260px"
                  }}
                >
                  
                  Join the Club Today
                </a>
              </div>
            </div>
            
            {/* Tax Info & Corporate Sponsorship - Simplified for mobile */}
            <div style={{ 
              background: "#E3F2FD", 
              padding: "15px", 
              borderRadius: "8px",
              marginBottom: "15px",
              fontSize: "11px",
              textAlign: "center"
            }}>
              <h3 style={{ color: "#0D47A1", marginTop: "0", fontSize: "14px" }}>Corporate Sponsorship</h3>
              <p>
                Looking to make a larger impact? Our corporate sponsorship program offers various 
                levels of involvement. Partner with us to support entrepreneurship in your community.
              </p>
              <a 
                href="mailto:jason@goodneighbor.fund?subject=Corporate%20Sponsorship%20Inquiry"
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  background: "#1976D2",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "11px",
                  marginTop: "5px"
                }}
              >
                Contact Us About Sponsorship
              </a>
            </div>
          </div>
        );
        
      default:
        return <div>Page not found</div>;
    }
  };

  // Boot screen
  if (bootSequence !== "complete" || !desktopReady) {
    return <MobileBootScreen onFinish={handleBootProgress} />;
  }

  return (
    <div className="mobile-desktop" style={{
      minHeight: "100vh",
      background: "url('/assets/gnf-wallpaper-blue.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Removed sound effects for mobile */}
      
      {/* Taskbar */}
      <div className="mobile-taskbar" style={{
        background: "#fcd6e2",
        padding: "5px 10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "2px solid #ecacc5",
        zIndex: 1000,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
      }}>
        <div className="taskbar-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/favicon.png" alt="Good Neighbor Fund logo" style={{ width: "16px", height: "16px" }} />
          <span style={{ fontWeight: "bold", fontSize: "12px" }}>NeighborhoodOS</span>
        </div>
        <div className="taskbar-right">
          <span style={{ fontWeight: "bold", fontSize: "12px" }}>{currentTime}</span>
        </div>
      </div>

      {/* If app is active, render that instead of main content */}
      {activeApp === "submit" ? (
        <StandalonePitchPage onClose={() => setActiveApp(null)} />
      ) : activeApp === "resources" ? (
        <MobileNeighborhoodResources onClose={() => setActiveApp(null)} />
      ) : (
        <>
          <div style={{ 
            flex: 1, 
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "10px 0",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}>
            {/* Main Content Window - Moved to top */}
            <div style={{
              background: "white",
              border: "2px solid #d48fc7",
              borderRadius: "8px",
              boxShadow: "4px 4px 0 #ffbde2",
              width: "94%",
              margin: "10px auto 15px auto",
              overflow: "hidden",
              flex: "1",
              display: "flex",
              flexDirection: "column"
            }}>
              {/* Window Title Bar */}
              <div style={{
                background: "#ffeaf5",
                borderBottom: "1px solid #d48fc7",
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <img
                    src="/assets/icon-browser.webp"
                    alt="Neighborhood Navigator browser window"
                    style={{ height: "14px", marginRight: "6px" }}
                  />
                  Neighborhood Navigator
                </div>
                <button style={{
                  background: "#ffbde2",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  padding: "0 4px",
                  fontSize: "12px"
                }}>
                  ✖
                </button>
              </div>
              
              {/* Browser Controls */}
              <div style={{ background: "#c0c0c0", padding: "5px", display: "flex", gap: "5px", alignItems: "center", borderBottom: "1px solid #888", flexShrink: 0 }}>
                <button onClick={goBack} disabled={historyIndex === 0} style={{fontSize: "12px", padding: "2px 5px"}}>⬅️</button>
                <button onClick={goForward} disabled={historyIndex === history.length - 1} style={{fontSize: "12px", padding: "2px 5px"}}>➡️</button>
                <button onClick={() => window.location.reload()} style={{fontSize: "12px", padding: "2px 5px"}}>🔄</button>
                <button onClick={() => setPage("home")} style={{fontSize: "12px", padding: "2px 5px"}}>🏠</button>
              </div>
              
              {/* Tab Navigation */}
              <div style={{ 
                display: "flex", 
                borderBottom: "1px solid #ddd", 
                background: "#f8f8f8", 
                padding: "0 5px", 
                fontSize: "11px",
                overflowX: "auto",
                flexWrap: "nowrap",
                whiteSpace: "nowrap"
              }}>
                <button 
                  onClick={() => setPage("home")}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    borderBottom: activeTab === "home" ? "3px solid #FFD6EC" : "3px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    fontWeight: activeTab === "home" ? "bold" : "normal",
                    fontSize: "inherit",
                    fontFamily: "inherit"
                  }}
                >
                  Home
                </button>
                <button 
                  onClick={() => setPage("chapters")}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    borderBottom: activeTab === "chapters" ? "3px solid #FFD6EC" : "3px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    fontWeight: activeTab === "chapters" ? "bold" : "normal",
                    fontSize: "inherit",
                    fontFamily: "inherit"
                  }}
                >
                  Chapters
                </button>
                <button 
                  onClick={() => setPage("awardees")}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    borderBottom: activeTab === "awardees" ? "3px solid #FFD6EC" : "3px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    fontWeight: activeTab === "awardees" ? "bold" : "normal",
                    fontSize: "inherit",
                    fontFamily: "inherit"
                  }}
                >
                  Grant Awardees
                </button>
                <button 
                  onClick={() => setPage("donate")}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    borderBottom: activeTab === "donate" ? "3px solid #FFD6EC" : "3px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    fontWeight: activeTab === "donate" ? "bold" : "normal",
                    fontSize: "inherit",
                    fontFamily: "inherit"
                  }}
                >
                  Donate
                </button>
              </div>
              
              {/* Window Content */}
              <div style={{ padding: "15px", overflowY: "auto", flex: 1 }}>
                {renderTabContent()}
              </div>
            </div>
            
            {/* Quick Links Dock - Mac OS X style */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              padding: "8px 12px",
              background: "linear-gradient(to bottom, rgba(100, 100, 100, 0.7), rgba(50, 50, 50, 0.8))",
              margin: "0 auto 15px auto",
              width: "90%",
              maxWidth: "380px",
              borderRadius: "10px",
              border: "1px solid rgba(180, 180, 180, 0.5)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              transform: "perspective(800px) rotateX(5deg)",
              transformOrigin: "bottom center",
              position: "relative",
              zIndex: 10
            }}>
              {/* Glossy reflection overlay */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "50%",
                background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05))",
                borderTopLeftRadius: "10px",
                borderTopRightRadius: "10px",
                pointerEvents: "none"
              }}></div>
              
              {/* Dock shadow */}
              <div style={{
                position: "absolute",
                bottom: "-5px",
                left: "5%",
                right: "5%",
                height: "10px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.3)",
                filter: "blur(3px)",
                transform: "scaleY(0.3)",
                pointerEvents: "none",
                zIndex: -1
              }}></div>
              
              {renderDesktopIcon("/assets/icon-submit.webp", "Pitch", () => handleOpenApp("submit"), 30)}
              {renderDesktopIcon("/assets/icon-map.webp", "Info", () => handleOpenApp("resources"), 30)}
              {renderDesktopIcon("/assets/BuddyMessenger-icon.webp", "Chat", () => {
                // No sound effect on mobile
                setShowBuddyMessenger(true);
              }, 30)}
              {renderDesktopIcon("/assets/icon-review.webp", "For LPs", () => {
                // No sound effect on mobile
                setShowLPPortal(true);
              }, 30)}
              {renderDesktopIcon("/assets/instagram.webp", "Insta", () => window.open("https://www.instagram.com/goodneighborfund/", "_blank"), 30)}
              {renderDesktopIcon("/assets/linkedin.webp", "LinkedIn", () => window.open("https://www.linkedin.com/company/good-neighbor-fund", "_blank"), 30)}
            </div>
          </div>
        </>
      )}

      {/* Donate Modal */}
      {showDonateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }} onClick={() => setShowDonateModal(false)}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "15px",
            maxWidth: "85%",
            maxHeight: "80%",
            width: "300px",
            overflow: "auto"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px"
            }}>
              <span style={{ fontWeight: "bold" }}>Donate to GNF 💖</span>
              <button onClick={() => setShowDonateModal(false)} style={{
                background: "#ffb6c1",
                border: "none",
                padding: "2px 6px",
                borderRadius: "4px"
              }}>✖</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <p>Support our micro-grant program:</p>
              <div style={{ width: "100%", maxWidth: "220px", marginTop: "10px" }}>
                <a 
                  href="https://buy.stripe.com/8wMaEW0mqaYB1jOaEH"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px 20px",
                    background: "linear-gradient(135deg, #635BFF, #8A84FF)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(99, 91, 255, 0.3)",
                    width: "100%"
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.376 0 0 5.376 0 12C0 18.624 5.376 24 12 24C18.624 24 24 18.624 24 12C24 5.376 18.624 0 12 0ZM5.04 14.832C4.464 14.832 3.96 14.328 3.96 13.728C3.96 13.128 4.464 12.624 5.04 12.624H9.72C10.32 12.624 10.8 13.128 10.8 13.728C10.8 14.328 10.32 14.832 9.72 14.832H5.04ZM19.2 10.08C19.2 10.68 18.72 11.16 18.12 11.16H4.08C3.48 11.16 3 10.68 3 10.08C3 9.48 3.48 9 4.08 9H18.12C18.72 9 19.2 9.48 19.2 10.08ZM19.68 7.44C19.68 8.04 19.2 8.52 18.6 8.52H7.92C7.32 8.52 6.84 8.04 6.84 7.44C6.84 6.84 7.32 6.36 7.92 6.36H18.6C19.2 6.36 19.68 6.84 19.68 7.44Z" fill="white"/>
                  </svg>
                  Donate via Stripe
                </a>
              </div>
              <p style={{ fontSize: "12px", color: "#666", marginTop: "15px", textAlign: "center" }}>
                Tax deductible through our fiscal sponsor, BootSector (EIN: 85-4082950)
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Buddy Messenger Modal */}
      {showBuddyMessenger && (
        <MobileBuddyMessenger onClose={() => setShowBuddyMessenger(false)} />
      )}

      {/* LP Portal Modal */}
      {showLPPortal && (
        <MobileLPPortal onClose={() => setShowLPPortal(false)} />
      )}
    </div>
  );
}