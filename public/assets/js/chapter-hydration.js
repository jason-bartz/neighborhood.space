// chapter-hydration.js
// Runs on the static chapter landing pages (public/<slug>.html). Reads the
// matching /chapters/<slug> Firestore doc and overrides editable fields
// (hero title, tagline, counties, powered-by text) + toggles the optional
// LP grid and community gallery sections based on the doc's flags.
//
// Fails silently — if Firestore is unreachable or the doc is missing, the
// hard-coded defaults in the HTML remain.
//
// Anti-flash policy:
//   Every applyX / setStatSlot helper compares the incoming value against
//   what's already in the DOM and bails if they match. This means that
//   when the static HTML is in sync with Firestore (the common case),
//   hydration is a true no-op — no reflow, no aria-live churn, no flash.
//
//   The hero <img src> is NOT hydrated from Firestore. It's the LCP
//   element with fetchpriority="high", and reassigning .src after the
//   browser has already committed the fallback triggers a second image
//   download and a visible blank frame. Hero image edits MUST be made
//   to the static HTML directly. Firestore's `heroImageCaption` is still
//   honored (cheap text swap; benefits from the skip-if-equal guard).
(function () {
  "use strict";

  var body = document.body;
  if (!body) return;
  var slug = body.getAttribute("data-chapter-slug");
  if (!slug) return;

  // ---------------------------------------------------------------
  // LP roster fast path — fetch the JSON snapshot from Storage and
  // render BEFORE the Firebase SDK is even ready. Cuts ~400-700ms
  // (SDK load + 1 chapter doc read + 2 user queries) down to a
  // single CDN-cached HTTP GET on the critical path. The snapshot is
  // kept fresh by Cloud Functions (refreshLpRosterOnUserWrite /
  // refreshLpRosterOnChapterWrite). Falls back silently to the
  // Firestore path below if the snapshot is missing or fails — the
  // chapter doc handler awaits this promise and skips the Firestore
  // roster render when this one succeeded.
  //
  // Bucket name is hardcoded — same five-place footgun called out in
  // CLAUDE.md (this is the sixth). If it changes here, also change
  // firebaseConfig.js, storage.rules, the four chapter HTML files,
  // and chapterRosterSnapshot.js.
  var lpSnapshotUrl = "https://firebasestorage.googleapis.com/v0/b/gnf-app-9d7e3.firebasestorage.app/o/"
    + encodeURIComponent("chapter-rosters/" + slug + "/lps.json")
    + "?alt=media";
  var lpSnapshotRendered = false;
  var lpSnapshotPromise = (typeof fetch === "function"
    ? fetch(lpSnapshotUrl, { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    : Promise.resolve(null));

  // ---------------------------------------------------------------
  // Page-nav scrollspy — runs unconditionally (no Firebase needed).
  // Sets aria-current="page" on the page-nav anchor whose target section
  // is currently in view. Defined early so it still works when Firestore
  // is unreachable and the rest of this IIFE bails out below.
  // ---------------------------------------------------------------
  (function initPageNavScrollspy() {
    if (typeof IntersectionObserver !== "function") return;
    var nav = document.querySelector(".win95-page-nav");
    if (!nav) return;
    var links = nav.querySelectorAll("a[href^='#']");
    if (links.length === 0) return;

    var linkByTargetId = {};
    var sections = [];
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var id = href.charAt(0) === "#" ? href.slice(1) : "";
      if (!id) continue;
      var target = document.getElementById(id);
      if (!target) continue;
      linkByTargetId[id] = links[i];
      sections.push(target);
    }
    if (sections.length === 0) return;

    function setActive(id) {
      for (var k = 0; k < links.length; k++) links[k].removeAttribute("aria-current");
      var link = linkByTargetId[id];
      if (link) link.setAttribute("aria-current", "page");
    }

    setActive(sections[0].id);

    // Track the topmost intersecting section so the active link tracks what
    // the visitor is actually reading rather than whatever last poked into
    // the bottom of the viewport.
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .map(function (e) { return e.target; });
      if (visible.length === 0) return;
      visible.sort(function (a, b) { return a.offsetTop - b.offsetTop; });
      setActive(visible[0].id);
    }, { rootMargin: "-60px 0px -55% 0px", threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  })();

  var firebaseConfig = {
    apiKey: "AIzaSyCL7wTtcIlMmAm8JQB2p4z9wVaCUrm5w1Q",
    authDomain: "www.goodneighbor.fund",
    projectId: "gnf-app-9d7e3",
    storageBucket: "gnf-app-9d7e3.firebasestorage.app",
    messagingSenderId: "431730670558",
    appId: "1:431730670558:web:12c980966bfe5dfb9c7b4f"
  };

  try {
    if (!window.firebase || !window.firebase.firestore) return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  } catch (e) {
    return;
  }

  var db;
  try { db = firebase.firestore(); } catch (e) { return; }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Whitespace-tolerant string compare. The static HTML is hand-indented so
  // a paragraph's textContent carries leading newlines + soft-wraps that
  // wouldn't be present in the Firestore string. Normalizing both sides
  // before equality lets the skip-if-equal guards bail in the common case.
  function normalizeText(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  function applyTextField(name, value) {
    if (value === undefined || value === null || value === "") return;
    var nodes = document.querySelectorAll('[data-chapter-field="' + name + '"]');
    var normalizedValue = normalizeText(value);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      // Preserve a leading <strong> lede (e.g. hero tagline) when the field
      // has one — the bold phrase is part of the brand voice and not
      // something the director is expected to re-type every edit.
      var lede = node.querySelector("strong[data-chapter-lede]");
      if (lede) {
        // The would-be-new trailing text is " " + value; compare against
        // the current trailing text (everything after the lede in DOM
        // order) so we don't mutate when the static HTML is already right.
        var currentTrail = "";
        var sib = lede.nextSibling;
        while (sib) {
          currentTrail += sib.textContent || "";
          sib = sib.nextSibling;
        }
        if (normalizeText(currentTrail) === normalizedValue) continue;
        // Replace only the text that follows the lede.
        while (node.lastChild && node.lastChild !== lede) {
          node.removeChild(node.lastChild);
        }
        node.appendChild(document.createTextNode(" " + value));
      } else {
        if (normalizeText(node.textContent) === normalizedValue) continue;
        node.textContent = value;
      }
    }
  }

  function applyCounties(counties) {
    if (!Array.isArray(counties) || counties.length === 0) return;
    var grid = document.querySelector('[data-chapter-field="counties"]');
    if (!grid) return;
    // Skip if the chip set already matches what Firestore wants — same order,
    // same names. Avoids a layout-shifting innerHTML rewrite when the static
    // HTML is in sync.
    var currentChips = grid.querySelectorAll(".win95-chip");
    if (currentChips.length === counties.length) {
      var allMatch = true;
      for (var i = 0; i < counties.length; i++) {
        if (normalizeText(currentChips[i].textContent) !== normalizeText(counties[i])) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) return;
    }
    grid.innerHTML = counties
      .map(function (c) { return '<div class="win95-chip">' + escapeHtml(c) + "</div>"; })
      .join("");
  }

  // Hero caption + alt text only. The hero <img src> is intentionally NOT
  // hydrated — see the anti-flash policy in the file header. The url arg
  // is accepted for backward compatibility with the call site but ignored;
  // hero image edits go in the static HTML.
  function applyHeroImage(_url, caption) {
    if (!caption) return;
    var img = document.querySelector(".win95-hero-right img");
    if (img && img.alt !== caption) img.alt = caption;
    var capEl = document.querySelector(".win95-hero-caption");
    if (capEl && capEl.textContent !== caption) capEl.textContent = caption;
  }

  // Matches the React component's GALLERY_MARQUEE_THRESHOLD — above it we
  // switch from a static grid to a scrolling ticker to hide partial rows.
  var GALLERY_MARQUEE_THRESHOLD = 5;

  function applyGallery(photos) {
    if (!Array.isArray(photos) || photos.length === 0) return;
    var section = document.querySelector('[data-chapter-section="gallery"]');
    if (!section) return;
    var existing = section.querySelector(".win95-image-grid, .win95-gallery-marquee");
    if (!existing) return;

    var total = photos.length;
    var useMarquee = total >= GALLERY_MARQUEE_THRESHOLD;
    // Duplicate the list so the CSS keyframes (translate -50%) produce a
    // seamless loop — mirrors the React component's marquee behavior.
    var list = useMarquee ? photos.concat(photos) : photos;

    var tile = function (p, i) {
      var idx = (i % total) + 1;
      return '<div class="win95-image"><img src="' + escapeHtml(p.url || "") +
             '" alt="' + escapeHtml(p.caption || ("Community moment " + idx)) + '" /></div>';
    };

    var html = useMarquee
      ? '<div class="win95-gallery-marquee" aria-label="Community photo gallery">' +
          '<div class="win95-gallery-marquee-track">' + list.map(tile).join("") + '</div>' +
        '</div>'
      : '<div class="win95-image-grid">' + list.map(tile).join("") + '</div>';

    var tmpl = document.createElement("template");
    tmpl.innerHTML = html;
    existing.replaceWith(tmpl.content.firstElementChild);
  }

  function toggleSection(name, visible) {
    if (typeof visible !== "boolean") return;
    var el = document.querySelector('[data-chapter-section="' + name + '"]');
    if (!el) return;
    // Use the .is-hidden utility (defined in win95-base.css) instead of
    // mutating inline display so the toggle stays in CSS-land — easier to
    // override per breakpoint and keeps the markup readable in DevTools.
    el.classList.toggle("is-hidden", !visible);
    // Keep the page-jump nav link in sync with its section. Anchor links to
    // a hidden section would scroll nowhere, so we hide them too. The HTML
    // defaults already match each section's default visibility.
    var navLink = document.querySelector('[data-nav-target="' + name + '"]');
    if (navLink) navLink.classList.toggle("is-hidden", !visible);
  }

  // ---------------------------------------------------------------
  // Impact stats — auto-computed from the chapter's grant winners
  // ---------------------------------------------------------------
  // Counts /pitches docs where isWinner==true and chapter==chapterName, then
  // the share whose demographic tags mention "women" / "bipoc". Firestore
  // stores the tags as `selfIdentification` (the pitch form maps its internal
  // `selfId` state to this field on submit — see PitchPage.jsx and
  // googleSheets.js); legacy docs may still use `selfId`, so we read either.
  // Match is case-insensitive substring so "Women-Owned", "Women Owned/Led",
  // and "BIPOC-owned" all count. Each grant is a flat $1,000 so the dollar
  // figure is just count × 1000.
  //
  // Updates the four [data-chapter-stat] slots and the [data-chapter-stat-year]
  // heading inline. Failure leaves the static fallback numbers in place.
  function applyImpactYear(year) {
    if (!year) return;
    var s = String(year);
    var nodes = document.querySelectorAll('[data-chapter-stat-year]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent === s) continue;
      nodes[i].textContent = s;
    }
  }

  // Map stat slot names to the screen-reader phrasing the visible "0%" /
   // "$0" numbers don't carry on their own. Voiced as "<value> <suffix>".
  var STAT_LABEL_SUFFIX = {
    grants: "new business ideas funded",
    women: "of grants to women-owned businesses",
    bipoc: "of grants to BIPOC-owned businesses",
    dollars: "in micro-grants awarded"
  };

  function setStatSlot(name, value) {
    var nodes = document.querySelectorAll('[data-chapter-stat="' + name + '"]');
    var suffix = STAT_LABEL_SUFFIX[name];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent === value) continue;
      nodes[i].textContent = value;
      // Pin a screen-reader-only sentence on the parent .win95-stat tile so
      // assistive tech announces the meaning (the small <p> caption beneath
      // the number is split across <br>s and reads weirdly otherwise).
      if (suffix) {
        var tile = nodes[i].closest && nodes[i].closest(".win95-stat");
        if (tile) tile.setAttribute("aria-label", value + " " + suffix);
      }
    }
  }

  function renderImpactStats(chapterName) {
    if (!chapterName) return Promise.resolve();
    // Bail early if no slots exist on the page (defensive — every chapter
    // landing should have them now, but a stripped-down page shouldn't crash).
    if (!document.querySelector('[data-chapter-stat]')) return Promise.resolve();
    return db.collection("pitches")
      .where("isWinner", "==", true)
      .get()
      .then(function (snap) {
        var total = 0, women = 0, bipoc = 0;
        (snap.docs || []).forEach(function (d) {
          var data = d.data() || {};
          if ((data.chapter || "") !== chapterName) return;
          total += 1;
          var ids = Array.isArray(data.selfIdentification)
            ? data.selfIdentification
            : (Array.isArray(data.selfId) ? data.selfId : []);
          var hasWomen = false, hasBipoc = false;
          for (var k = 0; k < ids.length; k++) {
            var v = String(ids[k] || "").toLowerCase();
            if (v.indexOf("women") !== -1) hasWomen = true;
            if (v.indexOf("bipoc") !== -1) hasBipoc = true;
          }
          if (hasWomen) women += 1;
          if (hasBipoc) bipoc += 1;
        });
        var womenPct = total > 0 ? Math.round((women / total) * 100) : 0;
        var bipocPct = total > 0 ? Math.round((bipoc / total) * 100) : 0;
        setStatSlot("grants", String(total));
        setStatSlot("women", womenPct + "%");
        setStatSlot("bipoc", bipocPct + "%");
        setStatSlot("dollars", "$" + (total * 1000).toLocaleString());
      })
      .catch(function (err) {
        if (window.console && console.warn) console.warn("impact stats hydration:", err);
      });
  }

  // ---------------------------------------------------------------
  // Grant Awardees grid
  // ---------------------------------------------------------------
  // Parallel to the React <GrantAwardees chapterName={name} /> used on the
  // dynamic ChapterPage. Fetches /pitches where isWinner==true scoped to this
  // chapter, then renders a filter toolbar (search + sort — no chapter
  // dropdown since we're already scoped) and a card grid. Clicking a card
  // opens a detail modal with an optional Visit Website button.
  //
  // Only invoked when data.showAwardees === true (the section is display:none
  // otherwise). Renders into <div data-chapter-slot="awardees-grid"> inside
  // the [data-chapter-section="awardees"] wrapper.

  function computeQuarter(createdAt) {
    if (!createdAt) return { label: "Unknown Quarter", ms: 0 };
    try {
      var d = (createdAt && typeof createdAt.toDate === "function") ? createdAt.toDate() : new Date(createdAt);
      if (isNaN(d.getTime())) return { label: "Unknown Quarter", ms: 0 };
      var q = Math.floor(d.getMonth() / 3) + 1;
      return { label: "Q" + q + " " + d.getFullYear(), ms: d.getTime() };
    } catch (e) {
      return { label: "Unknown Quarter", ms: 0 };
    }
  }

  function sortAwardees(list, mode) {
    var out = list.slice();
    if (mode === "newest") out.sort(function (a, b) { return b.createdAtMs - a.createdAtMs; });
    else if (mode === "oldest") out.sort(function (a, b) { return a.createdAtMs - b.createdAtMs; });
    else out.sort(function (a, b) { return (a.businessName || "").localeCompare(b.businessName || ""); });
    return out;
  }

  function filterAwardees(list, term) {
    var t = String(term || "").trim().toLowerCase();
    if (!t) return list;
    return list.filter(function (a) {
      return (a.businessName || "").toLowerCase().indexOf(t) !== -1
          || (a.founderName || "").toLowerCase().indexOf(t) !== -1;
    });
  }

  function renderAwardeeCard(a, i) {
    var eager = i < 4;
    var imgHtml = a.photoUrl
      ? '<div style="border-bottom: var(--border-ink-2); background: var(--mb-ink);">' +
          '<img src="' + escapeHtml(a.photoUrl) + '"' +
               ' alt="' + escapeHtml(a.businessName + " - " + a.chapter + " Good Neighbor Fund $1,000 grant recipient") + '"' +
               ' width="400" height="400"' +
               ' loading="' + (eager ? "eager" : "lazy") + '"' +
               ' fetchpriority="' + (eager ? "high" : "auto") + '"' +
               ' decoding="async"' +
               ' style="width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;display:block;" />' +
        '</div>'
      : "";
    return (
      '<button type="button" class="mb-card" data-awardee-id="' + escapeHtml(a.id) + '"' +
        ' aria-label="View details for ' + escapeHtml(a.businessName + " by " + a.founderName) + '"' +
        ' style="padding:0;display:flex;flex-direction:column;overflow:hidden;text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%;">' +
        imgHtml +
        '<div style="padding:18px;display:flex;flex-direction:column;gap:6px;flex:1;">' +
          '<div class="mb-numeral" style="font-size:11px;color:var(--mb-ink-60);display:flex;justify-content:space-between;gap:8px;">' +
            '<span>' + escapeHtml(a.chapter) + '</span>' +
            '<span>' + escapeHtml(a.quarter) + '</span>' +
          '</div>' +
          '<h3 class="mb-h4" style="margin:0;font-family:var(--font-serif);font-weight:600;font-size:24px;line-height:1.1;letter-spacing:-0.01em;">' +
            escapeHtml(a.businessName) +
          '</h3>' +
          '<div class="mb-italic" style="font-size:14px;color:var(--mb-ink-60);">by ' + escapeHtml(a.founderName) + '</div>' +
        '</div>' +
      '</button>'
    );
  }

  // One modal instance per page; lazily created on first card click.
  var awardeeModalEl = null;
  var awardeeModalPrevOverflow = "";
  var awardeeModalKeyHandler = null;
  var awardeeModalReturnFocusEl = null;

  function closeAwardeeModal() {
    if (!awardeeModalEl) return;
    awardeeModalEl.parentNode && awardeeModalEl.parentNode.removeChild(awardeeModalEl);
    awardeeModalEl = null;
    document.body.style.overflow = awardeeModalPrevOverflow;
    if (awardeeModalKeyHandler) {
      window.removeEventListener("keydown", awardeeModalKeyHandler);
      awardeeModalKeyHandler = null;
    }
    // Return focus to whatever opened the modal (typically the awardee
    // card the user clicked) so keyboard nav doesn't dump them at the top
    // of the document.
    if (awardeeModalReturnFocusEl && typeof awardeeModalReturnFocusEl.focus === "function") {
      try { awardeeModalReturnFocusEl.focus(); } catch (e) { /* noop */ }
    }
    awardeeModalReturnFocusEl = null;
  }

  function openAwardeeModal(awardee) {
    closeAwardeeModal();
    var rawUrl = String(awardee.website || "");
    var websiteHref = rawUrl
      ? (rawUrl.indexOf("http") === 0 ? rawUrl : "http://" + rawUrl)
      : "";
    var websiteHtml = websiteHref
      ? '<a href="' + escapeHtml(websiteHref) + '" target="_blank" rel="noopener noreferrer"' +
          ' class="mb-btn mb-btn-ink"' +
          ' style="margin-top:8px;width:100%;padding:12px 14px;font-size:13px;">' +
          'Visit Website<span class="mb-btn-arrow" aria-hidden="true">&rarr;</span>' +
        '</a>'
      : "";
    var aboutHtml = awardee.about
      ? '<p class="mb-body" style="font-size:14px;line-height:1.6;margin-top:4px;">' + escapeHtml(awardee.about) + '</p>'
      : "";
    var imgHtml = awardee.photoUrl
      ? '<div style="border-bottom:var(--border-ink-2);background:var(--mb-ink);flex-shrink:0;display:flex;justify-content:center;">' +
          '<img src="' + escapeHtml(awardee.photoUrl) + '"' +
               ' alt="' + escapeHtml(awardee.businessName + " - " + awardee.chapter + " Good Neighbor Fund $1,000 grant recipient") + '"' +
               ' style="max-height:260px;max-width:100%;width:auto;height:auto;object-fit:contain;display:block;" />' +
        '</div>'
      : "";

    var backdrop = document.createElement("div");
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "awardee-modal-title");
    // The class hooks the fade-in keyframe in theme-tokens.css; the inline
    // styles cover layout (no equivalent utility exists for fixed-inset
    // overlays in the chapter-page surface yet).
    backdrop.className = "mb-modal-backdrop";
    backdrop.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;" +
      "justify-content:center;align-items:center;z-index:1000;padding:20px;box-sizing:border-box;";
    backdrop.innerHTML =
      '<div data-awardee-modal-shell' +
        ' style="background:var(--mb-chalk);border:var(--border-ink-2);box-shadow:var(--shadow-hard-lg);' +
        'width:100%;max-width:640px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;position:relative;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--mb-ink);' +
          'color:var(--mb-chalk);padding:10px 14px;flex-shrink:0;font-family:var(--font-pixel);letter-spacing:0.14em;' +
          'text-transform:uppercase;font-size:11px;font-weight:700;">' +
          '<span>Grant Awardee</span>' +
          '<button type="button" data-awardee-modal-close aria-label="Close"' +
            ' style="background:var(--mb-magenta);border:1px solid var(--mb-chalk);color:var(--mb-chalk);' +
            'width:22px;height:22px;line-height:1;font-size:14px;font-weight:bold;cursor:pointer;padding:0;' +
            'display:flex;align-items:center;justify-content:center;font-family:var(--font-content);">&times;</button>' +
        '</div>' +
        '<div style="overflow-y:auto;flex:1;">' +
          imgHtml +
          '<div style="padding:24px;display:flex;flex-direction:column;gap:12px;">' +
            '<div class="mb-numeral" style="font-size:11px;color:var(--mb-ink-60);display:flex;justify-content:space-between;gap:8px;">' +
              '<span>' + escapeHtml(awardee.chapter) + '</span>' +
              '<span>' + escapeHtml(awardee.quarter) + '</span>' +
            '</div>' +
            '<h2 id="awardee-modal-title" class="mb-h3"' +
              ' style="margin:0;line-height:1.1;letter-spacing:-0.01em;">' +
              escapeHtml(awardee.businessName) +
            '</h2>' +
            '<div class="mb-italic" style="font-size:15px;color:var(--mb-ink-60);">by ' + escapeHtml(awardee.founderName) + '</div>' +
            aboutHtml +
            websiteHtml +
          '</div>' +
        '</div>' +
      '</div>';

    // Click-outside-to-close: any click on the backdrop that isn't on the
    // inner shell dismisses the modal. Matches the React AwardeeModal.
    backdrop.addEventListener("click", function (e) {
      var shell = backdrop.querySelector("[data-awardee-modal-shell]");
      if (shell && !shell.contains(e.target)) closeAwardeeModal();
    });
    var closeBtn = backdrop.querySelector("[data-awardee-modal-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeAwardeeModal);

    document.body.appendChild(backdrop);
    awardeeModalEl = backdrop;
    awardeeModalPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Stash whatever was focused (the awardee card, typically) so we can
    // restore focus to it on close.
    awardeeModalReturnFocusEl = document.activeElement;

    var shellEl = backdrop.querySelector("[data-awardee-modal-shell]");
    var focusableSelector = 'a[href], button, [tabindex]:not([tabindex="-1"])';

    // Move keyboard focus into the modal so screen readers + sighted users
    // navigating by keyboard land inside the dialog. Prefer the close button
    // (a known target) over the visit-website link so Esc/Enter feel natural.
    var initialFocusEl = backdrop.querySelector("[data-awardee-modal-close]");
    if (initialFocusEl && typeof initialFocusEl.focus === "function") {
      try { initialFocusEl.focus(); } catch (e) { /* noop */ }
    }

    awardeeModalKeyHandler = function (e) {
      if (e.key === "Escape") {
        closeAwardeeModal();
        return;
      }
      // Lightweight focus trap: cycle Tab/Shift+Tab through the modal's own
      // focusable elements. Avoids dumping focus into the page underneath
      // (which is inert behind the backdrop but still tab-reachable).
      if (e.key !== "Tab" || !shellEl) return;
      var focusables = shellEl.querySelectorAll(focusableSelector);
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !shellEl.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", awardeeModalKeyHandler);
  }

  function renderAwardeesGrid(chapterName) {
    if (!chapterName) return Promise.resolve();
    var slot = document.querySelector('[data-chapter-slot="awardees-grid"]');
    if (!slot) return Promise.resolve();

    // Scaffolding: filter toolbar (search + sort, --two modifier since we
    // already know the chapter) + status row + grid container.
    slot.innerHTML =
      '<div class="mb-awardee-filters mb-awardee-filters--two" style="margin-bottom:24px;">' +
        '<input type="search" data-awardees-search' +
          ' placeholder="Search by founder or business name"' +
          ' aria-label="Search by founder or business name"' +
          ' style="padding:12px 14px;font-family:var(--font-content);font-size:14px;' +
            'background:var(--mb-chalk);color:var(--mb-ink);border:var(--border-ink-2);box-shadow:var(--shadow-hard-sm);" />' +
        '<select data-awardees-sort aria-label="Sort awardees"' +
          ' style="padding:12px 14px;font-family:var(--font-content);font-size:14px;' +
            'background:var(--mb-chalk);color:var(--mb-ink);border:var(--border-ink-2);box-shadow:var(--shadow-hard-sm);">' +
          '<option value="alpha">Sort · Alphabetical</option>' +
          '<option value="newest">Sort · Newest first</option>' +
          '<option value="oldest">Sort · Oldest first</option>' +
        '</select>' +
      '</div>' +
      '<div data-awardees-status style="text-align:center;padding:40px 0;">' +
        '<span class="mb-numeral" style="font-size:14px;color:var(--mb-ink-60);">LOADING AWARDEES&hellip;</span>' +
      '</div>' +
      '<div data-awardees-grid class="mb-grid mb-grid-4" style="gap:28px;"></div>';

    var searchEl = slot.querySelector("[data-awardees-search]");
    var sortEl = slot.querySelector("[data-awardees-sort]");
    var statusEl = slot.querySelector("[data-awardees-status]");
    var gridEl = slot.querySelector("[data-awardees-grid]");

    // Delegate card clicks up the grid so we don't have to re-bind after
    // every re-render. Look up the awardee by id on the current list.
    gridEl.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-awardee-id]");
      if (!btn) return;
      var id = btn.getAttribute("data-awardee-id");
      var list = gridEl._awardees || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { openAwardeeModal(list[i]); return; }
      }
    });

    // Single equality filter — matches the React component's Firestore query
    // exactly (the Navigator tab uses the same shape). Client-side chapter
    // filter keeps us off any composite-index requirement and lets us reuse
    // the server's warm query cache across both entry points.
    return db.collection("pitches")
      .where("isWinner", "==", true)
      .get()
      .then(function (snap) {
        var all = [];
        (snap.docs || []).forEach(function (d) {
          var data = d.data() || {};
          if ((data.chapter || "") !== chapterName) return;
          // Hide winners staged in the admin Grant Winners tab but not yet
          // published. Missing field reads as published (existing winners).
          if (data.winnerPublished === false) return;
          var q = computeQuarter(data.createdAt);
          all.push({
            id: d.id,
            businessName: data.businessName || "Unnamed Business",
            founderName: data.founderName || "Unknown Founder",
            about: data.about || "",
            website: data.website || "",
            photoUrl: data["pitch-photo"] || data.founderPhotoUrl || "",
            chapter: data.chapter || chapterName,
            quarter: q.label,
            createdAtMs: q.ms
          });
        });

        function repaint() {
          var filtered = filterAwardees(all, searchEl.value);
          var sorted = sortAwardees(filtered, sortEl.value);
          gridEl._awardees = sorted;
          if (sorted.length === 0) {
            gridEl.innerHTML = "";
            statusEl.style.display = "";
            statusEl.innerHTML = all.length === 0
              ? '<p class="mb-body" style="text-align:center;">No awardees to show yet. Check back after the next grant cycle.</p>'
              : '<div style="padding:40px 20px;margin-top:20px;border:1px dashed var(--mb-ink);">' +
                  '<p class="mb-body">No awardees match your search criteria. Try adjusting your filters.</p>' +
                '</div>';
            return;
          }
          statusEl.style.display = "none";
          gridEl.innerHTML = sorted.map(renderAwardeeCard).join("");
        }

        searchEl.addEventListener("input", repaint);
        sortEl.addEventListener("change", repaint);
        repaint();
      })
      .catch(function (err) {
        // Non-fatal: degrade to an empty-state message and log.
        if (window.console && console.warn) console.warn("awardees hydration:", err);
        statusEl.innerHTML = '<p class="mb-body" style="text-align:center;">Awardees could not be loaded. Please refresh to try again.</p>';
      });
  }

  // Normalize a name for matching against LP card headings. Lowercase,
  // collapse whitespace, drop apostrophes — same shape as the legacy
  // /assets/lps/{slug}.png filename convention.
  function normalizeName(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Apply uploaded LP member photos to the static LP cards. lpPhotos is a
  // map keyed by user uid: { [uid]: { name, photoUrl } }, mirrored from
  // /users when a chapter director uploads a photo via the LP portal.
  // Cards on the static page identify themselves by the <h3> name, so we
  // build a name → photoUrl lookup and swap any matching <img src>.
  function applyLpPhotos(lpPhotos) {
    if (!lpPhotos || typeof lpPhotos !== "object") return;
    var byName = {};
    Object.keys(lpPhotos).forEach(function (uid) {
      var entry = lpPhotos[uid];
      if (entry && entry.name && entry.photoUrl) {
        byName[normalizeName(entry.name)] = entry.photoUrl;
      }
    });
    if (Object.keys(byName).length === 0) return;
    var cards = document.querySelectorAll(".win95-lp-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var heading = card.querySelector("h3");
      if (!heading) continue;
      var key = normalizeName(heading.textContent || "");
      var url = byName[key];
      if (!url) continue;
      var img = card.querySelector("img");
      // Skip-if-equal: re-setting an identical src kicks off a fresh fetch
      // in some browsers, which is exactly the flash we're trying to avoid.
      if (img && img.getAttribute("src") !== url) img.src = url;
    }
  }

  // Match ChapterPage.jsx's photoUrlFor(): /assets/lps/<slug>.png where
  // slug = lowercase name, spaces → hyphens, curly/backtick apostrophes
  // normalized to straight (filenames preserve the ' — see susan-o'rourke.png).
  function lpFallbackPhotoUrl(name) {
    if (!name) return null;
    return "/assets/lps/" + name.toLowerCase().replace(/\s+/g, "-").replace(/[‘’`]/g, "'") + ".png";
  }

  // Render a single LP card from a normalized item:
  //   { name, effectiveRole, professionalRole, bio, linkedinUrl, photoUrl }
  // photoUrl may be null — we fall back to the legacy /assets/lps/<slug>.png
  // filename, then on 404 the inline onerror swaps in a placeholder div so
  // the card layout doesn't collapse.
  function renderLpCardHtml(item) {
    var directorTag = item.effectiveRole === 'chapter_director'
      ? '<span class="win95-lp-director-tag">Chapter Director</span>'
      : '';
    var photoSrc = item.photoUrl || lpFallbackPhotoUrl(item.name);
    var alt = (item.name || '') +
              (item.professionalRole ? ' - ' + item.professionalRole : '') +
              ' - Good Neighbor Fund Limited Partner';
    var placeholder = '<div class="win95-lp-photo-placeholder" aria-hidden="true"></div>';
    var imgFallback = "var p=document.createElement('div');" +
                      "p.className='win95-lp-photo-placeholder';" +
                      "p.setAttribute('aria-hidden','true');" +
                      "this.replaceWith(p);";
    var img = photoSrc
      ? '<img src="' + escapeHtml(photoSrc) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async"' +
          ' onerror="' + imgFallback + '" />'
      : placeholder;
    var nameHtml = item.linkedinUrl
      ? '<a href="' + escapeHtml(item.linkedinUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(item.name || '') + '</a>'
      : escapeHtml(item.name || '');
    var proRole = item.professionalRole ? '<p class="win95-lp-role">' + escapeHtml(item.professionalRole) + '</p>' : '';
    var bio = item.bio ? '<p class="win95-lp-bio">' + escapeHtml(item.bio) + '</p>' : '';
    return '<div class="win95-lp-card">' + directorTag + img + '<h3>' + nameHtml + '</h3>' + proRole + bio + '</div>';
  }

  // Skip-if-equal: if the grid already shows the same names in the same
  // order as the snapshot, leave the DOM alone. Avoids a layout-shifting
  // innerHTML rewrite when the static HTML happens to be in sync (rare for
  // the LP grid today, but cheap insurance against re-renders flickering).
  function gridMatchesItems(grid, items) {
    var headings = grid.querySelectorAll(".win95-lp-card h3");
    if (headings.length !== items.length) return false;
    for (var i = 0; i < items.length; i++) {
      if (normalizeText(headings[i].textContent) !== normalizeText(items[i].name || '')) return false;
    }
    return true;
  }

  function renderLpFromSnapshot(snap) {
    if (!snap || !Array.isArray(snap.lps) || snap.lps.length === 0) return false;
    var grid = document.querySelector('[data-chapter-section="lps"] .win95-lp-grid');
    if (!grid) return false;
    if (gridMatchesItems(grid, snap.lps)) return true;
    grid.innerHTML = snap.lps.map(renderLpCardHtml).join("");
    return true;
  }

  // Wire up the fast path: as soon as the snapshot arrives, render. Sets a
  // flag the chapter doc handler reads to decide whether to also run the
  // Firestore roster path. We don't wait on the chapter doc here — the
  // snapshot has everything the LP grid needs.
  lpSnapshotPromise.then(function (snap) {
    if (renderLpFromSnapshot(snap)) lpSnapshotRendered = true;
  });

  // Render LP cards from Firestore, replacing any hardcoded grid contents.
  // Firestore is the source of truth: if the query returns a non-empty
  // roster we overwrite the grid so what admins see in the portal is what
  // visitors see here. An empty result or error leaves the hardcoded cards
  // untouched as a resilience fallback (handled at the bottom of this fn).
  // Pulls users scoped to this chapter whose role is lp/chapter_director,
  // plus superAdmins who have opted in via chapterRole. Effective display
  // role = chapterRole || role for superAdmins.
  function renderLpRoster(chapterName) {
    var grid = document.querySelector('[data-chapter-section="lps"] .win95-lp-grid');
    if (!grid) return Promise.resolve();
    if (!chapterName) return Promise.resolve();

    var primary = db.collection("users")
      .where("chapter", "==", chapterName)
      .where("role", "in", ["lp", "chapter_director"])
      .get();
    var adminListed = db.collection("users")
      .where("chapter", "==", chapterName)
      .where("role", "==", "superAdmin")
      .where("chapterRole", "in", ["lp", "chapter_director"])
      .get()
      .catch(function () { return { docs: [] }; });

    return Promise.all([primary, adminListed]).then(function (snaps) {
      var byId = {};
      snaps.forEach(function (snap) {
        (snap.docs || []).forEach(function (d) {
          byId[d.id] = Object.assign({ id: d.id }, d.data());
        });
      });
      var list = Object.keys(byId).map(function (k) { return byId[k]; })
        .filter(function (u) { return u.active !== false; })
        .sort(function (a, b) {
          var roleFor = function (u) { return u.role === 'superAdmin' ? (u.chapterRole || u.role) : u.role; };
          var rank = function (u) { return roleFor(u) === 'chapter_director' ? 0 : 1; };
          var ra = rank(a), rb = rank(b);
          if (ra !== rb) return ra - rb;
          return (a.name || '').localeCompare(b.name || '');
        });
      if (list.length === 0) return;

      // Skip the rewrite when it'd produce the same DOM (the snapshot fast
      // path likely beat us here). Mirrors the snapshot path's guard.
      var normalized = list.map(function (u) {
        return {
          name: u.name || '',
          effectiveRole: u.role === 'superAdmin' ? (u.chapterRole || u.role) : u.role,
          professionalRole: u.professionalRole || null,
          bio: u.bio || null,
          linkedinUrl: u.linkedinUrl || null,
          // Legacy path: photoUrl gets layered in by applyLpPhotos after this
          // returns (caller still wires it up). Pass null here so the card
          // initially uses the static /assets/lps/<slug>.png and is then
          // overwritten in the rare case lpPhotos has an upload.
          photoUrl: null,
        };
      });
      if (gridMatchesItems(grid, normalized)) return;
      grid.innerHTML = normalized.map(renderLpCardHtml).join("");
    });
  }

  db.collection("chapters").doc(slug).get()
    .then(function (doc) {
      if (!doc.exists) return;
      var data = doc.data() || {};

      applyTextField("heroTitle", data.heroTitle);
      applyTextField("heroTagline", data.heroTagline);
      applyTextField("servingTitle", data.servingTitle);
      applyTextField("servingText", data.servingText);
      applyTextField("poweredByText", data.poweredByText);
      applyCounties(data.counties);
      applyHeroImage(data.heroImage, data.heroImageCaption);
      applyGallery(data.galleryPhotos);

      toggleSection("lps", data.showLPs);
      toggleSection("gallery", data.showGallery);
      // showImpact defaults to true — only an explicit `false` in the doc
      // hides the section, matching how showLPs/showGallery behave.
      var impactOn = data.showImpact !== false;
      toggleSection("impact", impactOn);
      // showAwardees is opt-in (defaults to hidden). The section starts
      // display:none in the HTML; only flip it visible when the flag is
      // true AND we have a chapter name to scope the query to.
      var awardeesOn = data.showAwardees === true && !!data.name;
      toggleSection("awardees", awardeesOn);

      // Update the "Our Impact Since YYYY" heading from the chapter doc
      // so chapters founded after 2023 reflect the right year.
      if (impactOn && typeof data.foundedYear === "number") {
        applyImpactYear(data.foundedYear);
      }

      // Snapshot fast path is the primary roster source — it has the same
      // membership + photo URL resolution baked in. We only fall through to
      // the Firestore queries here if the snapshot fetch failed (missing
      // file, network error). When the snapshot did render, applyLpPhotos
      // is also a no-op (photos are already in the snapshot) so we skip it.
      var rosterPromise = lpSnapshotPromise.then(function (snap) {
        if (snap && lpSnapshotRendered) return;
        return renderLpRoster(data.name).then(function () {
          applyLpPhotos(data.lpPhotos);
        });
      });
      var awardeesPromise = awardeesOn ? renderAwardeesGrid(data.name) : Promise.resolve();
      var impactPromise = impactOn ? renderImpactStats(data.name) : Promise.resolve();
      return Promise.all([rosterPromise, awardeesPromise, impactPromise]);
    })
    .catch(function (err) {
      // Non-fatal: defaults already rendered from static HTML.
      if (window.console && console.warn) console.warn("chapter hydration:", err);
    });
})();
