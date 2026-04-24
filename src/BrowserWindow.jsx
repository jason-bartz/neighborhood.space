import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Marquee from "react-fast-marquee";
import HitCounter from "./components/ui/HitCounter";
import NeighborhoodResources from "./components/NeighborhoodResources";

const AWARDEES_CACHE_KEY = "gnf:awardees:v1";

const loadCachedAwardees = () => {
  try {
    const cached = sessionStorage.getItem(AWARDEES_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export default function BrowserWindow({ onClose, onPitchClick, onLpApplicationClick, windowId, zIndex, bringToFront }) {
  const [history, setHistory] = useState(["home"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [awardees, setAwardees] = useState(loadCachedAwardees);
  const [filteredAwardees, setFilteredAwardees] = useState(loadCachedAwardees);
  const [awardeesLoading, setAwardeesLoading] = useState(false);
  const [awardeeChapterFilter, setAwardeeChapterFilter] = useState("");
  const [awardeeSearchTerm, setAwardeeSearchTerm] = useState("");
  const [awardeeSort, setAwardeeSort] = useState("alpha");
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

  // Prefetch awardees on mount (stale-while-revalidate using sessionStorage cache)
  useEffect(() => {
    fetchAwardees();
  }, []);


  // Load awardees from Firestore
  const fetchAwardees = async () => {
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
  };

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

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onPitchClick={onPitchClick} pressLinks={pressLinks} marqueeImages={marqueeImages} currentMarqueeIndex={currentMarqueeIndex} />;
      case "chapters":
        return <ChaptersPage setPage={setPage} onLpApplicationClick={onLpApplicationClick} />;
      case "awardees":
        return <AwardeesPage
                awardees={filteredAwardees}
                loading={awardeesLoading}
                chapters={["Western New York", "Denver", "Upstate New York", "Capital Region"]}
                searchTerm={awardeeSearchTerm}
                setSearchTerm={setAwardeeSearchTerm}
                chapterFilter={awardeeChapterFilter}
                setChapterFilter={setAwardeeChapterFilter}
                sort={awardeeSort}
                setSort={setAwardeeSort}
               />;
      case "resources":
        return <NeighborhoodResources isEmbedded={true} />;
      case "donate":
        return <DonatePage />;
      default:
        return <HomePage onPitchClick={onPitchClick} pressLinks={pressLinks} marqueeImages={marqueeImages} currentMarqueeIndex={currentMarqueeIndex} />;
    }
  };

  return (
    <div 
      style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      onClick={handleWindowClick}
    >
      {/* Browser chrome — single ink bar: nav buttons + URL */}
      <div className="mb-browser-bar">
        <div className="mb-browser-nav">
          <button
            className="mb-nav-btn"
            onClick={goBack}
            disabled={historyIndex === 0}
            aria-label="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <polygon points="6,2 6,14 13,8" fill="currentColor" />
              <rect x="2" y="7" width="4" height="2" fill="currentColor" />
            </svg>
          </button>
          <button
            className="mb-nav-btn"
            onClick={() => window.location.reload()}
            aria-label="Refresh page"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M 8 3 A 5 5 0 1 1 3.5 10.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
              <polygon points="7,1 11,3.5 7,6" fill="currentColor" />
            </svg>
          </button>
          <button
            className="mb-nav-btn"
            onClick={() => setPage("home")}
            aria-label="Go to home page"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <polygon points="8,1 15,7 13,7 13,14 9,14 9,10 7,10 7,14 3,14 3,7 1,7" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="mb-browser-url">
          <span className="mb-browser-url-tag">HTTPS</span>
          <span className="mb-browser-url-path">
            www.goodneighbor.fund{currentPage === "home" ? "/" : `/${currentPage}`}
          </span>
        </div>
      </div>

      {/* Tab nav — flat ink-bordered tabs with magenta active state */}
      <nav role="navigation" aria-label="Main navigation" className="mb-tabs">
        {[
          { id: "home", label: "Home", matches: (p) => p === "home" },
          { id: "chapters", label: "Chapters", matches: (p) => p === "chapters" || p === "wny" || p === "denver" },
          { id: "awardees", label: "Grant Awardees", matches: (p) => p === "awardees" },
          { id: "resources", label: "Resources", matches: (p) => p === "resources" },
          { id: "donate", label: "Donate", matches: (p) => p === "donate" }
        ].map((tab) => {
          const isActive = tab.matches(currentPage);
          return (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`mb-tab ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {/* Main Content — flush-edge; each page composes its own .mb-block sections */}
      <div style={{
        overflowY: currentPage === "resources" ? "hidden" : "auto",
        padding: 0,
        background: "var(--mb-paper)",
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderPage()}
      </div>
    </div>
  );
}

const HomePage = ({ onPitchClick, pressLinks, marqueeImages, currentMarqueeIndex }) => (
  <main className="mb-content">
    <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Good Neighbor Fund - $1,000 Micro-Grants for Bold Founders | Chapters in Western New York, Denver, Upstate NY, and the Capital Region</h1>

    {/* ===== ANNOUNCEMENT MARQUEE (ink bar) ===== */}
    <div style={{
      background: "var(--mb-ink)",
      color: "var(--mb-chalk)",
      padding: "10px 0",
      borderBottom: "var(--border-ink-2)",
      fontFamily: "var(--font-numeral)",
      fontSize: "13px",
      letterSpacing: "0.02em",
      whiteSpace: "nowrap"
    }}>
      <Marquee speed={40} gradient={false}>
        <span style={{ color: "var(--mb-magenta)", margin: "0 32px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-pixel)" }}>Now Accepting Q2 2026 Applications</span>
        <span style={{ color: "var(--mb-chalk)", margin: "0 32px" }}>$1,000 micro-grants · no pitch deck required</span>
        <span style={{ color: "var(--mb-butter)", margin: "0 32px", fontWeight: 700 }}>34 businesses funded since 2023</span>
        <span style={{ color: "var(--mb-chalk)", margin: "0 32px" }}>Western New York · Denver · Upstate NY · Capital Region</span>
        <span style={{ color: "var(--mb-aqua)", margin: "0 32px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-pixel)" }}>Join the GNF Club — support local founders</span>
      </Marquee>
    </div>

    {/* ===== HERO — Magenta ===== */}
    <section className="mb-block mb-block-magenta" style={{ padding: 0 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
        alignItems: "stretch",
        minHeight: "520px"
      }}>
        {/* Left — copy */}
        <div style={{
          padding: "var(--s-block-pad-y) var(--s-block-pad-x)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "var(--s-stack)"
        }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>
            Est. 2023 · Belief Capital
          </span>

          <h2 className="mb-h1" style={{ color: "var(--mb-chalk)" }}>
            $1,000 micro-grants for <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>bold</em> business ideas.
          </h2>

          <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.95, maxWidth: "48ch" }}>
            We back brilliant ideas before they're "ready." No pitch deck.
            No equity taken. Just belief in your vision and potential.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onPitchClick}
              aria-label="Submit your business pitch for a $1,000 Good Neighbor Fund grant"
              className="mb-btn mb-btn-butter"
            >
              Submit Your Pitch
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <div style={{
            display: "flex",
            gap: 24,
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.3)",
            flexWrap: "wrap"
          }}>
            <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 14 }}>
              <span style={{ opacity: 0.6 }}>34 /</span> businesses funded
            </span>
            <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 14 }}>
              <span style={{ opacity: 0.6 }}>80% /</span> women-owned
            </span>
            <span className="mb-numeral" style={{ color: "var(--mb-chalk)", fontSize: 14 }}>
              <span style={{ opacity: 0.6 }}>52% /</span> BIPOC-owned
            </span>
          </div>
        </div>

        {/* Right — photo */}
        <div style={{ position: "relative", overflow: "hidden", minHeight: "360px", borderLeft: "var(--border-chalk-2)" }}>
          <img
            src="/assets/gnf-fat-daddys.webp"
            alt="Fat Daddy's - Good Neighbor Fund $1,000 grant recipient in Buffalo, NY"
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
          />
          <div style={{
            position: "absolute",
            left: 20,
            bottom: 20,
            padding: "8px 14px",
            background: "var(--mb-ink)",
            color: "var(--mb-chalk)",
            fontFamily: "var(--font-pixel)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            border: "1px solid var(--mb-chalk)"
          }}>
            Fat Daddy's · Grant Recipient
          </div>
        </div>
      </div>
    </section>

    {/* ===== MISSION — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 64, alignItems: "start" }} className="mb-mission-grid">
        <div className="mb-section-head" style={{ margin: 0 }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Our Mission</span>
          <h2 className="mb-h2">
            Belief capital for the founders banks won't fund.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-stack)" }}>
          <p className="mb-lede" style={{ maxWidth: "58ch" }}>
            Good Neighbor Fund is a micro-grant program that gives <strong style={{ fontWeight: 600 }}>$1,000 in belief capital</strong>
            {" "}to under-resourced founders with bold new business ideas.
          </p>
          <p className="mb-body" style={{ maxWidth: "60ch" }}>
            We don't expect a pitch deck. We don't want equity. We fund <em>you</em>&nbsp;— your idea,
            your energy, your potential. Our funding doesn't come from banks, VCs, or foundations;
            it comes from neighbors who chip in their own funds, meet quarterly to review applications,
            and award the micro-grants together.
          </p>
          <p className="mb-italic" style={{ fontSize: "var(--tc-lede)", color: "var(--mb-magenta)", margin: "8px 0 0" }}>
            Born in Buffalo, built for neighborhoods everywhere.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>No Staff</span>
            <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>No Overhead</span>
            <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>100% Volunteer-Led</span>
            <span className="mb-tag" style={{ color: "var(--mb-ink)" }}>501(c)3 Fiscal Sponsor</span>
          </div>
        </div>
      </div>
    </section>

    {/* ===== IMPACT — Grape ===== */}
    <section className="mb-block mb-block-grape">
      <div className="mb-section-head" style={{ textAlign: "center", alignItems: "center", marginBottom: 48 }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Impact · Since 2023</span>
        <h2 className="mb-h2" style={{ color: "var(--mb-chalk)" }}>
          Small bets. <em style={{ fontStyle: "italic", color: "var(--mb-aqua)" }}>Real</em> neighborhoods.
        </h2>
      </div>

      <div className="mb-grid mb-grid-4" style={{ gap: 32 }}>
        {[
          { n: "34",      label: "Business ideas funded" },
          { n: "80%",     label: "Women-owned businesses" },
          { n: "52%",     label: "BIPOC-owned businesses" },
          { n: "$34K+",   label: "In micro-grants awarded" },
        ].map((s) => (
          <div key={s.label} className="mb-stat">
            <span className="mb-stat-num" style={{ color: "var(--mb-butter)" }}>{s.n}</span>
            <span className="mb-stat-label" style={{ color: "var(--mb-chalk)", opacity: 0.85 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* ===== HOW IT WORKS — Aqua ===== */}
    <section className="mb-block mb-block-aqua">
      <div className="mb-section-head" style={{ marginBottom: 48 }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>How It Works</span>
        <h2 className="mb-h2" style={{ maxWidth: "22ch" }}>
          Three steps. No decks, no red tape.
        </h2>
      </div>

      <div className="mb-grid mb-grid-3">
        {[
          { n: "01", title: "Submit",  copy: "Complete our simple online form and upload a 60-second pitch video. That's it — no business plan required." },
          { n: "02", title: "Review",  copy: "Our LP teams review every submission at the end of each quarter, together, over dinner. Every applicant is considered." },
          { n: "03", title: "Award",   copy: "Selected founders receive a $1,000 micro-grant with no strings attached. We don't take equity; we take belief." }
        ].map(step => (
          <article key={step.n} className="mb-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="mb-badge">Step / {step.n}</span>
            <h3 className="mb-h3" style={{ marginTop: 4 }}>{step.title}</h3>
            <p className="mb-body" style={{ margin: 0 }}>{step.copy}</p>
          </article>
        ))}
      </div>

      <p className="mb-italic" style={{ marginTop: 48, fontSize: "var(--tc-lede)", textAlign: "center" }}>
        This is not venture capital &mdash; we expect no return on investment.<br/>
        This is <strong style={{ fontFamily: "var(--font-content)", fontStyle: "normal", fontWeight: 700 }}>belief capital</strong>: an endorsement of your potential.
      </p>
    </section>

    {/* ===== COMMUNITY — Tangerine ===== */}
    <section className="mb-block mb-block-tangerine">
      <div className="mb-section-head" style={{ marginBottom: 40 }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>Community · IRL</span>
        <h2 className="mb-h2" style={{ maxWidth: "20ch" }}>
          Dinner, pitches, and giant checks.
        </h2>
        <p className="mb-body" style={{ maxWidth: "62ch", marginTop: 4 }}>
          Every grant starts with people in a room. LPs meet quarterly, share a meal, and vote on the
          ideas they believe in most. Then we hand over the biggest check we can carry.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gridAutoRows: "180px",
        gap: 12
      }}>
        {[
          { src: "/assets/tp-sansi.webp",  alt: "Sansi Bansal at Twin Petrels startup event in Buffalo - Good Neighbor Fund community gathering", span: 2 },
          { src: "/assets/tm-group.webp",  alt: "Good Neighbor Fund Buffalo chapter kickoff event at Thin Man Brewery - startup community gathering", span: 3 },
          { src: "/assets/tp-group.webp",  alt: "Entrepreneurs networking at Twin Petrels in Buffalo - Good Neighbor Fund grant program event", span: 1 },
          { src: "/assets/lp-dinner.webp", alt: "Western New York Good Neighbor Fund Limited Partners dinner - Buffalo Chapter Grant Selection meeting", span: 3 },
          { src: "/assets/kiln-panel.webp",alt: "Startup pitch presentations at Kiln Denver - Good Neighbor Fund grant selection event", span: 2 },
          { src: "/assets/tp-panel.webp",  alt: "Buffalo entrepreneur panel discussion at Twin Petrels - Good Neighbor Fund founder stories", span: 1 },
        ].map((img, i) => (
          <div key={i} style={{
            gridColumn: `span ${img.span}`,
            overflow: "hidden",
            border: "var(--border-ink-2)",
            boxShadow: "var(--shadow-hard-sm)",
            background: "var(--mb-ink)"
          }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>
    </section>

    {/* ===== PRESS — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div className="mb-section-head" style={{ marginBottom: 32, alignItems: "center", textAlign: "center" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>As Featured In</span>
        <h2 className="mb-h3" style={{ fontStyle: "italic" }}>
          The good word travels.
        </h2>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 48,
        flexWrap: "wrap"
      }}>
        {pressLinks.map((press, index) => (
          <a
            key={index}
            href={press.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-press-logo"
            style={{
              opacity: 0.7,
              transition: "opacity 120ms ease-out, filter 120ms ease-out",
              filter: "grayscale(100%)",
              height: "56px",
              display: "flex",
              alignItems: "center"
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.filter = "grayscale(100%)"; }}
          >
            {press.logo ? (
              <img
                src={press.logo}
                alt={`${press.title} logo - Good Neighbor Fund press coverage`}
                style={{ height: "100%", maxWidth: "220px", objectFit: "contain" }}
              />
            ) : (
              <span className="mb-numeral" style={{ fontSize: 14, color: "var(--mb-ink)" }}>{press.title}</span>
            )}
          </a>
        ))}
      </div>
    </section>

    {/* ===== AWARDEES MARQUEE — Butter ===== */}
    <section className="mb-block mb-block-butter">
      <div className="mb-section-head" style={{ marginBottom: 32 }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Portfolio · 34 Strong</span>
        <h2 className="mb-h2" style={{ maxWidth: "22ch" }}>
          Neighborhood dreams, at work.
        </h2>
      </div>

      <div style={{ overflow: "hidden", whiteSpace: "nowrap", padding: "8px 0", marginLeft: "calc(var(--s-block-pad-x) * -1)", marginRight: "calc(var(--s-block-pad-x) * -1)" }}>
        <div style={{
          display: "inline-flex",
          gap: 20,
          whiteSpace: "nowrap",
          animation: "mb-marquee 32s linear infinite",
          paddingLeft: 20
        }}>
          {[
            { src: "/assets/Ernies2.webp",   alt: "Ernie's Pop Shop - Buffalo small business $1,000 grant winner from Good Neighbor Fund" },
            { src: "/assets/BFR2.webp",      alt: "Buffalo Fashion Runway - Western New York fashion startup funded by Good Neighbor Fund micro-grant" },
            { src: "/assets/Trinas2.webp",   alt: "Trina's Speedy Cleaning - Buffalo cleaning service business funded by Good Neighbor Fund $1,000 grant" },
            { src: "/assets/gnf-kamil.webp", alt: "Signing is Art - Buffalo-based small business funded by Good Neighbor Fund micro-grant program" },
            { src: "/assets/muuvya.webp",    alt: "Muuvya - Small business funded by Good Neighbor Fund $1,000 small business grant" },
            // duplicated for seamless loop
            { src: "/assets/Ernies2.webp",   alt: "Ernie's Pop Shop - Buffalo small business $1,000 grant winner from Good Neighbor Fund" },
            { src: "/assets/BFR2.webp",      alt: "Buffalo Fashion Runway - Western New York fashion startup funded by Good Neighbor Fund micro-grant" },
            { src: "/assets/Trinas2.webp",   alt: "Trina's Speedy Cleaning - Buffalo cleaning service business funded by Good Neighbor Fund $1,000 grant" },
            { src: "/assets/gnf-kamil.webp", alt: "Signing is Art - Buffalo-based small business funded by Good Neighbor Fund micro-grant program" },
            { src: "/assets/muuvya.webp",    alt: "Muuvya - Small business funded by Good Neighbor Fund $1,000 small business grant" },
          ].map((img, i) => (
            <img
              key={i}
              src={img.src}
              alt={img.alt}
              style={{
                height: 220,
                width: "auto",
                border: "var(--border-ink-2)",
                boxShadow: "var(--shadow-hard-sm)",
                objectFit: "cover",
                display: "inline-block"
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes mb-marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
        `}</style>
      </div>
    </section>

    {/* ===== TESTIMONIAL — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div style={{ maxWidth: "820px", margin: "0 auto", position: "relative" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 32, textAlign: "center" }}>
          In Their Words
        </span>

        <blockquote
          className="mb-display"
          style={{
            fontSize: "clamp(24px, 3vw, 34px)",
            lineHeight: 1.3,
            margin: 0,
            textAlign: "center"
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--mb-magenta)", fontSize: "1.6em", lineHeight: 0, position: "relative", top: "0.4em", marginRight: "0.1em" }}>"</span>
          The grant was far more than a financial contribution to jump-starting my business. It provided
          validation for an idea & passion I've had for some time — support and encouragement to realize
          a dream of entrepreneurship after a 22-year teaching career.
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--mb-magenta)", fontSize: "1.6em", lineHeight: 0, position: "relative", top: "0.4em", marginLeft: "0.05em" }}>"</span>
        </blockquote>

        <div style={{
          marginTop: 36,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ width: 36, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-content)", fontWeight: 700, fontSize: 16, color: "var(--mb-ink)" }}>
              Tracy Csavina
            </div>
            <div className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-ink-60)", marginTop: 2 }}>
              Founder · Sustainably Rooted LLC
            </div>
          </div>
          <span style={{ width: 36, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
        </div>
      </div>
    </section>

    {/* ===== FINAL CTA — Ink ===== */}
    <section className="mb-block mb-block-ink" style={{ textAlign: "center" }}>
      <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 20 }}>
        Apply Now · Q2 2026
      </span>

      <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", maxWidth: "24ch", margin: "0 auto 24px" }}>
        Ready to bring your business idea <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>to life?</em>
      </h2>

      <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.85, maxWidth: "56ch", margin: "0 auto 36px" }}>
        We're looking for passionate founders with bold ideas that create positive impact
        in their communities. No business plan required &mdash; just a 60-second pitch video and your authentic vision.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={onPitchClick} className="mb-btn">
          Submit Your Pitch
          <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>

    {/* ===== FOOTER — Ink (continuation) ===== */}
    <footer className="mb-block mb-block-ink" style={{ paddingTop: 24, paddingBottom: 24, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
      <HitCounter />

      <div className="mb-numeral" style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
        &copy; {new Date().getFullYear()} GOOD NEIGHBOR FUND · ALL RIGHTS RESERVED ·{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="mb-link-underline" style={{ color: "var(--mb-chalk)" }}>
          TERMS
        </a>
        {" · "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="mb-link-underline" style={{ color: "var(--mb-chalk)" }}>
          PRIVACY
        </a>
      </div>
    </footer>
  </main>
);

// -- AwardeesPage
const AwardeesPage = ({ awardees, loading, chapters, searchTerm, setSearchTerm, chapterFilter, setChapterFilter, sort, setSort }) => (
  <main className="mb-content">
    {/* ===== HERO — Butter ===== */}
    <section className="mb-block mb-block-butter">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 48, alignItems: "center" }}>
        <div className="mb-section-head" style={{ margin: 0 }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Portfolio</span>
          <h2 className="mb-h1">Meet our grant awardees.</h2>
          <p className="mb-lede" style={{ maxWidth: "58ch", marginTop: 8 }}>
            Each of these remarkable entrepreneurs received <strong style={{ fontWeight: 600 }}>$1,000 in belief capital</strong> to bring their
            business idea to life. From innovative products to essential services, they're creating
            positive impact and economic opportunity in their neighborhoods.
          </p>
        </div>
        <div style={{
          border: "var(--border-ink-2)",
          boxShadow: "var(--shadow-hard-lg)",
          overflow: "hidden",
          aspectRatio: "1 / 1",
          background: "var(--mb-ink)"
        }}>
          <img
            src="/assets/afterglow.webp"
            alt="Afterglow - Good Neighbor Fund small business, independent bookstore, grant recipient in Buffalo"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      </div>
    </section>

    {/* ===== FILTER TOOLBAR — Paper ===== */}
    <section className="mb-block mb-block-paper" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 12, alignItems: "stretch" }} className="mb-awardee-filters">
        <input
          type="text"
          placeholder="Search by founder or business name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "12px 14px",
            fontFamily: "var(--font-content)",
            fontSize: 14,
            background: "var(--mb-chalk)",
            color: "var(--mb-ink)",
            border: "var(--border-ink-2)",
            boxShadow: "var(--shadow-hard-sm)"
          }}
        />
        <select
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
          style={{
            padding: "12px 14px",
            fontFamily: "var(--font-content)",
            fontSize: 14,
            background: "var(--mb-chalk)",
            color: "var(--mb-ink)",
            border: "var(--border-ink-2)",
            boxShadow: "var(--shadow-hard-sm)"
          }}
        >
          <option value="">All Chapters</option>
          {chapters.map(chapter => (
            <option key={chapter} value={chapter}>{chapter}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: "12px 14px",
            fontFamily: "var(--font-content)",
            fontSize: 14,
            background: "var(--mb-chalk)",
            color: "var(--mb-ink)",
            border: "var(--border-ink-2)",
            boxShadow: "var(--shadow-hard-sm)"
          }}
        >
          <option value="alpha">Sort · Alphabetical</option>
          <option value="newest">Sort · Newest first</option>
          <option value="oldest">Sort · Oldest first</option>
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <span className="mb-numeral" style={{ fontSize: 14, color: "var(--mb-ink-60)" }}>LOADING AWARDEES&hellip;</span>
        </div>
      )}

      {!loading && awardees.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", marginTop: 20, border: "1px dashed var(--mb-ink)" }}>
          <p className="mb-body">No awardees match your search criteria. Try adjusting your filters.</p>
        </div>
      )}
    </section>

    {/* ===== AWARDEE GRID — Paper ===== */}
    {!loading && awardees.length > 0 && (
      <section className="mb-block mb-block-paper" style={{ paddingTop: 16 }}>
        <div className="mb-grid mb-grid-4" style={{ gap: 28 }}>
          {awardees.map((awardee, i) => (
            <article key={awardee.id} className="mb-card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {awardee.photoUrl && (
                <div style={{ borderBottom: "var(--border-ink-2)", background: "var(--mb-ink)" }}>
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

              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div className="mb-numeral" style={{ fontSize: 11, color: "var(--mb-ink-60)", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>{awardee.chapter}</span>
                  <span>{awardee.quarter}</span>
                </div>

                <h3 className="mb-h4" style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
                  {awardee.businessName}
                </h3>

                <div className="mb-italic" style={{ fontSize: 14, color: "var(--mb-ink-60)" }}>
                  by {awardee.founderName}
                </div>

                {awardee.about && (
                  <p className="mb-body" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, flex: 1 }}>
                    {awardee.about}
                  </p>
                )}

                {awardee.website && (
                  <a
                    href={awardee.website.startsWith('http') ? awardee.website : `http://${awardee.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-btn mb-btn-chalk"
                    style={{ marginTop: 12, width: "100%", padding: "10px 14px", fontSize: 12 }}
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

// Hardcoded chapter list preserved as fallback copy for the 4 legacy chapters.
// Used when the /chapters Firestore collection hasn't loaded yet (or is empty).
// Once the collection is populated, the dynamic list wins.
const LEGACY_CHAPTER_CARDS = [
  { name: 'Western New York', foundedYear: 2023, tagline: 'Where it all started, serving Buffalo and the surrounding 8 counties.',                                                         pageSlug: 'wny' },
  { name: 'Denver',           foundedYear: 2023, tagline: 'Serving the greater Denver metropolitan area.',                                                                                 pageSlug: 'denver' },
  { name: 'Upstate New York', foundedYear: 2026, tagline: 'Bringing belief capital to founders across Central and Upstate New York — Syracuse, Ithaca, Binghamton, Utica and beyond.',     pageSlug: 'upstate' },
  { name: 'Capital Region',   foundedYear: 2026, tagline: "Supporting bold ideas across New York's Capital Region — Albany, Schenectady, Troy and the surrounding area.",                  pageSlug: 'capital-region' },
];

// -- ChaptersPage --
// Renders the list dynamically from the /chapters Firestore collection.
// Falls back to LEGACY_CHAPTER_CARDS if the collection is empty or the load fails.
const ChaptersPage = ({ setPage, onLpApplicationClick }) => {
  const [dynamicChapters, setDynamicChapters] = useState([]);
  const [loaded, setLoaded] = useState(false);

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
          });
        if (!cancelled) {
          setDynamicChapters(list);
          setLoaded(true);
        }
      } catch (e) {
        console.error('ChaptersPage: failed to load /chapters, using fallback', e);
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const chapterCards = (loaded && dynamicChapters.length > 0)
    ? dynamicChapters.map(c => ({
        name: c.name,
        foundedYear: c.foundedYear,
        tagline: c.tagline,
        pageSlug: c.pageSlug || c.id,
      }))
    : LEGACY_CHAPTER_CARDS;

  return (
  <main className="mb-content">
    {/* ===== HERO — Grape ===== */}
    <section className="mb-block mb-block-grape">
      <div className="mb-section-head" style={{ marginBottom: 16, maxWidth: "60ch" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Network · Four Chapters Strong</span>
        <h2 className="mb-h1" style={{ color: "var(--mb-chalk)" }}>
          GNF <em style={{ fontStyle: "italic", color: "var(--mb-aqua)" }}>Chapters.</em>
        </h2>
        <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.9, marginTop: 8 }}>
          We operate through local chapters &mdash; each with their own community of Limited Partners
          who review applications and select quarterly awardees.
        </p>
      </div>
    </section>

    {/* ===== CHAPTER CARDS — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div className="mb-grid mb-grid-2" style={{ gap: 28 }}>
        {chapterCards.map(c => (
          <article key={c.name} className="mb-card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h3 className="mb-h3" style={{ margin: 0 }}>{c.name}</h3>
              {c.foundedYear && (
                <span className="mb-numeral" style={{ fontSize: 13, color: "var(--mb-ink-60)", whiteSpace: "nowrap" }}>
                  EST. {c.foundedYear}
                </span>
              )}
            </div>

            {c.tagline && (
              <p className="mb-body" style={{ margin: 0, maxWidth: "48ch" }}>{c.tagline}</p>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button
                type="button"
                onClick={() => window.open(`/${c.pageSlug}`, '_blank')}
                className="mb-btn mb-btn-ink"
                style={{ padding: "10px 16px", fontSize: 12 }}
              >
                Visit Chapter
                <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
              </button>
              <button
                type="button"
                onClick={() => onLpApplicationClick && onLpApplicationClick(c.name)}
                className="mb-btn mb-btn-chalk"
                style={{ padding: "10px 16px", fontSize: 12 }}
              >
                Join as LP
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>

    {/* ===== HOW IT WORKS — Aqua ===== */}
    <section className="mb-block mb-block-aqua">
      <div className="mb-section-head" style={{ marginBottom: 24, maxWidth: "56ch" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)" }}>How Chapters Work</span>
        <h2 className="mb-h2" style={{ maxWidth: "22ch" }}>
          A collective giving organization, at the neighborhood scale.
        </h2>
      </div>
      <p className="mb-lede" style={{ maxWidth: "64ch" }}>
        GNF is a diverse group of founders, operators, and creators who share a passion for entrepreneurship
        and community. LPs pool their own resources, knowledge, and networks. We meet quarterly to review
        applications and select new micro-grant award winners.
      </p>
    </section>

    {/* ===== COLLECTIVE GIVING — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 64, alignItems: "start" }}>
        <div className="mb-section-head" style={{ margin: 0 }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Model</span>
          <h2 className="mb-h2">What is collective giving?</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-stack)" }}>
          <p className="mb-lede" style={{ maxWidth: "58ch" }}>
            Good Neighbor Fund is more than a grant program &mdash; it's a neighborhood of builders and
            believers. LPs are a diverse collective of founders, operators, and community members who pool
            their own capital each quarter to fund the boldest new ideas in their chapter.
          </p>
          <p className="mb-body" style={{ maxWidth: "60ch" }}>
            There's no overhead. No bureaucracy. We operate on a <strong style={{ fontWeight: 600 }}>money in, money out</strong> model:
            100% of LP dues go directly to fund the next wave of local founders.
          </p>
          <p className="mb-body" style={{ maxWidth: "60ch" }}>
            Each quarter, LPs come together to review applications, share dinner, and vote on who receives
            new micro-grants. The process is human, and deeply rooted in community. We follow up with founders
            over coffee, hand off giant checks, and help make their first steps a little more possible.
          </p>
        </div>
      </div>
    </section>

    {/* ===== START A CHAPTER — Magenta ===== */}
    <section className="mb-block mb-block-magenta" style={{ textAlign: "center" }}>
      <span className="mb-eyebrow" style={{ color: "var(--mb-butter)", display: "block", marginBottom: 20 }}>
        Expansion · Cities Welcome
      </span>
      <h2 className="mb-h1" style={{ color: "var(--mb-chalk)", maxWidth: "20ch", margin: "0 auto 24px" }}>
        Start a chapter in your <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>city.</em>
      </h2>
      <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.9, maxWidth: "56ch", margin: "0 auto 36px" }}>
        Interested in launching a GNF chapter in your own community? We're always looking for passionate
        good neighbors to help spread the belief capital.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => window.location.href = "https://airtable.com/app38xfYxu9HY6yT3/pagYPQAHYvAUxPfuX/form"}
          className="mb-btn mb-btn-butter"
        >
          Contact Us
          <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
        </button>
        <button
          type="button"
          onClick={() => window.open("https://jasonbartz.notion.site/Good-Neighbor-Fund-Chapter-Handbook-1fc6fdd6d4c680e2a523eb2cbd5cf365", "_blank")}
          className="mb-btn mb-btn-chalk"
        >
          Chapter Handbook
        </button>
      </div>
    </section>
  </main>
  );
};



// -- DonatePage --
const DonatePage = () => (
  <main className="mb-content">
    {/* ===== HERO — Magenta ===== */}
    <section className="mb-block mb-block-magenta">
      <div className="mb-section-head" style={{ marginBottom: 16, maxWidth: "64ch" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-butter)" }}>Support the Fund</span>
        <h2 className="mb-h1" style={{ color: "var(--mb-chalk)" }}>
          Grow communities through <em style={{ fontStyle: "italic", color: "var(--mb-butter)" }}>belief capital.</em>
        </h2>
        <p className="mb-lede" style={{ color: "var(--mb-chalk)", opacity: 0.92, marginTop: 8 }}>
          We're a 100% volunteer-led organization. Your donation directly funds our micro-grant program &mdash;
          every dollar empowers founders to turn ideas into reality.
        </p>
      </div>
    </section>

    {/* ===== DONATION OPTIONS — Paper ===== */}
    <section className="mb-block mb-block-paper">
      <div className="mb-grid mb-grid-2" style={{ gap: 28 }}>
        {/* One-Time */}
        <article className="mb-card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 18 }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-aqua-deep)" }}>Option 01 · One Time</span>
          <h3 className="mb-h3" style={{ margin: 0 }}>Make a one-time donation</h3>
          <p className="mb-body" style={{ margin: 0 }}>
            Your one-time contribution helps us award micro-grants to aspiring entrepreneurs. Every dollar
            makes a difference.
          </p>
          <a
            href="https://buy.stripe.com/8wMaEW0mqaYB1jOaEH"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-btn mb-btn-ink"
            style={{ alignSelf: "flex-start" }}
          >
            Donate via Stripe
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
          <p className="mb-micro" style={{ marginTop: 8 }}>
            All transactions processed through our fiscal sponsor, BootSector,
            a registered 501(c)3 non-profit <span className="mb-numeral">(EIN 85-4082950)</span>.
          </p>
        </article>

        {/* Club Membership */}
        <article className="mb-card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 18 }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-grape-deep)" }}>Option 02 · Recurring</span>
          <h3 className="mb-h3" style={{ margin: 0 }}>Become a GNF Club Member</h3>
          <p className="mb-body" style={{ margin: 0 }}>
            Join a community of neighbors passionate about entrepreneurship and giving back.
            Recurring support fuels the next generation of founders.
          </p>

          <div style={{ background: "var(--mb-grape-soft)", border: "var(--border-ink)", padding: 16, marginTop: 4 }}>
            <span className="mb-eyebrow" style={{ color: "var(--mb-grape-deep)" }}>Membership Benefits</span>
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, listStyleType: "none" }}>
              {["Free access to all GNF-hosted events",
                "Private GNF Slack community",
                "GNF Club stickers",
                "Social media shoutout"].map(benefit => (
                <li key={benefit} className="mb-body" style={{ position: "relative", paddingLeft: 20, marginBottom: 6 }}>
                  <span className="mb-numeral" style={{ position: "absolute", left: 0, top: 0, fontSize: 13, color: "var(--mb-grape-deep)", fontWeight: 700 }}>&rarr;</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <a
            href="https://buy.stripe.com/dR68wO3yCgiVaUo6oq"
            target="_blank"
            rel="noreferrer"
            className="mb-btn mb-btn-grape"
            style={{ alignSelf: "flex-start" }}
          >
            Join the Club
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </article>
      </div>
    </section>

    {/* ===== TAX INFO — Paper (sunken card) ===== */}
    <section className="mb-block mb-block-paper" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{
        background: "var(--mb-paper-deep)",
        border: "var(--border-ink)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap"
      }}>
        <div style={{ flex: "0 0 auto" }}>
          <span className="mb-badge">Tax-Deductible</span>
        </div>
        <p className="mb-body" style={{ margin: 0, flex: 1, minWidth: "280px", fontSize: 13 }}>
          Donations are tax-deductible to the extent allowed by law. Good Neighbor Fund operates through
          its fiscal sponsor, BootSector, a registered 501(c)3 non-profit
          <span className="mb-numeral"> (EIN 85-4082950)</span>. You'll receive a donation receipt where applicable.
        </p>
      </div>
    </section>

    {/* ===== CORPORATE SPONSORSHIP — Aqua ===== */}
    <section className="mb-block mb-block-aqua" style={{ textAlign: "center" }}>
      <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", display: "block", marginBottom: 16 }}>
        Corporate Sponsorship
      </span>
      <h2 className="mb-h2" style={{ maxWidth: "22ch", margin: "0 auto 16px" }}>
        Partner with us at the community level.
      </h2>
      <p className="mb-lede" style={{ maxWidth: "56ch", margin: "0 auto 28px" }}>
        Looking to make a larger impact? Our corporate sponsorship program offers various levels
        of involvement and recognition &mdash; support entrepreneurship while showcasing your
        commitment to local economic development.
      </p>
      <button
        type="button"
        onClick={() => window.location.href = "mailto:jason@goodneighbor.fund?subject=Corporate%20Sponsorship%20Inquiry"}
        className="mb-btn mb-btn-ink"
      >
        Contact Us About Sponsorship
        <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
      </button>
    </section>

    {/* ===== CO-FOUNDER NOTE — Butter ===== */}
    <section className="mb-block mb-block-butter">
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)", display: "block", marginBottom: 20 }}>
          A note from the co-founder
        </span>
        <blockquote
          className="mb-display"
          style={{
            fontSize: "clamp(22px, 2.6vw, 32px)",
            lineHeight: 1.35,
            margin: 0,
            borderLeft: "4px solid var(--mb-magenta)",
            paddingLeft: 24
          }}
        >
          Your support fuels $1,000 micro-grants that help early-stage founders launch their first product,
          buy initial inventory, or spread the word about their business. These small bets grow into
          job-creating, community-serving ventures.
        </blockquote>
        <div style={{ marginTop: 24, paddingLeft: 28, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 20, height: 2, background: "var(--mb-ink)", display: "inline-block" }} />
          <div>
            <div style={{ fontFamily: "var(--font-content)", fontWeight: 700, fontSize: 15, color: "var(--mb-ink)" }}>
              Jason Bartz
            </div>
            <div className="mb-numeral" style={{ fontSize: 11, color: "var(--mb-ink-60)" }}>
              CO-FOUNDER · GOOD NEIGHBOR FUND
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);