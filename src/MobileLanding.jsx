// MobileLanding.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import StandalonePitchPage from "./StandalonePitchPage";
import StandaloneLPApplication from "./StandaloneLPApplication";
import MobileNeighborhoodResources from "./components/MobileNeighborhoodResources";
import MobileBuddyMessenger from "./components/MobileBuddyMessenger";
import MobileLPPortal from "./components/MobileLPPortal";
import MobileBootScreen from "./MobileBootScreen";
import HitCounter from "./components/ui/HitCounter";
import DockIcon from "./components/icons/DockIcon";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./App.css";

const AWARDEES_CACHE_KEY = "gnf:awardees:v1";

const loadCachedAwardees = () => {
  try {
    const cached = sessionStorage.getItem(AWARDEES_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export default function MobileLanding({ initialBootDone = false }) {
  // Boot sequence state
  const [bootSequence, setBootSequence] = useState(initialBootDone ? "complete" : "booting");
  const [desktopReady, setDesktopReady] = useState(initialBootDone);
  
  // State management
  const [currentTime, setCurrentTime] = useState("");
  const [activeApp, setActiveApp] = useState(null);
  const [lpApplicationChapter, setLpApplicationChapter] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [history, setHistory] = useState(["home"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showBuddyMessenger, setShowBuddyMessenger] = useState(false);
  const [showLPPortal, setShowLPPortal] = useState(false);
  const [awardees, setAwardees] = useState(loadCachedAwardees);
  const [filteredAwardees, setFilteredAwardees] = useState(loadCachedAwardees);
  const [awardeesLoading, setAwardeesLoading] = useState(false);
  const [awardeeChapterFilter, setAwardeeChapterFilter] = useState("");
  const [awardeeSort, setAwardeeSort] = useState("alpha");
  const [awardeeSearchTerm, setAwardeeSearchTerm] = useState("");
  const [marqueeRef, setMarqueeRef] = useState(null);
  const [awardeesMarqueeRef, setAwardeesMarqueeRef] = useState(null);

  // Chapter list — loaded from /chapters Firestore collection; falls back to the
  // hardcoded legacy cards (below) while loading or if the fetch fails. The four
  // legacy chapters have their original prose here so behavior is unchanged when
  // the collection is empty.
  const [mobileChapterCards, setMobileChapterCards] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'chapters'));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.active !== false)
          .sort((a, b) => {
            const ao = typeof a.order === 'number' ? a.order : 999;
            const bo = typeof b.order === 'number' ? b.order : 999;
            if (ao !== bo) return ao - bo;
            return (a.name || '').localeCompare(b.name || '');
          })
          .map(c => ({
            name: c.name,
            foundedYear: c.foundedYear,
            tagline: c.tagline,
            pageSlug: c.pageSlug || c.id,
          }));
        if (!cancelled && list.length > 0) setMobileChapterCards(list);
      } catch (e) {
        console.error('MobileLanding: failed to load /chapters, using fallback', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
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
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(`${mm}/${dd}/${yy} ${timeStr}`);
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
    // Only show the spinner if we have nothing cached to render
    if (awardees.length === 0) setAwardeesLoading(true);

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

        let quarter = "Unknown Quarter";
        let createdAtMs = 0;
        if (data.createdAt) {
          try {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const q = Math.floor(date.getMonth() / 3) + 1;
            quarter = `Q${q} ${date.getFullYear()}`;
            createdAtMs = date.getTime();
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
          quarter: quarter,
          createdAtMs: createdAtMs
        });
      });

      setAwardees(awardeesData);
      try {
        sessionStorage.setItem(AWARDEES_CACHE_KEY, JSON.stringify(awardeesData));
      } catch {
        // quota/serialization failure is non-fatal
      }
    } catch (error) {
      console.error("Error fetching awardees:", error);
    }

    setAwardeesLoading(false);
  }, []);

  // Prefetch awardees on mount (stale-while-revalidate using sessionStorage cache)
  useEffect(() => {
    fetchAwardees();
  }, [fetchAwardees]);

  // Filter + sort awardees
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

      const sorted = [...filtered].sort((a, b) => {
        if (awardeeSort === "newest") return b.createdAtMs - a.createdAtMs;
        if (awardeeSort === "oldest") return a.createdAtMs - b.createdAtMs;
        return a.businessName.localeCompare(b.businessName);
      });

      setFilteredAwardees(sorted);
    }
  }, [awardeeSearchTerm, awardeeChapterFilter, awardeeSort, awardees]);

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


  // Dock Icons render function - matches desktop Dock.jsx bordered Win95 style
  const renderDockIcon = (type, label, onClick, size = 30) => (
    <div
      className="mobile-dock-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: size + 10,
          height: size + 10,
          padding: 2,
          border: "2px solid",
          borderColor: "var(--bevel-outset)",
          boxShadow: "var(--shadow-outset)",
          background: "var(--gnf-bg-silver)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DockIcon type={type} size={size} />
      </div>
      <span
        style={{
          fontSize: "10px",
          marginTop: "4px",
          color: "var(--mb-chalk)",
          textAlign: "center",
          fontWeight: "bold",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </span>
    </div>
  );


  // Render appropriate content based on active tab
  // Common style for all tab content
  const commonFontStyle = {
    fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif'
  };

  const renderTabContent = () => {
    const currentPage = activeTab;

    switch (currentPage) {
      case "home":
        return (
          <main className="mb-content">
            <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Good Neighbor Fund - $1,000 Micro-Grants for Bold Founders | Chapters in Western New York, Denver, Upstate NY, and the Capital Region</h1>

            {/* ===== HERO — Magenta ===== */}
            <section className="mb-block mb-block-magenta" style={{ padding: "36px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>
                  Est. 2023 · Belief Capital
                </span>
                <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", fontSize: 32, lineHeight: 1.05 }}>
                  $1,000 micro-grants for <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>bold</em> business ideas.
                </h2>
                <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.95, fontSize: 15 }}>
                  We back brilliant ideas before they're "ready." No pitch deck. No equity taken. Just belief in your vision and potential.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenApp("submit")}
                  className="mb-btn mb-btn-butter"
                  style={{ alignSelf: "flex-start", fontSize: 12, padding: "12px 18px", marginTop: 4 }}
                >
                  Submit Your Pitch
                  <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                </button>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,0.3)",
                }}>
                  <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>34 /</span> funded
                  </span>
                  <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>80% /</span> women-owned
                  </span>
                  <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>52% /</span> BIPOC-owned
                  </span>
                </div>
              </div>
            </section>

            {/* ===== MISSION — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ margin: 0, marginBottom: 18 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Our Mission</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>
                  Belief capital for the founders banks won't fund.
                </h2>
              </div>
              <p className="mb-lede" style={{ fontSize: 15, marginBottom: 14 }}>
                Good Neighbor Fund is a micro-grant program that gives <strong style={{ fontWeight: 600 }}>$1,000 in belief capital</strong> to under-resourced founders with bold new business ideas.
              </p>
              <p className="mb-body" style={{ fontSize: 13, marginBottom: 12 }}>
                We don't expect a pitch deck. We don't want equity. We fund <em>you</em> — your idea, your energy, your potential. Our funding doesn't come from banks, VCs, or foundations; it comes from neighbors who chip in their own funds, meet quarterly to review applications, and award the micro-grants together.
              </p>
              <p className="mb-italic" style={{ fontSize: 15, color: "var(--mb-magenta)", margin: "8px 0 16px" }}>
                Born in Buffalo, built for neighborhoods everywhere.
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>No Staff</span>
                <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>No Overhead</span>
                <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>100% Volunteer-Led</span>
                <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>501(c)3 Fiscal Sponsor</span>
              </div>
            </section>

            {/* ===== IMPACT — Grape ===== */}
            <section className="mb-block mb-block-grape" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ textAlign: "center", alignItems: "center", marginBottom: 24 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Impact · Since 2023</span>
                <h2 className="mb-h2" style={{ color: "var(--mb-chalk)", fontSize: 26, lineHeight: 1.1 }}>
                  Small bets. <em style={{ fontStyle: "italic", color: "var(--mb-aqua)" }}>Real</em> neighborhoods.
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { n: "34",    label: "Business ideas funded" },
                  { n: "80%",   label: "Women-owned" },
                  { n: "52%",   label: "BIPOC-owned" },
                  { n: "$34K+", label: "In micro-grants" },
                ].map((s) => (
                  <div key={s.label} className="mb-stat">
                    <span className="mb-stat-num" style={{ color: "var(--mb-butter)", fontSize: 36 }}>{s.n}</span>
                    <span className="mb-stat-label" style={{ color: "var(--mb-chalk)", opacity: 0.85 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ===== HOW IT WORKS — Aqua ===== */}
            <section className="mb-block mb-block-aqua" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 20 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>How It Works</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>
                  Three steps. No decks, no red tape.
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { n: "01", title: "Submit", copy: "Complete our simple online form and upload a 60-second pitch video. That's it — no business plan required." },
                  { n: "02", title: "Review", copy: "Our LP teams review every submission at the end of each quarter, together, over dinner." },
                  { n: "03", title: "Award",  copy: "Selected founders receive a $1,000 micro-grant with no strings attached. We don't take equity; we take belief." }
                ].map((step) => (
                  <article key={step.n} className="mb-card mb-card-sm" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className="mb-badge">Step / {step.n}</span>
                    <h3 className="mb-h3" style={{ marginTop: 2, fontSize: 22 }}>{step.title}</h3>
                    <p className="mb-body" style={{ margin: 0, fontSize: 13 }}>{step.copy}</p>
                  </article>
                ))}
              </div>
              <p className="mb-italic" style={{ marginTop: 24, fontSize: 15, textAlign: "center" }}>
                This is not venture capital — we expect no return.<br />
                This is <strong style={{ fontFamily: "var(--font-content)", fontStyle: "normal", fontWeight: 700 }}>belief capital</strong>.
              </p>
            </section>

            {/* ===== PRESS — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "28px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 16, alignItems: "center", textAlign: "center" }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>As Featured In</span>
                <h2 className="mb-h3" style={{ fontStyle: "italic", fontSize: 20 }}>
                  The good word travels.
                </h2>
              </div>
              <div
                ref={ref => setMarqueeRef(ref)}
                style={{ display: "flex", alignItems: "center", gap: 20, overflow: "hidden", whiteSpace: "nowrap" }}
              >
                <div style={{ display: "flex", gap: 20 }}>
                  {pressLinks.map((press, index) => (
                    <a
                      key={`press-${press.title}-${index}`}
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ opacity: 0.8, height: "40px", display: "flex", alignItems: "center", flex: "0 0 auto", filter: "grayscale(100%)" }}
                    >
                      {press.logo ? (
                        <img src={press.logo} alt={`${press.title} logo - Good Neighbor Fund press coverage`} style={{ height: "100%", maxWidth: "120px", objectFit: "contain" }} />
                      ) : (
                        <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-ink)" }}>{press.title}</span>
                      )}
                    </a>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {pressLinks.map((press, index) => (
                    <a
                      key={`dup-press-${press.title}-${index}`}
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ opacity: 0.8, height: "40px", display: "flex", alignItems: "center", flex: "0 0 auto", filter: "grayscale(100%)" }}
                    >
                      {press.logo ? (
                        <img src={press.logo} alt={`${press.title} logo - Good Neighbor Fund press coverage`} style={{ height: "100%", maxWidth: "120px", objectFit: "contain" }} />
                      ) : (
                        <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-ink)" }}>{press.title}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== AWARDEES MARQUEE — Butter ===== */}
            <section className="mb-block mb-block-butter" style={{ padding: "32px 0 32px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 20, paddingRight: 20 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Portfolio · 34 Strong</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1, maxWidth: "18ch" }}>
                  Neighborhood dreams, at work.
                </h2>
              </div>
              <div
                ref={ref => setAwardeesMarqueeRef(ref)}
                style={{ overflow: "hidden", whiteSpace: "nowrap" }}
              >
                <div style={{ display: "inline-flex", gap: 14 }}>
                  {[
                    { src: "/assets/Ernies2.webp",   alt: "Ernie's Pop Shop - Buffalo grant recipient" },
                    { src: "/assets/BFR2.webp",      alt: "Buffalo Fashion Runway - grant recipient" },
                    { src: "/assets/Trinas2.webp",   alt: "Trina's Speedy Cleaning - grant recipient" },
                    { src: "/assets/gnf-kamil.webp", alt: "Signing is Art - grant recipient" },
                    { src: "/assets/muuvya.webp",    alt: "Muuvya - grant recipient" },
                  ].map((img, index) => (
                    <img
                      key={`awardee-img-${index}`}
                      src={img.src}
                      alt={img.alt}
                      style={{
                        height: 130,
                        width: 130,
                        border: "2px solid var(--mb-ink)",
                        boxShadow: "var(--shadow-hard-sm)",
                        objectFit: "cover",
                        flex: "0 0 auto",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "inline-flex", gap: 14, marginLeft: 14 }}>
                  {[
                    { src: "/assets/Ernies2.webp",   alt: "Ernie's Pop Shop - Buffalo grant recipient" },
                    { src: "/assets/BFR2.webp",      alt: "Buffalo Fashion Runway - grant recipient" },
                    { src: "/assets/Trinas2.webp",   alt: "Trina's Speedy Cleaning - grant recipient" },
                    { src: "/assets/gnf-kamil.webp", alt: "Signing is Art - grant recipient" },
                    { src: "/assets/muuvya.webp",    alt: "Muuvya - grant recipient" },
                  ].map((img, index) => (
                    <img
                      key={`dup-awardee-img-${index}`}
                      src={img.src}
                      alt={img.alt}
                      aria-hidden="true"
                      style={{
                        height: 130,
                        width: 130,
                        border: "2px solid var(--mb-ink)",
                        boxShadow: "var(--shadow-hard-sm)",
                        objectFit: "cover",
                        flex: "0 0 auto",
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* ===== TESTIMONIAL — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "36px 20px" }}>
              <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 20, textAlign: "center" }}>
                In Their Words
              </span>
              <blockquote className="mb-display" style={{ fontSize: 20, lineHeight: 1.35, margin: 0, textAlign: "center" }}>
                <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--mb-magenta)", fontSize: "1.6em", lineHeight: 0, position: "relative", top: "0.4em", marginRight: "0.08em" }}>"</span>
                The grant was far more than a financial contribution to jump-starting my business. It provided validation for an idea & passion I've had for some time — support and encouragement to realize a dream of entrepreneurship after a 22-year teaching career.
                <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--mb-magenta)", fontSize: "1.6em", lineHeight: 0, position: "relative", top: "0.4em", marginLeft: "0.05em" }}>"</span>
              </blockquote>
              <div style={{ marginTop: 22, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-content)", fontWeight: 700, fontSize: 14, color: "var(--mb-ink)" }}>
                    Tracy Csavina
                  </div>
                  <div className="mb-numeral" style={{ fontSize: 11, color: "var(--mb-ink-60)", marginTop: 2 }}>
                    Founder · Sustainably Rooted LLC
                  </div>
                </div>
                <span style={{ width: 22, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
              </div>
            </section>

            {/* ===== FINAL CTA — Ink ===== */}
            <section className="mb-block mb-block-ink" style={{ padding: "40px 20px", textAlign: "center" }}>
              <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 14 }}>
                Apply Now · Q2 2026
              </span>
              <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", fontSize: 28, lineHeight: 1.1, margin: "0 auto 16px" }}>
                Ready to bring your business idea <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>to life?</em>
              </h2>
              <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.85, margin: "0 auto 24px", fontSize: 14 }}>
                No business plan required — just a 60-second pitch video and your authentic vision.
              </p>
              <button type="button" onClick={() => handleOpenApp("submit")} className="mb-btn" style={{ fontSize: 12, padding: "12px 18px" }}>
                Submit Your Pitch
                <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
              </button>
            </section>

            {/* ===== FOOTER — Ink ===== */}
            <footer className="mb-block mb-block-ink" style={{ padding: "20px 20px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <HitCounter />
              <div className="mb-numeral" style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>
                &copy; {new Date().getFullYear()} GOOD NEIGHBOR FUND · ALL RIGHTS RESERVED
              </div>
            </footer>
          </main>
        );

      case "chapters": {
        const chapterCards = mobileChapterCards || [
          { name: 'Western New York', foundedYear: 2023, tagline: 'Where it all started, serving Buffalo and the surrounding 8 counties.', pageSlug: 'wny' },
          { name: 'Denver',           foundedYear: 2023, tagline: 'Serving the greater Denver metropolitan area.', pageSlug: 'denver' },
          { name: 'Upstate New York', foundedYear: 2026, tagline: 'Bringing belief capital to founders across Central and Upstate New York — Syracuse, Ithaca, Binghamton, Utica and beyond.', pageSlug: 'upstate' },
          { name: 'Capital Region',   foundedYear: 2026, tagline: "Supporting bold ideas across New York's Capital Region — Albany, Schenectady, Troy and the surrounding area.", pageSlug: 'capital-region' },
        ];

        return (
          <main className="mb-content">
            {/* ===== HERO — Grape ===== */}
            <section className="mb-block mb-block-grape" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ margin: 0 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Network · Four Chapters Strong</span>
                <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", fontSize: 32, lineHeight: 1.05 }}>
                  GNF <em style={{ fontStyle: "italic", color: "var(--mb-aqua)" }}>Chapters.</em>
                </h2>
                <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.9, marginTop: 10, fontSize: 15 }}>
                  We operate through local chapters — each with their own community of Limited Partners who review applications and select quarterly awardees.
                </p>
              </div>
            </section>

            {/* ===== CHAPTER CARDS — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "28px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {chapterCards.map((c) => (
                  <article key={c.name} className="mb-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <h3 className="mb-h3" style={{ margin: 0, fontSize: 22 }}>{c.name}</h3>
                      {c.foundedYear && (
                        <span className="mb-numeral" style={{ fontSize: 11, color: "var(--mb-ink-60)", whiteSpace: "nowrap" }}>
                          EST. {c.foundedYear}
                        </span>
                      )}
                    </div>
                    {c.tagline && (
                      <p className="mb-body" style={{ margin: 0, fontSize: 13 }}>{c.tagline}</p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => window.open(`/${c.pageSlug}`, '_blank')}
                        className="mb-btn mb-btn-ink"
                        style={{ padding: "10px 14px", fontSize: 11 }}
                      >
                        Visit Chapter
                        <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLpApplicationChapter(c.name); setActiveApp("lpApplication"); }}
                        className="mb-btn mb-btn-chalk"
                        style={{ padding: "10px 14px", fontSize: 11 }}
                      >
                        Join as LP
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ===== HOW CHAPTERS WORK — Aqua ===== */}
            <section className="mb-block mb-block-aqua" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 14 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>How Chapters Work</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>
                  A collective giving organization, at the neighborhood scale.
                </h2>
              </div>
              <p className="mb-lede" style={{ fontSize: 14 }}>
                GNF is a diverse group of founders, operators, and creators who share a passion for entrepreneurship and community. LPs pool their own resources, knowledge, and networks. We meet quarterly to review applications and select new micro-grant award winners.
              </p>
            </section>

            {/* ===== COLLECTIVE GIVING — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "32px 20px" }}>
              <div className="mb-section-head" style={{ margin: 0, marginBottom: 16 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Model</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>What is collective giving?</h2>
              </div>
              <p className="mb-lede" style={{ fontSize: 15, marginBottom: 12 }}>
                Good Neighbor Fund is more than a grant program — it's a neighborhood of builders and believers. LPs are a diverse collective of founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in their chapter.
              </p>
              <p className="mb-body" style={{ fontSize: 13, marginBottom: 10 }}>
                There's no overhead. No bureaucracy. We operate on a <strong style={{ fontWeight: 600 }}>money in, money out</strong> model: 100% of LP dues go directly to fund the next wave of local founders.
              </p>
              <p className="mb-body" style={{ fontSize: 13 }}>
                Each quarter, LPs come together to review applications, share dinner, and vote on who receives new micro-grants.
              </p>
            </section>

            {/* ===== START A CHAPTER — Magenta ===== */}
            <section className="mb-block mb-block-magenta" style={{ padding: "40px 20px", textAlign: "center" }}>
              <span className="mb-eyebrow" style={{ color: "var(--mb-butter)", display: "block", marginBottom: 14 }}>
                Expansion · Cities Welcome
              </span>
              <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", fontSize: 28, lineHeight: 1.1, margin: "0 auto 16px" }}>
                Start a chapter in your <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>city.</em>
              </h2>
              <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.9, margin: "0 auto 24px", fontSize: 14 }}>
                Interested in launching a GNF chapter in your own community? We're always looking for passionate good neighbors to help spread the belief capital.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => window.location.href = "https://airtable.com/app38xfYxu9HY6yT3/pagYPQAHYvAUxPfuX/form"}
                  className="mb-btn mb-btn-butter"
                  style={{ fontSize: 12, padding: "12px 18px", width: "100%", maxWidth: 280 }}
                >
                  Contact Us
                  <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open("https://jasonbartz.notion.site/Good-Neighbor-Fund-Chapter-Handbook-1fc6fdd6d4c680e2a523eb2cbd5cf365", "_blank")}
                  className="mb-btn mb-btn-chalk"
                  style={{ fontSize: 12, padding: "12px 18px", width: "100%", maxWidth: 280 }}
                >
                  Chapter Handbook
                </button>
              </div>
            </section>
          </main>
        );
      }
      
        
      case "awardees":
        return (
          <main className="mb-content">
            {/* ===== HERO — Butter ===== */}
            <section className="mb-block mb-block-butter" style={{ padding: "32px 20px" }}>
              <div className="mb-section-head" style={{ margin: 0 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Portfolio</span>
                <h2 className="mb-h1" style={{ fontSize: 32, lineHeight: 1.05 }}>Meet our grant awardees.</h2>
                <p className="mb-lede" style={{ marginTop: 10, fontSize: 15 }}>
                  Each of these entrepreneurs received <strong style={{ fontWeight: 600 }}>$1,000 in belief capital</strong> to bring their business idea to life — creating positive impact in their neighborhoods.
                </p>
              </div>
            </section>

            {/* ===== FILTER TOOLBAR — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <input
                  type="search"
                  placeholder="Search by founder or business"
                  aria-label="Search awardees"
                  value={awardeeSearchTerm}
                  onChange={(e) => setAwardeeSearchTerm(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    fontFamily: "var(--font-content)",
                    fontSize: 13,
                    background: "var(--mb-chalk)",
                    color: "var(--mb-ink)",
                    border: "2px solid var(--mb-ink)",
                    boxShadow: "var(--shadow-hard-sm)",
                    boxSizing: "border-box",
                    width: "100%"
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={awardeeChapterFilter}
                    onChange={(e) => setAwardeeChapterFilter(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      fontFamily: "var(--font-content)",
                      fontSize: 13,
                      background: "var(--mb-chalk)",
                      color: "var(--mb-ink)",
                      border: "2px solid var(--mb-ink)",
                      boxShadow: "var(--shadow-hard-sm)",
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    <option value="">All Chapters</option>
                    {["Western New York", "Denver", "Upstate New York", "Capital Region"].map(chapter => (
                      <option key={chapter} value={chapter}>{chapter}</option>
                    ))}
                  </select>
                  <select
                    value={awardeeSort}
                    onChange={(e) => setAwardeeSort(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      fontFamily: "var(--font-content)",
                      fontSize: 13,
                      background: "var(--mb-chalk)",
                      color: "var(--mb-ink)",
                      border: "2px solid var(--mb-ink)",
                      boxShadow: "var(--shadow-hard-sm)",
                      flex: 1,
                      minWidth: 0
                    }}
                  >
                    <option value="alpha">A–Z</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>

              {awardeesLoading && (
                <div style={{ textAlign: "center", padding: "28px 0 4px" }}>
                  <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-ink-60)", letterSpacing: "0.1em" }}>LOADING AWARDEES…</span>
                </div>
              )}

              {!awardeesLoading && filteredAwardees.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px 16px 4px", marginTop: 14, border: "1px dashed var(--mb-ink)" }}>
                  <p className="mb-body" style={{ margin: 0, fontSize: 13 }}>No awardees match your search. Try adjusting your filters.</p>
                </div>
              )}
            </section>

            {/* ===== AWARDEE GRID — Paper ===== */}
            {!awardeesLoading && filteredAwardees.length > 0 && (
              <section className="mb-block mb-block-paper" style={{ padding: "4px 20px 28px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {filteredAwardees.map((awardee, i) => (
                    <article key={awardee.id} className="mb-card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "var(--shadow-hard-sm)" }}>
                      {awardee.photoUrl && (
                        <div style={{ borderBottom: "2px solid var(--mb-ink)", background: "var(--mb-ink)" }}>
                          <img
                            src={awardee.photoUrl}
                            alt={`${awardee.businessName} - ${awardee.chapter} Good Neighbor Fund $1,000 grant recipient`}
                            width="400"
                            height="400"
                            loading={i < 4 ? "eager" : "lazy"}
                            fetchPriority={i < 4 ? "high" : "auto"}
                            decoding="async"
                            style={{ width: "100%", height: "auto", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                          />
                        </div>
                      )}
                      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <div className="mb-numeral" style={{ fontSize: 9, color: "var(--mb-ink-60)", display: "flex", justifyContent: "space-between", gap: 4, lineHeight: 1.2 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{awardee.chapter}</span>
                          <span style={{ whiteSpace: "nowrap" }}>{awardee.quarter}</span>
                        </div>
                        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 16, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                          {awardee.businessName}
                        </h3>
                        <div className="mb-italic" style={{ fontSize: 11, color: "var(--mb-ink-60)" }}>
                          by {awardee.founderName}
                        </div>
                        {awardee.about && (
                          <p className="mb-body" style={{ fontSize: 11, lineHeight: 1.4, margin: "4px 0 0", flex: 1 }}>
                            {awardee.about}
                          </p>
                        )}
                        {awardee.website && (
                          <a
                            href={awardee.website.startsWith('http') ? awardee.website : `http://${awardee.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-btn mb-btn-chalk"
                            style={{ marginTop: 8, width: "100%", padding: "8px 10px", fontSize: 10, boxShadow: "var(--shadow-hard-sm)" }}
                          >
                            Visit Website
                            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </main>
        );
        
      case "donate":
        return (
          <main className="mb-content">
            {/* ===== HERO — Magenta with grant stat ===== */}
            <section className="mb-block mb-block-magenta" style={{ padding: "36px 20px" }}>
              <div className="mb-section-head" style={{ margin: 0, marginBottom: 20 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Support the Fund</span>
                <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", fontSize: 30, lineHeight: 1.05 }}>
                  Fuel <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>belief capital</em> for bold neighborhood founders.
                </h2>
                <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.92, marginTop: 12, fontSize: 14 }}>
                  We're a 100% volunteer-led organization. Every dollar funds the next micro-grant — no overhead, no middlemen.
                </p>
              </div>
              <div style={{
                background: "var(--mb-ink)",
                border: "2px solid var(--mb-chalk)",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>1 Grant</span>
                <span className="mb-numeral" style={{ fontSize: 40, fontWeight: 700, color: "var(--mb-chalk)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  $1,000
                </span>
                <span className="mb-body" style={{ color: "var(--mb-chalk)", opacity: 0.85, marginTop: 6, fontSize: 13 }}>
                  Your dollars fund a founder, dollar for dollar.
                </span>
              </div>
            </section>

            {/* ===== TWO PATHS — Paper ===== */}
            <section className="mb-block mb-block-paper" style={{ padding: "28px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 18 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Two Ways to Give</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>Pick a rhythm that fits.</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* One-Time */}
                <article className="mb-card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "var(--mb-aqua-soft)", borderBottom: "2px solid var(--mb-ink)", padding: "14px 18px" }}>
                    <span className="mb-eyebrow" style={{ color: "var(--mb-aqua-deep)" }}>Option 01 · One-Time</span>
                    <h3 className="mb-h3" style={{ margin: "6px 0 0", fontSize: 22 }}>Give once, directly.</h3>
                  </div>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    <p className="mb-body" style={{ margin: 0, fontSize: 13 }}>
                      Your contribution goes straight into the micro-grant fund. Any amount helps — $100 = 10% of a grant, $1,000 = a full grant to a founder.
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 14px", background: "var(--mb-paper-deep)", border: "1px solid var(--mb-ink)" }}>
                      <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", width: "100%", marginBottom: 4 }}>
                        Suggested Amounts
                      </span>
                      {["$25", "$100", "$250", "$1,000"].map((amt) => (
                        <span
                          key={amt}
                          className="mb-numeral"
                          style={{
                            padding: "3px 8px",
                            background: "var(--mb-chalk)",
                            border: "1px solid var(--mb-ink)",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--mb-ink)",
                          }}
                        >
                          {amt}
                        </span>
                      ))}
                    </div>
                    <a
                      href="https://buy.stripe.com/8wMaEW0mqaYB1jOaEH"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-btn mb-btn-ink mb-btn-full"
                      style={{ fontSize: 12, padding: "12px 14px" }}
                    >
                      Donate via Stripe
                      <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                    </a>
                  </div>
                </article>

                {/* Club Membership */}
                <article className="mb-card" style={{ padding: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                  <div style={{
                    position: "absolute",
                    top: -10,
                    right: 14,
                    background: "var(--mb-magenta)",
                    color: "var(--mb-chalk)",
                    padding: "3px 9px",
                    fontFamily: "var(--font-pixel)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--mb-ink)",
                    zIndex: 1,
                  }}>
                    Most Impact
                  </div>
                  <div style={{ background: "var(--mb-grape-soft)", borderBottom: "2px solid var(--mb-ink)", padding: "14px 18px" }}>
                    <span className="mb-eyebrow" style={{ color: "var(--mb-grape-deep)" }}>Option 02 · Recurring</span>
                    <h3 className="mb-h3" style={{ margin: "6px 0 0", fontSize: 22 }}>Become a GNF Club Member.</h3>
                  </div>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span className="mb-numeral" style={{ fontSize: 34, fontWeight: 700, color: "var(--mb-grape-deep)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                        $25
                      </span>
                      <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-ink-60)" }}>/ month</span>
                    </div>
                    <p className="mb-body" style={{ margin: 0, fontSize: 13 }}>
                      Join a community of neighbors who fund the next generation of founders — a steady $25/month keeps grants flowing all year.
                    </p>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        "Free access to all GNF-hosted events",
                        "Private GNF Slack community",
                        "GNF Club stickers",
                        "Chapter social-media shoutout",
                      ].map(benefit => (
                        <li key={benefit} className="mb-body" style={{ position: "relative", paddingLeft: 18, fontSize: 12, lineHeight: 1.45 }}>
                          <span style={{ position: "absolute", left: 0, top: 5, width: 8, height: 8, background: "var(--mb-grape)", border: "1px solid var(--mb-ink)" }} />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <a
                      href="https://buy.stripe.com/dR68wO3yCgiVaUo6oq"
                      target="_blank"
                      rel="noreferrer"
                      className="mb-btn mb-btn-grape mb-btn-full"
                      style={{ fontSize: 12, padding: "12px 14px" }}
                    >
                      Join the Club
                      <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                    </a>
                  </div>
                </article>
              </div>

              <div style={{
                marginTop: 22,
                padding: "12px 14px",
                border: "1px solid var(--mb-ink)",
                background: "var(--mb-paper-deep)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}>
                <span className="mb-badge">Tax-Deductible</span>
                <p className="mb-body" style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 11, lineHeight: 1.5 }}>
                  Donations are tax-deductible. Processed through our fiscal sponsor, <strong style={{ fontWeight: 700 }}>BootSector</strong>, a 501(c)3
                  <span className="mb-numeral"> (EIN 85-4082950)</span>.
                </p>
              </div>
            </section>

            {/* ===== CORPORATE SPONSORSHIP — Aqua ===== */}
            <section className="mb-block mb-block-aqua" style={{ padding: "32px 20px" }}>
              <div className="mb-section-head" style={{ marginBottom: 18 }}>
                <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>Corporate Partnership</span>
                <h2 className="mb-h2" style={{ fontSize: 26, lineHeight: 1.1 }}>
                  Sponsor a chapter.<br/>Back a neighborhood.
                </h2>
                <p className="mb-body" style={{ marginTop: 10, fontSize: 13 }}>
                  Three tiers of support for businesses that want to plant flags alongside the founders in their community.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
                {[
                  { tier: "Good Neighbor", amount: "$1,000", summary: "Funds one full micro-grant. Name & logo on the awardee's grant announcement." },
                  { tier: "Community Partner", amount: "$5,000", summary: "Funds a full chapter quarter. Event co-branding + logo on chapter page for the year." },
                  { tier: "Chapter Champion", amount: "$10,000+", summary: "Funds a full chapter year. Premier logo placement, named grant round, speaking slot at a chapter dinner." },
                ].map((tier, i) => (
                  <article key={tier.tier} className="mb-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="mb-numeral" style={{ fontSize: 10, color: "var(--mb-magenta)", fontWeight: 700, letterSpacing: "0.08em" }}>
                      TIER 0{i + 1}
                    </span>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 20, letterSpacing: "-0.01em" }}>
                      {tier.tier}
                    </h3>
                    <span className="mb-numeral" style={{ fontSize: 22, fontWeight: 700, color: "var(--mb-ink)", letterSpacing: "-0.03em" }}>
                      {tier.amount}
                    </span>
                    <p className="mb-body" style={{ margin: 0, fontSize: 12, lineHeight: 1.45 }}>
                      {tier.summary}
                    </p>
                  </article>
                ))}
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => window.location.href = "mailto:jason@goodneighbor.fund?subject=Corporate%20Sponsorship%20Inquiry"}
                  className="mb-btn mb-btn-ink"
                  style={{ fontSize: 12, padding: "12px 18px" }}
                >
                  Inquire About Sponsorship
                  <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </section>

            {/* ===== CO-FOUNDER NOTE — Butter ===== */}
            <section className="mb-block mb-block-butter" style={{ padding: "32px 20px" }}>
              <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 16 }}>
                A note from the co-founder
              </span>
              <blockquote
                className="mb-display"
                style={{ fontSize: 18, lineHeight: 1.35, margin: 0, borderLeft: "4px solid var(--mb-magenta)", paddingLeft: 16 }}
              >
                Your support fuels $1,000 micro-grants that help early-stage founders launch their first product, buy initial inventory, or spread the word about their business. These small bets grow into job-creating, community-serving ventures.
              </blockquote>
              <div style={{ marginTop: 18, paddingLeft: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 18, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
                <div>
                  <div style={{ fontFamily: "var(--font-content)", fontWeight: 700, fontSize: 14, color: "var(--mb-ink)" }}>Jason Bartz</div>
                  <div className="mb-numeral" style={{ fontSize: 10, color: "var(--mb-ink-60)" }}>
                    CO-FOUNDER · GOOD NEIGHBOR FUND
                  </div>
                </div>
              </div>
            </section>
          </main>
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
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Removed sound effects for mobile */}
      
      {/* Taskbar — Win95 silver to match desktop chrome */}
      <div className="taskbar mobile-taskbar" style={{ position: "static" }}>
        <div className="taskbar-left">
          <img src="/assets/gnf-logo.png" alt="GNF logo" className="taskbar-icon" />
          <span>neighborhoodOS</span>
        </div>
        <div className="taskbar-right" style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: 0 }}>
          <span className="retro-clock">{currentTime}</span>
        </div>
      </div>

      {/* If app is active, render that instead of main content */}
      {activeApp === "submit" ? (
        <StandalonePitchPage onClose={() => setActiveApp(null)} />
      ) : activeApp === "lpApplication" ? (
        <StandaloneLPApplication
          onClose={() => setActiveApp(null)}
          initialChapter={lpApplicationChapter}
        />
      ) : activeApp === "resources" ? (
        <MobileNeighborhoodResources onClose={() => setActiveApp(null)} />
      ) : (
        <>
          <div style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "10px 0",
          }}>
            {/* Main Content Window */}
            <div style={{
              background: "var(--mb-chalk)",
              border: "2px solid var(--mb-ink)",
              boxShadow: "var(--shadow-hard-lg)",
              width: "94%",
              margin: "10px auto 10px auto",
              overflow: "hidden",
              flex: "1",
              minHeight: 0,
              display: "flex",
              flexDirection: "column"
            }}>
              {/* Window Title Bar — ink + pixel font to match new theme */}
              <div style={{
                background: "var(--mb-ink)",
                color: "var(--mb-chalk)",
                padding: "6px 10px",
                minHeight: "28px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--font-pixel)",
                fontSize: "11px",
                letterSpacing: "0.04em",
                userSelect: "none",
                borderBottom: "1px solid rgba(255,255,255,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <img
                    src="/assets/icon-browser.webp"
                    alt=""
                    aria-hidden="true"
                    style={{ height: "14px" }}
                  />
                  Neighborhood Navigator
                </div>
                <button style={{
                  background: "var(--mb-magenta)",
                  border: "1px solid var(--mb-chalk)",
                  color: "var(--mb-chalk)",
                  cursor: "pointer",
                  padding: "0",
                  fontSize: "12px",
                  width: "20px",
                  height: "20px",
                  lineHeight: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-content)"
                }} aria-label="Close window">
                  ✕
                </button>
              </div>

              {/* Browser Chrome — ink bar with nav buttons + URL */}
              <div className="mb-browser-bar">
                <div className="mb-browser-nav">
                  <button
                    className="mb-nav-btn"
                    onClick={goBack}
                    disabled={historyIndex === 0}
                    aria-label="Go back"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <polygon points="10,2 10,14 3,8" fill="currentColor" />
                      <rect x="10" y="7" width="4" height="2" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    className="mb-nav-btn"
                    onClick={goForward}
                    disabled={historyIndex === history.length - 1}
                    aria-label="Go forward"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <polygon points="6,2 6,14 13,8" fill="currentColor" />
                      <rect x="2" y="7" width="4" height="2" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    className="mb-nav-btn"
                    onClick={() => setPage("home")}
                    aria-label="Go to home page"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                      <polygon points="8,1 15,7 13,7 13,14 9,14 9,10 7,10 7,14 3,14 3,7 1,7" fill="currentColor" />
                    </svg>
                  </button>
                </div>
                <div className="mb-browser-url">
                  <span className="mb-browser-url-tag">HTTPS</span>
                  <span className="mb-browser-url-path">
                    goodneighbor.fund{activeTab === "home" ? "/" : `/${activeTab}`}
                  </span>
                </div>
              </div>

              {/* Tab Navigation — pixel-font uppercase with magenta active */}
              <nav role="navigation" aria-label="Main navigation" className="mb-tabs">
                {[
                  { id: "home", label: "Home" },
                  { id: "chapters", label: "Chapters" },
                  { id: "awardees", label: "Awardees" },
                  { id: "donate", label: "Donate" },
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPage(tab.id)}
                      className={`mb-tab ${isActive ? "is-active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      style={{ padding: "10px 14px", fontSize: 10, flex: 1 }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Window Content — edge-to-edge mb-block sections */}
              <div style={{ padding: 0, overflowY: "auto", overscrollBehavior: "contain", flex: 1, minHeight: 0, background: "var(--mb-paper)" }}>
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Dock — ink-on-chalk bar matching the Navigator theme */}
          <div style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            gap: "4px",
            padding: "6px 8px",
            background: "var(--mb-ink)",
            color: "var(--mb-chalk)",
            margin: "0 auto 10px auto",
            width: "94%",
            maxWidth: "420px",
            border: "2px solid var(--mb-ink)",
            boxShadow: "var(--shadow-hard-sm)",
            flexShrink: 0,
            zIndex: 10,
          }}>
            {renderDockIcon("submit", "Pitch", () => handleOpenApp("submit"))}
            {renderDockIcon("resources", "Info", () => handleOpenApp("resources"))}
            {renderDockIcon("buddyMessenger", "Chat", () => setShowBuddyMessenger(true))}
            {renderDockIcon("lpPortal", "For LPs", () => setShowLPPortal(true))}
            {renderDockIcon("instagram", "Insta", () => window.open("https://www.instagram.com/goodneighborfund/", "_blank"))}
            {renderDockIcon("linkedin", "LinkedIn", () => window.open("https://www.linkedin.com/company/good-neighbor-fund", "_blank"))}
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
            background: "var(--mb-chalk)",
            padding: "15px",
            maxWidth: "85%",
            maxHeight: "80%",
            width: "300px",
            overflow: "auto",
            border: "2px solid var(--mb-ink)",
            boxShadow: "var(--shadow-hard-lg)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--mb-ink)",
              color: "var(--mb-chalk)",
              padding: "6px 10px",
              minHeight: "28px",
              margin: "-15px -15px 12px -15px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              userSelect: "none"
            }}>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: "11px", letterSpacing: "0.04em" }}>Donate to GNF</span>
              <button onClick={() => setShowDonateModal(false)} style={{
                background: "var(--mb-magenta)",
                border: "1px solid var(--mb-chalk)",
                color: "var(--mb-chalk)",
                padding: "0",
                width: "20px",
                height: "20px",
                fontSize: "12px",
                cursor: "pointer",
                lineHeight: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-content)"
              }} aria-label="Close donate modal">✕</button>
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
                    background: "#635BFF",
                    border: "2px solid",
                    borderColor: "var(--mb-ink)",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textDecoration: "none",
                    boxShadow: "var(--shadow-hard-sm)",
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