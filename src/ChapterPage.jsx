// ChapterPage.jsx
// Dynamic chapter landing page. Renders when a visitor hits a URL matching
// a chapter's pageSlug (e.g. /albany) AND there's no hand-built static HTML
// file at public/<slug>.html taking precedence on Firebase Hosting.
//
// The four legacy chapters (wny, denver, upstate, capital-region) ship with
// polished static HTML pages in public/ — those are served by Firebase Hosting
// before the SPA fallback ever runs in production. In dev / SPA-internal
// navigations this component still runs, so it mirrors the static HTML's
// structure and renders the same admin-editable fields from Firestore.
import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "./firebaseConfig";
import NotFoundPage from "./NotFoundPage";

// Gallery tile count at which we switch from a static grid to a scrolling
// marquee. Below this threshold the grid reads fine; above it, a ticker feels
// more alive and hides the fact that tiles don't neatly fill a row.
const GALLERY_MARQUEE_THRESHOLD = 5;

const photoUrlFor = (name) =>
  name ? `/assets/lps/${name.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "")}.png` : null;

export default function ChapterPage() {
  const { chapterSlug } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | found | not-found
  const [lps, setLps] = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const openLightbox = useCallback((src) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  // Escape closes the lightbox; also lock body scroll while it's open.
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxSrc, closeLightbox]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "chapters"));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const match = all.find(c => (c.pageSlug || c.id) === chapterSlug) ||
                      all.find(c => c.id === chapterSlug);
        if (cancelled) return;
        if (match && match.active !== false) {
          setChapter(match);
          setStatus("found");
        } else {
          setStatus("not-found");
        }
      } catch (e) {
        console.error("ChapterPage: failed to load chapter", e);
        if (!cancelled) setStatus("not-found");
      }
    })();
    return () => { cancelled = true; };
  }, [chapterSlug]);

  // Load LPs for the chapter once we know its display name and the LP grid is
  // toggled on. Query is scoped with a role filter so every returned doc
  // satisfies the public-read clause in firestore.rules — this keeps the list
  // visible to unauthenticated visitors on the public chapter pages.
  useEffect(() => {
    if (!chapter?.name || chapter.showLPs === false) {
      setLps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Two queries: the primary lp/chapter_director roster, plus any
        // superAdmins who have opted into the chapter's public listing by
        // setting chapterRole. Firestore has no OR across disparate field
        // filters in the classic SDK, and splitting matches the public-read
        // firestore.rules branches anyway.
        const primaryQ = query(
          collection(db, "users"),
          where("chapter", "==", chapter.name),
          where("role", "in", ["lp", "chapter_director"])
        );
        const adminListedQ = query(
          collection(db, "users"),
          where("chapter", "==", chapter.name),
          where("role", "==", "superAdmin"),
          where("chapterRole", "in", ["lp", "chapter_director"])
        );
        const [primarySnap, adminSnap] = await Promise.all([
          getDocs(primaryQ),
          getDocs(adminListedQ).catch(() => ({ docs: [] })),
        ]);
        if (cancelled) return;
        const byId = new Map();
        for (const d of [...primarySnap.docs, ...adminSnap.docs]) {
          byId.set(d.id, { id: d.id, ...d.data() });
        }
        const list = [...byId.values()]
          .filter(u => u.active !== false)
          .sort((a, b) => {
            // Rank on effective role: superAdmins listed via chapterRole sort
            // as whichever role they've opted into.
            const roleFor = (u) => (u.role === 'superAdmin' ? (u.chapterRole || u.role) : u.role);
            const rank = (u) => (roleFor(u) === 'chapter_director' ? 0 : 1);
            const ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            return (a.name || '').localeCompare(b.name || '');
          });
        setLps(list);
      } catch (e) {
        if (!cancelled) setLps([]);
      }
    })();
    return () => { cancelled = true; };
  }, [chapter?.name, chapter?.showLPs]);

  if (status === "loading") {
    return (
      <div style={pageStyle}>
        <p style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>Loading chapter…</p>
      </div>
    );
  }

  if (status === "not-found") {
    return <NotFoundPage />;
  }

  const {
    name, tagline, foundedYear, emailAlias,
    heroTitle, heroTagline, heroImage, heroImageCaption,
    servingTitle, servingText,
    counties = [], poweredByText,
    galleryPhotos = [],
    showLPs = true, showGallery = true,
    pageSlug, id: chapterId,
  } = chapter;

  const slug = pageSlug || chapterId;
  // Default to 2023 — when every existing chapter was founded, and matches
  // the "Our Impact Since 2023" stat heading. Firestore override wins.
  const displayFoundedYear = foundedYear || 2023;

  return (
    <div style={pageStyle}>
      <div className="win95-container">
        {/* Hero */}
        <section className="win95-hero">
          <div className="win95-hero-content">
            <div className="win95-hero-left">
              <div style={eyebrowStyle}>Good Neighbor Fund {name} · Est. {displayFoundedYear}</div>
              <h1>{heroTitle || `$1,000 Micro-Grants for ${name} Business Ideas`}</h1>
              <p>
                <strong>We back brilliant ideas before they're "ready."</strong>{" "}
                {heroTagline || "No pitch deck required. No equity taken. Just belief in your vision and potential."}
              </p>
              <a href="/pitch" className="win95-cta" onClick={(e) => { e.preventDefault(); navigate("/pitch"); }}>
                Submit Your Pitch Today
              </a>
            </div>
            {heroImage && (
              <div className="win95-hero-right">
                <img src={heroImage} alt={heroImageCaption || `${name} chapter hero`} />
                {heroImageCaption && (
                  <div className="win95-hero-caption">{heroImageCaption}</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Serving + Impact Stats (two-col) */}
        <div className="win95-two-col">
          {(servingTitle || servingText || counties.length > 0 || tagline) && (
            <section className="win95-section win95-section--pink">
              <h2>{servingTitle || `Serving ${name}`}</h2>
              {(servingText || tagline) && (
                <p className="win95-body">{servingText || tagline}</p>
              )}
              {counties.length > 0 && (
                <div className="win95-chip-grid">
                  {counties.map((c, i) => (
                    <div key={i} className="win95-chip">{c}</div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="win95-section win95-section--blue">
            <h2>Our Impact Since {displayFoundedYear}</h2>
            <div className="win95-stat-grid">
              <div className="win95-stat">
                <div className="win95-stat-num win95-stat-num--blue">34</div>
                <p>New Business Ideas<br />Funded</p>
              </div>
              <div className="win95-stat">
                <div className="win95-stat-num win95-stat-num--pink">80%</div>
                <p>Women-Owned<br />Businesses</p>
              </div>
              <div className="win95-stat">
                <div className="win95-stat-num win95-stat-num--yellow">52%</div>
                <p>BIPOC-Owned<br />Businesses</p>
              </div>
              <div className="win95-stat">
                <div className="win95-stat-num win95-stat-num--purple">$34,000+</div>
                <p>In Micro-Grants<br />Awarded</p>
              </div>
            </div>
          </section>
        </div>

        {/* Powered by */}
        <section className="win95-section win95-section--purple" style={{ textAlign: "center" }}>
          <h2 style={{ borderBottom: "none" }}>Powered by People, Not Institutions</h2>
          <p className="win95-body" style={{ maxWidth: 800, margin: "0 auto" }}>
            {poweredByText ||
              `Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in ${name}. No overhead. No bureaucracy. Just neighbors investing in neighbors.`}
          </p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <a
              href={`/lp-application?chapter=${encodeURIComponent(slug)}`}
              className="win95-cta win95-cta--alt"
              onClick={(e) => { e.preventDefault(); navigate(`/lp-application?chapter=${encodeURIComponent(slug)}`); }}
            >
              Become a Limited Partner
            </a>
          </div>
        </section>

        {/* Chapter LPs */}
        {showLPs !== false && lps.length > 0 && (
          <section className="win95-section">
            <h1 style={{ textAlign: "center" }}>{name} Chapter LPs</h1>
            <div className="win95-lp-grid">
              {lps.map(lp => {
                // Effective presentation role: superAdmins opt into display
                // via chapterRole; everyone else uses their actual role.
                const effectiveRole = lp.role === 'superAdmin' ? (lp.chapterRole || lp.role) : lp.role;
                return (
                <div key={lp.id} className="win95-lp-card">
                  {effectiveRole === 'chapter_director' && (
                    <span className="win95-lp-director-tag">Chapter Director</span>
                  )}
                  {photoUrlFor(lp.name) && (
                    <img
                      src={photoUrlFor(lp.name)}
                      alt={`${lp.name}${lp.professionalRole ? ` - ${lp.professionalRole}` : ""} - Good Neighbor Fund Limited Partner`}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <h3>
                    {lp.linkedinUrl
                      ? <a href={lp.linkedinUrl} target="_blank" rel="noreferrer">{lp.name}</a>
                      : lp.name}
                  </h3>
                  {lp.professionalRole && <p className="win95-lp-role">{lp.professionalRole}</p>}
                  {lp.bio && <p className="win95-lp-bio">{lp.bio}</p>}
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Community Gallery — marquee once there are enough photos, grid otherwise */}
        {showGallery !== false && Array.isArray(galleryPhotos) && galleryPhotos.length > 0 && (() => {
          const useMarquee = galleryPhotos.length >= GALLERY_MARQUEE_THRESHOLD;
          // Duplicate the photo list so the CSS keyframes can translate
          // -50% for a seamless loop.
          const marqueeList = useMarquee ? [...galleryPhotos, ...galleryPhotos] : galleryPhotos;
          return (
            <section className="win95-section">
              <h2>Building {name}'s Entrepreneurial Community</h2>
              {useMarquee ? (
                <div className="win95-gallery-marquee" aria-label="Community photo gallery">
                  <div className="win95-gallery-marquee-track">
                    {marqueeList.map((photo, i) => (
                      <button
                        key={`${photo.storagePath || photo.url || i}-${i}`}
                        type="button"
                        className="win95-image"
                        onClick={() => openLightbox(photo.url)}
                        aria-label={photo.caption || `Enlarge community photo ${(i % galleryPhotos.length) + 1}`}
                        style={{ padding: 0, background: 'transparent' }}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || `${name} community moment ${(i % galleryPhotos.length) + 1}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="win95-image-grid">
                  {galleryPhotos.map((photo, i) => (
                    <button
                      key={photo.storagePath || photo.url || i}
                      type="button"
                      className="win95-image"
                      onClick={() => openLightbox(photo.url)}
                      aria-label={photo.caption || `Enlarge community photo ${i + 1}`}
                      style={{ padding: 0, background: 'transparent' }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `${name} community moment ${i + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* Final CTA */}
        <section className="win95-final-cta">
          <h2>Ready to Bring Your Business Idea to Life?</h2>
          <p>
            We're looking for passionate founders with bold ideas that create positive impact in {name}.
            No business plan required — just a 60-second pitch video and your authentic vision.
          </p>
          <a href="/pitch" className="win95-cta" onClick={(e) => { e.preventDefault(); navigate("/pitch"); }}>
            Submit Your Pitch Today
          </a>
        </section>

        <footer className="win95-footer">
          <img src="/assets/gnf-logo.png" alt="Good Neighbor Fund" className="win95-footer-logo" />

          {emailAlias && (
            <div className="win95-footer-contact">
              <span className="win95-footer-contact-label">Questions?</span>
              <a href={`mailto:${emailAlias}`} className="win95-footer-mailto">
                Email {name}
              </a>
            </div>
          )}

          <div className="win95-footer-meta">
            <div className="win95-footer-links">
              <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a>
              <a href="/pitch" onClick={(e) => { e.preventDefault(); navigate("/pitch"); }}>Apply</a>
            </div>
            <p className="win95-footer-copy">&copy; 2026 Good Neighbor Fund</p>
          </div>
        </footer>
      </div>

      {lightboxSrc && (
        <div
          className="win95-lightbox"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo"
        >
          <button
            type="button"
            className="win95-lightbox-close"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="win95-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "var(--mb-paper)",
  fontFamily: "var(--font-content)",
  color: "var(--mb-ink)",
};

const eyebrowStyle = {
  fontSize: "11px",
  fontFamily: "var(--font-pixel)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--mb-magenta)",
  marginBottom: "8px",
};
