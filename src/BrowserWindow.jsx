import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebaseConfig"; 

export default function BrowserWindow({ onClose, onPitchClick, windowId, zIndex, bringToFront }) {
  const [history, setHistory] = useState(["home"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [awardees, setAwardees] = useState([]);
  const [filteredAwardees, setFilteredAwardees] = useState([]);
  const [awardeesLoading, setAwardeesLoading] = useState(false);
  const [awardeeChapterFilter, setAwardeeChapterFilter] = useState("");
  const [awardeeSearchTerm, setAwardeeSearchTerm] = useState("");
  const [currentMarqueeIndex, setCurrentMarqueeIndex] = useState(0);

  const currentPage = history[historyIndex];
  const marqueeImages = [];


  // Press mentions data
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

  // Advance the marquee every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMarqueeIndex((prevIndex) =>
        marqueeImages.length > 0
          ? (prevIndex + 1) % marqueeImages.length
          : 0
      );
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const setPage = (page) => {
    const newHistory = [...history.slice(0, historyIndex + 1), page];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const handleWindowClick = () => {
    if (windowId && bringToFront) {
      bringToFront(windowId);
    }
  };

  // Fetch grant awardees whenever the awardees page is visited
  useEffect(() => {
    if (currentPage === "awardees" && awardees.length === 0) {
      fetchAwardees();
    }
  }, [currentPage, awardees.length]);


  // Load awardees from Firestore
  const fetchAwardees = async () => {
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
  };

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

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onPitchClick={onPitchClick} pressLinks={pressLinks} marqueeImages={marqueeImages} currentMarqueeIndex={currentMarqueeIndex} />;
      case "chapters":
        return <ChaptersPage setPage={setPage} />;
      case "awardees":
        return <AwardeesPage 
                awardees={filteredAwardees} 
                loading={awardeesLoading} 
                chapters={[...new Set(awardees.map(a => a.chapter))].filter(Boolean).sort()}
                searchTerm={awardeeSearchTerm}
                setSearchTerm={setAwardeeSearchTerm}
                chapterFilter={awardeeChapterFilter}
                setChapterFilter={setAwardeeChapterFilter}
               />;
      case "donate":
        return <DonatePage />;
      case "wny":
        return <WnyChapterPage />;
      case "denver":
        return <DenverChapterPage />;
      default:
        return <HomePage onPitchClick={onPitchClick} pressLinks={pressLinks} marqueeImages={marqueeImages} currentMarqueeIndex={currentMarqueeIndex} />;
    }
  };

  return (
    <div 
      style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      onClick={handleWindowClick}
    >
      {/* Menu Bar */}
      <div style={{ display: "flex", gap: "16px", padding: "4px 12px", backgroundColor: "#e0e0e0", borderBottom: "1px solid #888", fontSize: "12px", fontFamily: "'ChicagoFLF', monospace", flexShrink: 0 }}>
        <span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span>
      </div>
      {/* Browser Controls */}
      <div style={{ background: "#c0c0c0", padding: "5px 10px", display: "flex", gap: "8px", alignItems: "center", borderBottom: "1px solid #888", flexShrink: 0 }}>
        <button onClick={goBack} disabled={historyIndex === 0}>⬅️</button>
        <button onClick={goForward} disabled={historyIndex === history.length - 1}>➡️</button>
        <button onClick={() => window.location.reload()}>🔄</button>
        <button onClick={() => setPage("home")}>🏠</button>
      </div>
      {/* Address Bar */}
      <div style={{ background: "#fff", padding: "4px 10px", borderBottom: "1px solid #ccc", fontSize: "12px", fontFamily: "'ChicagoFLF', monospace", flexShrink: 0 }}>
        Url: http://www.neighborhoods.space/{currentPage === "home" ? "" : currentPage}
      </div>
      {/* Nav Buttons as Tabs */}
      <div style={{ background: "#f8f8f8", padding: "6px 12px", display: "flex", borderBottom: "1px solid #ddd", flexShrink: 0 }}>
        <button 
          onClick={() => setPage("home")}
          style={{
            background: currentPage === "home" ? "#fff" : "#e0e0e0",
            border: "1px solid #ccc",
            borderBottom: currentPage === "home" ? "1px solid #fff" : "1px solid #ccc",
            borderRadius: "4px 4px 0 0",
            padding: "4px 12px",
            marginRight: "4px",
            position: "relative",
            top: "1px",
            fontWeight: currentPage === "home" ? "bold" : "normal"
          }}
        >Home</button>
        <button 
          onClick={() => setPage("chapters")}
          style={{
            background: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "#fff" : "#e0e0e0",
            border: "1px solid #ccc",
            borderBottom: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "1px solid #fff" : "1px solid #ccc",
            borderRadius: "4px 4px 0 0",
            padding: "4px 12px",
            marginRight: "4px",
            position: "relative",
            top: "1px",
            fontWeight: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "bold" : "normal"
          }}
        >Chapters</button>
        <button 
          onClick={() => setPage("awardees")}
          style={{
            background: currentPage === "awardees" ? "#fff" : "#e0e0e0",
            border: "1px solid #ccc",
            borderBottom: currentPage === "awardees" ? "1px solid #fff" : "1px solid #ccc",
            borderRadius: "4px 4px 0 0",
            padding: "4px 12px",
            marginRight: "4px",
            position: "relative",
            top: "1px",
            fontWeight: currentPage === "awardees" ? "bold" : "normal"
          }}
        >Grant Awardees</button>
        <button 
          onClick={() => setPage("donate")}
          style={{
            background: currentPage === "donate" ? "#fff" : "#e0e0e0",
            border: "1px solid #ccc",
            borderBottom: currentPage === "donate" ? "1px solid #fff" : "1px solid #ccc",
            borderRadius: "4px 4px 0 0",
            padding: "4px 12px",
            marginRight: "4px",
            position: "relative",
            top: "1px",
            fontWeight: currentPage === "donate" ? "bold" : "normal"
          }}
        >Donate</button>
      </div>
      {/* Main Content */}
      <div className="force-comic-font" style={{ overflowY: "auto", padding: "16px", background: "#fff", minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </div>
    </div>
  );
}

const HomePage = ({ onPitchClick, pressLinks, marqueeImages, currentMarqueeIndex }) => (
  <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222" }}>
    {/* Hero Section */}
    <div style={{ 
      background: "linear-gradient(135deg, #ffeaf9, #e6f2ff)", 
      borderRadius: "12px",
      padding: "0",
      marginBottom: "30px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        minHeight: "340px"
      }}>
        {/* Left content */}
        <div style={{ 
          flex: "1",
          padding: "30px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}>
          <h1 style={{ 
            fontSize: "38px", 
            marginBottom: "20px",
            background: "linear-gradient(to right, #ff00cc, #3333cc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "1px 1px 0px rgba(255,255,255,0.5)"
          }}>
            $1,000 Micro-Grants for Bold Business Ideas 💫
          </h1>
          
          <p style={{ 
            fontSize: "18px", 
            lineHeight: "1.5",
            marginBottom: "25px"
          }}>
            <strong>We back brilliant ideas before they're "ready."</strong> No pitch deck required.
            No equity taken. Just belief in your vision and potential.
          </p>
          
          <button 
            onClick={onPitchClick} 
            style={{ 
              background: "#FFD6EC", 
              border: "none", 
              borderRadius: "30px", 
              padding: "14px 28px", 
              fontSize: "18px", 
              fontWeight: "bold", 
              cursor: "pointer",
              alignSelf: "flex-start",
              fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive",
              color: "#222",
              boxShadow: "0 4px 10px rgba(255,112,176,0.3)",
              position: "relative",
              transition: "transform 0.2s ease",
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            🦄 Submit Your Pitch Today!
          </button>
        </div>
        
        {/* Right hero image */}
        <div style={{ 
          flex: "1",
          position: "relative",
          overflow: "hidden",
          borderRadius: "0 12px 12px 0",
          background: "#FFD6EC",
          minHeight: "340px"
        }}>
          <img 
            src="/assets/gnf-fat-daddys.webp" 
            alt="Fat Daddy's, Micro-Grant Awardee" 
            style={{ 
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute"
            }} 
          />
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "15px",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            fontSize: "14px"
          }}>
            Fat Daddy's - Past Micro-Grant Awardee
          </div>
        </div>
      </div>
    </div>
    
    {/* Mission & Impact Section */}
    <div style={{ 
      display: "flex", 
      gap: "30px", 
      marginBottom: "30px",
      flexWrap: "wrap"
    }}>
      {/* Mission Column */}
      <div style={{ 
        flex: "1",
        minWidth: "300px", 
        background: "#f9f9f9",
        borderRadius: "10px",
        padding: "25px",
        border: "1px solid #eee"
      }}>
        <h2 style={{ 
          color: "#990099", 
          marginTop: 0,
          borderBottom: "2px solid #f0d6ff",
          paddingBottom: "10px"
        }}>
          Our Mission ✨
        </h2>
        
        <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
          Good Neighbor Fund is a micro-grant program that gives $1,000 in belief capital 
          to under-resourced founders with bold new business ideas.
        </p>
        
        <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
          We don't expect a pitch deck. We don't want equity. 
          We fund <em>you</em>: your idea, your energy, your potential.
        </p>
        
        <p style={{ fontSize: "16px", fontStyle: "italic", borderLeft: "3px solid #FFD6EC", paddingLeft: "15px" }}>
          Born in Buffalo, built for neighborhoods everywhere.
        </p>
      </div>
      
      {/* Impact Stats Column */}
      <div style={{ 
        flex: "1",
        minWidth: "300px", 
        background: "linear-gradient(to bottom right, #f0faff, #eaf5ff)",
        borderRadius: "10px",
        padding: "25px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ 
          color: "#0066aa", 
          marginTop: 0,
          textAlign: "center",
          marginBottom: "20px"
        }}>
          Our Impact Since 2023
        </h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: "20px",
          textAlign: "center"
        }}>
          <div style={{ 
            background: "#ffffff", 
            padding: "15px", 
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#0082d4", display: "block" }}>25</span>
            <span style={{ fontSize: "15px", color: "#555" }}>New Business Ideas Funded</span>
          </div>
          
          <div style={{ 
            background: "#ffffff", 
            padding: "15px", 
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#d400aa", display: "block" }}>80%</span>
            <span style={{ fontSize: "15px", color: "#555" }}>Women-Owned Businesses</span>
          </div>
          
          <div style={{ 
            background: "#ffffff", 
            padding: "15px", 
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#ff6d00", display: "block" }}>52%</span>
            <span style={{ fontSize: "15px", color: "#555" }}>BIPOC-Owned Businesses</span>
          </div>
          
          <div style={{ 
            background: "#ffffff", 
            padding: "15px", 
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
          }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#6200ea", display: "block" }}>$25,000+</span>
            <span style={{ fontSize: "15px", color: "#555" }}>In Micro-Grants Awarded</span>
          </div>
        </div>
      </div>
    </div>

    <div style={{ 
      background: "#fff0f5", 
      padding: "25px", 
      borderRadius: "10px", 
      marginBottom: "30px",
      border: "2px dashed #ffb6d9"
    }}>
      <h2 style={{ 
        textAlign: "center", 
        color: "#cc3366", 
        marginBottom: "15px"
      }}>
        Powered by People, Not Institutions 🤝
      </h2>
      <p style={{ fontSize: "16px", lineHeight: "1.6", textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
        Good Neighbor Fund is a collective giving organization. That means our funding doesn’t come from banks, VCs, or foundations—it comes from neighbors. 
        Our LPs (Limited Partners) chip in their own funds, meet quarterly to review applications, and help award $1,000 micro-grants to the ideas they believe in most.
      </p>
      <p style={{ fontSize: "15px", fontStyle: "italic", textAlign: "center", maxWidth: "700px", margin: "15px auto 0 auto" }}>
        No staff. No overhead. Just good people pooling belief capital to support the next wave of neighborhood builders.
      </p>
    </div>

    
    {/* Process Section */}
    <div style={{ 
      background: "#fff8e6", 
      padding: "25px", 
      borderRadius: "10px", 
      marginBottom: "30px",
      border: "1px dashed #ffe0b2"
    }}>
      <h2 style={{ 
        marginTop: 0, 
        textAlign: "center",
        color: "#874A00"
      }}>
        How It Works 💡
      </h2>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        textAlign: "center",
        gap: "20px",
        flexWrap: "wrap"
      }}>
        <div style={{ 
          flex: "1", 
          minWidth: "200px",
          background: "white",
          padding: "20px 15px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>📝</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#874A00" }}>1.Submit</h3>
          <p style={{ fontSize: "14px", margin: 0 }}>Complete our simple online form and upload a 60-second pitch video</p>
        </div>
        
        <div style={{ 
          flex: "1", 
          minWidth: "200px",
          background: "white",
          padding: "20px 15px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>👀</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#874A00" }}>2.Review</h3>
          <p style={{ fontSize: "14px", margin: 0 }}>Our LP teams review all submissions at the end of each quarter</p>
        </div>
        
        <div style={{ 
          flex: "1", 
          minWidth: "200px",
          background: "white",
          padding: "20px 15px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>💸</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#874A00" }}>3.Award</h3>
          <p style={{ fontSize: "14px", margin: 0 }}>Selected founders receive a $1,000 micro-grant with no strings attached</p>
        </div>
      </div>
      
      <p style={{ 
        fontStyle: "italic", 
        textAlign: "center", 
        margin: "25px 0 0 0"
      }}>
        This is not venture capital—we expect no return on investment. 
        This is <strong>belief capital</strong>: an endorsement of your potential.
      </p>
    </div>
    
    {/* Community Images */}
    <div style={{ 
      marginBottom: "30px", 
      background: "#f9f9f9", 
      borderRadius: "10px",
      padding: "25px",
      overflow: "hidden"
    }}>
      <h2 style={{ 
        textAlign: "center", 
        marginTop: 0,
        marginBottom: "20px",
        color: "#333"
      }}>
        Building Community 🏘️
      </h2>
      
      <div style={{ 
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(2, 180px)",
        gap: "15px",
        margin: "0 auto"
      }}>
        {/* First row */}
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/tp-sansi.webp"
            alt="Sansi Bansal, Twin Petrels Event"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/tm-group.webp"
            alt="Thin Man Brewery Event - Kickoff"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/tp-group.webp"
            alt="Twin Petrels Event"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        
        {/* Second row */}
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/lp-dinner.webp"
            alt="WNY Chapter, LP Dinner"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/kiln-panel.webp"
            alt="Kiln Pitch Event"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div style={{
          background: "#f0f0f0",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <img
            src="/assets/tp-panel.webp"
            alt="Twin Petrels Event - Founder Panel"
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover"
            }}
          />
        </div>
      </div>
    </div>
    
    
    {/* Press Mentions */}
    <div style={{ 
      marginBottom: "30px", 
      background: "linear-gradient(to right, #f8f8f8, #fff)",
      borderRadius: "10px",
      padding: "25px"
    }}>
      <h2 style={{ 
        textAlign: "center", 
        marginTop: 0,
        marginBottom: "20px",
        color: "#333"
      }}>
        As Featured In 
      </h2>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "center",
        alignItems: "center",
        gap: "25px",
        flexWrap: "wrap"
      }}>
        {pressLinks.map((press, index) => (
          <a 
            key={index}
            href={press.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              opacity: 0.8,
              transition: "opacity 0.2s ease, transform 0.2s ease",
              filter: "grayscale(100%)",
              height: "60px", 
              display: "flex",
              alignItems: "center"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.filter = "grayscale(0%)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = "0.8";
              e.currentTarget.style.filter = "grayscale(100%)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {press.logo ? (
              <img 
                src={press.logo} 
                alt={press.title} 
                style={{ 
                  height: "100%",
                  maxWidth: "240px", // Doubled from 120px
                  objectFit: "contain"
                }} 
              />
            ) : (
              <span style={{ fontSize: "14px", color: "#555" }}>{press.title}</span>
            )}
          </a>
        ))}
      </div>
    </div>

    {/* Featured Awardees with auto-scroll - Using CSS animation instead of JS */}
    <div style={{ 
      marginBottom: "30px", 
      borderRadius: "10px",
      border: "1px solid #eee",
      padding: "25px"
    }}>
      <h2 style={{ 
        textAlign: "center", 
        marginTop: 0,
        marginBottom: "20px",
        color: "#333"
      }}>
        Neighborhood Dreams at Work 🌈
      </h2>
      
      {/* Auto-scrolling awardees marquee using CSS animation */}
      <div style={{ 
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "5px 0",
        position: "relative"
      }}>
        <div style={{ 
          display: "inline-block",
          whiteSpace: "nowrap",
          animation: "marquee 30s linear infinite",
          animationFillMode: "forwards"
        }}>
          <img 
            src="/assets/Ernies2.webp" 
            alt="Ernie's Pop Shop, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/BFR2.webp" 
            alt="Buffalo Fashion Runway - Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/Trinas2.webp" 
            alt="Trina's Speedy Cleaning, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/gnf-kamil.webp" 
            alt="Kamil Social, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/muuvya.webp" 
            alt="Muuvya, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          {/* Duplicate for seamless scrolling */}
          <img 
            src="/assets/Ernies2.webp" 
            alt="Ernie's Pop Shop, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/BFR2.webp" 
            alt="Buffalo Fashion Runway - Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/Trinas2.webp" 
            alt="Trina's Speedy Cleaning, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/gnf-kamil.webp" 
            alt="Kamil Social, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
          <img 
            src="/assets/muuvya.webp" 
            alt="Muuvya, Micro-Grant Awardee" 
            style={{ 
              height: "180px", 
              width: "auto",
              borderRadius: "8px", 
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              objectFit: "cover",
              display: "inline-block",
              margin: "0 20px"
            }} 
          />
        </div>
        
        {/* Add CSS animation keyframes */}
        <style>
          {`
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
          `}
        </style>
      </div>
    </div>
    
    {/* Testimonial */}
    <div style={{ 
      background: "#eef9ee", 
      padding: "30px", 
      borderRadius: "10px",
      border: "1px solid #c8e6c9",
      position: "relative",
      marginBottom: "20px"
    }}>
      <div style={{ 
        fontSize: "48px", 
        color: "rgba(0,150,50,0.1)", 
        position: "absolute", 
        top: "15px", 
        left: "20px" 
      }}>❝</div>
      
      <blockquote style={{ 
        fontStyle: "italic", 
        fontSize: "16px", 
        lineHeight: "1.6", 
        maxWidth: "800px", 
        margin: "0 auto 20px auto",
        paddingLeft: "30px",
        position: "relative",
        zIndex: "1"
      }}>
        "The Good Neighbor Fund grant that I received was far more than a financial contribution to jump starting my business. It provided validation for an idea & passion that I have had for some time and support and encouragement to realize a dream of entrepreneurship after a 22 year teaching career. The grant money, resources and connections have been invaluable to help the seeds of my business grow and I feel blessed to be a part of this community of Good Neighbors."
      </blockquote>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center",
        justifyContent: "center", 
        gap: "15px",
        marginTop: "20px"
      }}>
        <div style={{ 
          width: "50px", 
          height: "50px", 
          borderRadius: "50%", 
          background: "#c8e6c9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px"
        }}>
          🌱
        </div>
        <div>
          <strong style={{ display: "block", fontSize: "16px" }}>Tracy Csavina</strong>
          <span style={{ fontSize: "14px", color: "#555" }}>Founder @ Sustainably Rooted LLC</span>
        </div>
      </div>
    </div>
    
    {/* Call to Action - Final Section */}
    <div style={{ 
      background: "linear-gradient(135deg, #FFD6EC, #ffeaf0)",
      borderRadius: "10px",
      padding: "30px",
      textAlign: "center",
      boxShadow: "0 3px 15px rgba(0,0,0,0.05)"
    }}>
      <h2 style={{ 
        fontSize: "28px", 
        marginTop: 0,
        marginBottom: "15px",
        color: "#333"
      }}>
        Ready to Bring Your Business Idea to Life?
      </h2>
      
      <p style={{ 
        fontSize: "16px",
        maxWidth: "600px",
        margin: "0 auto 25px auto",
        lineHeight: "1.6"
      }}>
        We're looking for passionate founders with bold ideas that create positive impact
        in their communities. No business plan required—just a 60-second pitch video
        and your authentic vision.
      </p>
      
      <div style={{ 
        display: "flex",
        justifyContent: "center",
        gap: "20px",
        flexWrap: "wrap"
      }}>
        <button 
          onClick={onPitchClick} 
          style={{ 
            background: "#FF69B4", 
            color: "white",
            border: "none", 
            borderRadius: "30px", 
            padding: "14px 28px", 
            fontSize: "18px", 
            fontWeight: "bold", 
            cursor: "pointer",
            fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive",
            boxShadow: "0 4px 15px rgba(255,105,180,0.3)",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(255,105,180,0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(255,105,180,0.3)";
          }}
        >
          🦄 Submit Your Pitch Today!
        </button>
      </div>
    </div>
  </div>
);

// -- AwardeesPage
const AwardeesPage = ({ awardees, loading, chapters, searchTerm, setSearchTerm, chapterFilter, setChapterFilter }) => (
  <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222", flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
    <h1>Meet Our Grant Awardees 🏆</h1>
    
    <div style={{ background: "#fff8e1", padding: "20px", borderRadius: "8px", border: "2px solid #ffd54f", marginBottom: "25px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ flex: "1" }}>
          <p>
            We're proud to showcase our incredible Good Neighbor Fund grant recipients! Each of these remarkable entrepreneurs 
            received $1,000 in belief capital to pursue their dreams and bring their business ideas to life. 
            We invite you to learn more about their journeys, visit their websites, and support their businesses.
          </p>
          <p>
            These founders represent the vibrant, diverse entrepreneurial spirit we aim to nurture in our communities. 
            From innovative products to essential services, our awardees are creating positive impact and economic opportunity.
          </p>
        </div>
        <img 
          src="/assets/afterglow.webp" 
          alt="Afterglow, Micro-Grant Awardee" 
          style={{ 
            width: "180px", 
            height: "180px", 
            objectFit: "cover", 
            border: "2px solid #ffd54f", 
            borderRadius: "8px" 
          }} 
        />
      </div>
    </div>
    
    {/* Filters */}
    <div style={{ display: "flex", gap: "15px", marginBottom: "25px", background: "#f5f5f5", padding: "15px", borderRadius: "6px", border: "1px solid #ddd" }}>
      <input 
        type="text" 
        placeholder="Search by founder or business name" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ 
          padding: "8px", 
          flexGrow: 1, 
          border: "1px solid #ccc", 
          borderRadius: "4px",
          fontFamily: "inherit"
        }}
      />
      
      <select
        value={chapterFilter}
        onChange={(e) => setChapterFilter(e.target.value)}
        style={{ 
          padding: "8px", 
          border: "1px solid #ccc", 
          borderRadius: "4px",
          fontFamily: "inherit",
          minWidth: "150px"
        }}
      >
        <option value="">All Chapters</option>
        {chapters.map(chapter => (
          <option key={chapter} value={chapter}>{chapter}</option>
        ))}
      </select>
    </div>
    
    {/* Loading State */}
    {loading && (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p>Loading grant awardees...</p>
      </div>
    )}
    
    {/* No Results */}
    {!loading && awardees.length === 0 && (
      <div style={{ textAlign: "center", padding: "40px 0", background: "#f9f9f9", border: "1px dashed #ccc", borderRadius: "8px" }}>
        <p>No awardees match your search criteria. Try adjusting your filters.</p>
      </div>
    )}
    
    {/* Awardees Grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "25px", flex: 1, overflow: 'auto', paddingBottom: '20px' }}>
      {awardees.map(awardee => (
        <div key={awardee.id} style={{ 
          background: "#fff", 
          border: "1px solid #ddd", 
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Photo */}
          {awardee.photoUrl && (
            <div style={{ marginBottom: "15px", textAlign: "center" }}>
              <img 
                src={awardee.photoUrl} 
                alt={`${awardee.businessName}`}
                style={{ 
                  width: "180px", 
                  height: "180px", 
                  objectFit: "cover",
                  borderRadius: "6px",
                  border: "1px solid #eee",
                  margin: "0 auto" // Center the image
                }}
              />
            </div>
          )}
          
          {/* Business Name */}
          <h2 style={{ margin: "0 0 5px 0", color: "#00468b", fontSize: "1.3em" }}>
            {awardee.businessName}
          </h2>
          
          {/* Founder Name */}
          <h3 style={{ margin: "0 0 15px 0", color: "#777", fontWeight: "normal", fontSize: "1.1em" }}>
            by {awardee.founderName}
          </h3>
          
          {/* Chapter & Quarter */}
          <div style={{ margin: "0 0 15px 0", fontSize: "0.9em", color: "#666", display: "flex", justifyContent: "space-between" }}>
            <span>{awardee.chapter}</span>
            <span>{awardee.quarter}</span>
          </div>
          
          {/* About */}
          {awardee.about && (
            <div style={{ 
              margin: "0 0 15px 0", 
              padding: "12px", 
              background: "#f9f9f9", 
              borderRadius: "6px",
              fontSize: "0.9em",
              flex: "1" 
            }}>
              <p style={{ margin: "0" }}>
                {awardee.about}
              </p>
            </div>
          )}
          
          {/* Website */}
          {awardee.website && (
            <div style={{ marginTop: "auto", paddingTop: "15px" }}>
              <a 
                href={awardee.website.startsWith('http') ? awardee.website : `http://${awardee.website}`}
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#E6F7FF",
                  color: "#0070f3",
                  textDecoration: "none",
                  borderRadius: "4px",
                  border: "1px solid #0070f3",
                  fontWeight: "bold",
                  fontSize: "0.9em",
                  textAlign: "center",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                Visit Website →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// -- ChaptersPage --
const ChaptersPage = ({ setPage }) => (
  <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222" }}>
    <h1>GNF Chapters</h1>
    <p>Good Neighbor Fund operates through local chapters, each with their own community of Limited Partners who review applications and select quarterly awardees.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
        <h2>Western New York</h2>
        <p><strong>Founded:</strong> 2023</p>
        <p>Where it all started, serving Buffalo and the surrounding 8 counties.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setPage("wny")} style={chapterBtnStyle}>Meet the LPs</button>
          <button onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform', '_blank')} style={chapterBtnStyle}>Join Chapter</button>
        </div>
      </div>
      <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
        <h2>Denver</h2>
        <p><strong>Founded:</strong> 2023</p>
        <p>Serving the greater Denver metropolitan area.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setPage("denver")} style={chapterBtnStyle}>Meet the LPs</button>
          <button onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform', '_blank')} style={chapterBtnStyle}>Join Chapter</button>
        </div>
      </div>
    </div>
    <div style={{ background: "#e6f7ff", padding: "20px", border: "2px dashed #88ccff", borderRadius: "10px", marginTop: "30px" }}>
      <h2 style={{ color: "#004488" }}>How It Works</h2>
      <p>GNF is a collective giving organization: a diverse group of founders, business executives, and creators that share a passion for entrepreneurship and community. Our LPs pool their own resources, knowledge, and networks. We meet quarterly to select new micro-grant award winners.</p>
    </div>
    <div style={{ background: "#fff0f5", padding: "20px", border: "2px groove #cc88aa", borderRadius: "10px", marginTop: "30px", textAlign: "center" }}>
      <h2 style={{ color: "#cc3366" }}>Start a Chapter in Your City</h2>
      <p>Interested in launching a GNF chapter in your own community? We're always looking for passionate good neighbors to help spread the belief capital.</p>
      <button onClick={() => window.location.href = "mailto:jason@goodneighbor.fund"} style={{ background: "#ffccee", border: "2px outset #ff99cc", borderRadius: "6px", padding: "10px 20px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", marginTop: "10px" }}>✉️ Contact Us to Start a Chapter</button>
    </div>
    <div style={{ background: "#fff8f0", padding: "24px", borderRadius: "10px", border: "2px solid #ffccaa", marginTop: "30px" }}>
  <h2 style={{ color: "#cc5500" }}>What is Collective Giving?</h2>
  <p>
    Good Neighbor Fund is more than a grant program—it’s a neighborhood of builders and believers. 
    Our LPs are a diverse collective of founders, operators, and community members who pool their own 
    capital each quarter to fund the boldest new ideas in their chapter.
  </p>
  <p>
    There’s no overhead. No bureaucracy. We operate on a <strong>money in, money out</strong> model: 
    100% of LP dues go directly to fund the next wave of local founders.
  </p>
  <p>
    Each quarter, LPs come together to review applications, share dinner, and vote on who receives new micro-grants. 
    The process is human, and deeply rooted in community. We follow up with founders over coffee, 
    hand off giant checks, and help make their first steps a little more possible.
  </p>
</div>

  </div>
);

const chapterBtnStyle = {
  background: "#dceeff",
  border: "2px outset #88bbdd",
  borderRadius: "6px",
  padding: "8px 12px",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive"
};

// LP Grid
const LpGrid = ({ lps }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
    {lps.map(({ name, title, bio, linkedin }) => (
      <div key={name} style={{ background: "#f8f8ff", padding: "15px", borderRadius: "8px", border: "1px solid #ccc" }}>
        <img
          src={`/assets/lps/${name.toLowerCase().replace(/\s+/g, "-")}.png`}
          alt={name}
          style={{
            width: "120px",
            height: "120px",
            objectFit: "cover",
            borderRadius: "50%",
            border: "2px solid #ccc",
            display: "block",
            margin: "0 auto 10px auto"
          }}
        />
        <h3 style={{ marginBottom: "5px" }}>
          {linkedin ? (
            <a 
              href={linkedin} 
              target="_blank" 
              rel="noreferrer" 
              style={{ 
                color: "#3366cc", 
                textDecoration: "none" 
              }}
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        <p style={{ fontWeight: "bold", marginBottom: "6px" }}>{title}</p>
        <p style={{ fontSize: "14px" }}>{bio}</p>
        {linkedin && <a href={linkedin} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "6px", fontSize: "12px", color: "#3366cc" }}>LinkedIn</a>}
      </div>
    ))}
  </div>
);

// WnyChapterPage
const WnyChapterPage = () => {
  const lps = [
    {
      name: "Jason Bartz",
      title: "Co-Founder",
      bio: "Jason serves as VP of Business Development & Partner Success at Vero Technologies and Co-Founder of Refraction.",
      linkedin: "https://www.linkedin.com/in/jsnbrtz/"
    },
    {
      name: "Andy Rose",
      title: "Brand / Creative Strategist",
      bio: "Andy is a strategist who's led activation for global brands like Alibaba, BMW, and Xerox. Passionate about Buffalo's startup scene.",
      linkedin: "https://www.linkedin.com/in/itsandyrose/"
    },
    {
      name: "Bobbie Armstrong",
      title: "Director of Impact Ecosystems",
      bio: "Focused on clean energy and greentech, with a background in policy making at Uptake Alliance.",
      linkedin: "https://www.linkedin.com/in/bobbie-thoman/"
    },
    {
      name: "Brian Cleary",
      title: "Partner, Interlace Digital",
      bio: "Empowering brands with innovative digital solutions.",
      linkedin: "https://www.linkedin.com/in/brian-cleary-marketing/"
    },
    {
      name: "Celine Krzan",
      title: "Professor & Program Director",
      bio: "Entrepreneurship faculty at UB. Runs M&T Minority and Women Emerging Entrepreneur Program.",
      linkedin: "https://www.linkedin.com/in/celinekrzan/"
    },
    {
      name: "Cindy Sideris",
      title: "Director of Operations, UVC",
      bio: "Connects and empowers Upstate NY founders. Passionate about VC + entertainment creators.",
      linkedin: "https://www.linkedin.com/in/cindysideris/"
    },
    {
      name: "Danielle Blount",
      title: "Partner at BOLD Ventures",
      bio: "Also leads Buffalo's Awesome Foundation. Invests in wild, weird, and wonderful ideas.",
      linkedin: "https://www.linkedin.com/in/blountdanielle/"
    },
    {
      name: "David Brenner",
      title: "Startup Community Organizer",
      bio: "BootSector volunteer and Buffalo Startup Weekend lead.",
      linkedin: "https://www.linkedin.com/in/davidabrenner/"
    },
    {
      name: "Flossie Hall",
      title: "CEO, Stella",
      bio: "Veteran Navy spouse and serial entrepreneur. Featured in Forbes, Inc., and Entrepreneur.",
      linkedin: "https://www.linkedin.com/in/flossiehall/"
    },
    {
      name: "Jon Pancerman",
      title: "Sr. Director, ACV Auctions",
      bio: "Ops leader with a TEDxBuffalo organizing past.",
      linkedin: "https://www.linkedin.com/in/jpancerman/"
    },
    {
      name: "Jordan Walbesser",
      title: "Director, Mattel Legal",
      bio: "Exec Director of BootSector. Building Buffalo's next-gen startup leaders.",
      linkedin: "https://www.linkedin.com/in/jordan-walbesser/"
    },
    {
      name: "Najja Boulden",
      title: "Founder, Phoenix Innovation Group",
      bio: "Trainer and developer of inclusive innovation ecosystems."
    },
    {
      name: "Shannon McCabe",
      title: "Market Research Analyst, Moog",
      bio: "Background in VC and 43North. GenZ VC mentor.",
      linkedin: "https://www.linkedin.com/in/smccabe04/"
    },
    {
      name: "Sonya Tarake",
      title: "COO, Team Real Talk",
      bio: "Facilitator for Kauffman FastTrac and EiR at UB's Inclusive Launch Foundry.",
      linkedin: "https://www.linkedin.com/in/stareke/"
    }
  ];

  return (
    <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222" }}>
      <h1>Western New York Chapter LPs</h1>
      
      {/* LP CTA */}
      <div style={{ 
        background: "#fff8e1", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "25px",
        border: "2px solid #ffd54f",
        textAlign: "center"
      }}>
        <h2 style={{ color: "#FF8F00", margin: "0 0 10px 0" }}>Become a Limited Partner</h2>
        <p>
          Join our community of LPs and help select the next wave of entrepreneurs to receive micro-grants.
          As an LP, you'll contribute resources, knowledge, and mentorship to early-stage founders.
        </p>
        <a 
          href="https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#FFB74D",
            color: "white",
            padding: "10px 20px",
            borderRadius: "6px",
            fontWeight: "bold",
            textDecoration: "none",
            marginTop: "10px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          Apply to Join as an LP
        </a>
      </div>
      
      <LpGrid lps={lps} />
    </div>
  );
};

// DenverChapterPage
const DenverChapterPage = () => {
  const lps = [
    {
      name: "Susan O'Rourke",
      title: "Co-Founder",
      bio: "VP of Sales at Plug. Former early employee at ACV Auctions."
    },
    {
      name: "Allie Reitz",
      title: "Founder, Meep",
      bio: "UX designer, founder coach, and no-code studio builder for impact startups."
    },
    {
      name: "Jared McHenry",
      title: "Launch Lead, SkySquad",
      bio: "Scaling ops + sales teams with startup DNA from ACV Auctions."
    },
    {
      name: "Jeff Dougherty",
      title: "Director, QuidelOrtho",
      bio: "Ops wizard with experience integrating complex orgs post-merger."
    },
    {
      name: "Nicole Hunter",
      title: "Professor of Finance, UB",
      bio: "Spreads intercultural awareness through business education."
    },
    {
      name: "Scott Romano",
      title: "Interim CEO, Energize Colorado",
      bio: "Top 25 Colorado innovator. Brings tech to public-interest causes."
    }
  ];

  return (
    <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222" }}>
      <h1>Denver Chapter LPs</h1>
      
      {/* Added Become an LP CTA */}
      <div style={{ 
        background: "#fff8e1", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "25px",
        border: "2px solid #ffd54f",
        textAlign: "center"
      }}>
        <h2 style={{ color: "#FF8F00", margin: "0 0 10px 0" }}>Become a Limited Partner</h2>
        <p>
          Join our community of LPs and help select the next wave of entrepreneurs to receive micro-grants.
          As an LP, you'll contribute resources, knowledge, and mentorship to early-stage founders.
        </p>
        <a 
          href="https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#FFB74D",
            color: "white",
            padding: "10px 20px",
            borderRadius: "6px",
            fontWeight: "bold",
            textDecoration: "none",
            marginTop: "10px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          Apply to Join as an LP
        </a>
      </div>
      
      <LpGrid lps={lps} />
    </div>
  );
};

// -- DonatePage --
const DonatePage = () => (
  <div className="force-comic-font" style={{ fontFamily: "'Comic Sans MS', 'ComicRetro', 'Pixelify Sans', cursive", color: "#222" }}>
    <h1>Support Our Mission 💖</h1>
    
    <div style={{ 
      background: "linear-gradient(135deg, #f5fcf5, #e8f5e8)",
      padding: "25px", 
      borderRadius: "10px", 
      marginBottom: "25px",
      border: "1px solid #c8e6c9"
    }}>
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center",
        textAlign: "center" 
      }}>
        <div style={{ 
          width: "80px", 
          height: "80px", 
          borderRadius: "50%",
          overflow: "hidden",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e8f5e9",
          border: "1px solid #c8e6c9"
        }}>
          <img 
            src="/assets/donate.webp" 
            alt="Donate Icon" 
            style={{ width: "60px", height: "60px", objectFit: "contain" }}
          />
        </div>

        
        <h2 style={{ 
          color: "#2E7D32", 
          marginTop: "0",
          marginBottom: "15px" 
        }}>
          Growing Communities Through Belief Capital
        </h2>
        
        <p style={{ 
          maxWidth: "700px", 
          lineHeight: "1.6", 
          fontSize: "16px",
          margin: "0 auto 20px auto"
        }}>
          We are a 100% volunteer-led organization. Your donation directly supports our Micro-Grant program 
          and helps us nurture entrepreneurship and develop communities. Every dollar you contribute 
          goes toward empowering founders to turn their business dreams into reality.
        </p>
      </div>
    </div>
    
    {/* Donation Options */}
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
      gap: "25px",
      marginBottom: "30px"
    }}>
      {/* One-Time Donation */}
      <div style={{ 
        background: "#fff", 
        borderRadius: "10px", 
        padding: "25px",
        border: "1px solid #ddd",
        boxShadow: "0 3px 10px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ 
          color: "#0277BD", 
          marginTop: "0",
          borderBottom: "2px solid #E1F5FE",
          paddingBottom: "10px"
        }}>
          Make a One-Time Donation
        </h2>
        
        <p style={{ marginBottom: "20px", lineHeight: "1.5" }}>
          Your one-time contribution helps us award micro-grants to aspiring entrepreneurs in our communities.
          Every dollar makes a difference!
        </p>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
          <button 
            onClick={() => window.open("https://buy.stripe.com/8wMaEW0mqaYB1jOaEH", "_blank")} 
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "16px 24px",
              background: "linear-gradient(135deg, #635BFF, #8A84FF)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "bold",
              fontSize: "18px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(99, 91, 255, 0.3)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #5851E1, #7B75F0)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(99, 91, 255, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #635BFF, #8A84FF)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 91, 255, 0.3)";
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.376 0 0 5.376 0 12C0 18.624 5.376 24 12 24C18.624 24 24 18.624 24 12C24 5.376 18.624 0 12 0ZM5.04 14.832C4.464 14.832 3.96 14.328 3.96 13.728C3.96 13.128 4.464 12.624 5.04 12.624H9.72C10.32 12.624 10.8 13.128 10.8 13.728C10.8 14.328 10.32 14.832 9.72 14.832H5.04ZM19.2 10.08C19.2 10.68 18.72 11.16 18.12 11.16H4.08C3.48 11.16 3 10.68 3 10.08C3 9.48 3.48 9 4.08 9H18.12C18.72 9 19.2 9.48 19.2 10.08ZM19.68 7.44C19.68 8.04 19.2 8.52 18.6 8.52H7.92C7.32 8.52 6.84 8.04 6.84 7.44C6.84 6.84 7.32 6.36 7.92 6.36H18.6C19.2 6.36 19.68 6.84 19.68 7.44Z" fill="white"/>
            </svg>
            Donate via Stripe
          </button>
        </div>
        
        <p style={{ fontSize: "12px", color: "#666", marginTop: "20px", textAlign: "center" }}>
          All transactions are processed through our fiscal sponsor, BootSector, a registered 501(c)3 non-profit (EIN: 85-4082950)
        </p>
      </div>
      
      {/* GNF Club Membership */}
      <div style={{ 
        background: "#fff", 
        borderRadius: "10px", 
        padding: "25px",
        border: "1px solid #ddd",
        boxShadow: "0 3px 10px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ 
          color: "#9C27B0", 
          marginTop: "0",
          borderBottom: "2px solid #F3E5F5",
          paddingBottom: "10px"
        }}>
          Become a GNF Club Member
        </h2>
        
        <p style={{ marginBottom: "20px", lineHeight: "1.5" }}>
          Join a community of like-minded individuals who are passionate about entrepreneurship and giving back.
          Your recurring donation funds our micro-grant program and supports the next generation of founders.
        </p>
        
        <div style={{ 
          background: "#F9F4FC", 
          borderRadius: "8px", 
          padding: "20px", 
          marginBottom: "20px",
          border: "1px solid #E1BEE7"
        }}>
          <h3 style={{ marginTop: "0", color: "#6A1B9A" }}>Membership Benefits:</h3>
          <ul style={{ 
            paddingLeft: "25px", 
            margin: "15px 0",
            lineHeight: "1.6"
          }}>
            <li>Free access to all GNF-hosted events</li>
            <li>Private GNF Slack community</li>
            <li>GNF Club stickers</li>
            <li>Social media shoutout</li>
          </ul>
        </div>
        
        <a 
          href="https://buy.stripe.com/dR68wO3yCgiVaUo6oq" 
          target="_blank" 
          rel="noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 25px",
            background: "#9C27B0",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 3px 10px rgba(156,39,176,0.2)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#7B1FA2";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 5px 15px rgba(156,39,176,0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#9C27B0";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 3px 10px rgba(156,39,176,0.2)";
          }}
        >
          Join GNF Club Today
        </a>
      </div>
    </div>
    
    {/* Nonprofit Status & Tax Info */}
    <div style={{ 
      background: "#F5F5F5", 
      padding: "20px", 
      borderRadius: "8px",
      border: "1px solid #E0E0E0",
      marginBottom: "30px"
    }}>
      <h3 style={{ marginTop: "0", color: "#424242" }}>Tax-Deductible Donations</h3>
      <p style={{ marginBottom: "0", lineHeight: "1.5" }}>
        Donations are tax-deductible to the extent allowed by law. Good Neighbor Fund operates through its fiscal 
        sponsor, BootSector, a registered 501(c)3 non-profit organization (EIN: 85-4082950). You'll receive a donation 
        receipt where applicable, for your records after contributing.
      </p>
    </div>
    
    {/* Corporate Sponsorship */}
    <div style={{ 
      background: "linear-gradient(135deg, #E3F2FD, #BBDEFB)", 
      padding: "25px", 
      borderRadius: "10px",
      marginBottom: "30px",
      textAlign: "center"
    }}>
      <h2 style={{ color: "#0D47A1", marginTop: "0" }}>Corporate Sponsorship</h2>
      <p style={{ 
        maxWidth: "700px",
        margin: "0 auto 20px auto",
        lineHeight: "1.6"
      }}>
        Looking to make a larger impact? Our corporate sponsorship program offers various 
        levels of involvement and recognition. Partner with us to support entrepreneurship
        in your community while showcasing your commitment to local economic development.
      </p>
      <button 
        onClick={() => window.location.href = "mailto:jason@goodneighbor.fund?subject=Corporate%20Sponsorship%20Inquiry"} 
        style={{
          padding: "12px 25px",
          background: "#1976D2",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 3px 10px rgba(25,118,210,0.2)"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#1565C0";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 5px 15px rgba(25,118,210,0.3)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#1976D2";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 3px 10px rgba(25,118,210,0.2)";
        }}
      >
        Contact Us About Sponsorship
      </button>
    </div>
    
    {/* Impact Stories */}
    <div style={{ 
      background: "#FFF8E1", 
      padding: "25px", 
      borderRadius: "10px",
      border: "1px solid #FFE082"
    }}>
      <h2 style={{ color: "#FF8F00", marginTop: "0", textAlign: "center" }}>You can help turn ideas into reality</h2>
      <div style={{ 
        borderLeft: "3px solid #FFCA28", 
        paddingLeft: "20px", 
        margin: "20px 0"
      }}>
        <p style={{ fontStyle: "italic" }}>
        "Your support fuels $1,000 micro-grants that help early-stage founders launch their first product, buy initial inventory, or spread the word about their business. With your support, these small bets can grow into job-creating, community-serving ventures.""
        </p>
        <p style={{ marginBottom: "0", fontWeight: "bold" }}>— Jason Bartz, Co-Founder, Good Neighbor Fund</p>
      </div>
    </div>
  </div>
);