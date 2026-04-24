// chapter-hydration.js
// Runs on the static chapter landing pages (public/<slug>.html). Reads the
// matching /chapters/<slug> Firestore doc and overrides editable fields
// (hero title, tagline, counties, powered-by text) + toggles the optional
// LP grid and community gallery sections based on the doc's flags.
//
// Fails silently — if Firestore is unreachable or the doc is missing, the
// hard-coded defaults in the HTML remain.
(function () {
  "use strict";

  var body = document.body;
  if (!body) return;
  var slug = body.getAttribute("data-chapter-slug");
  if (!slug) return;

  var firebaseConfig = {
    apiKey: "AIzaSyCL7wTtcIlMmAm8JQB2p4z9wVaCUrm5w1Q",
    authDomain: "www.goodneighbor.fund",
    projectId: "gnf-app-9d7e3",
    storageBucket: "gnf-app-9d7e3.appspot.com",
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

  function applyTextField(name, value) {
    if (value === undefined || value === null || value === "") return;
    var nodes = document.querySelectorAll('[data-chapter-field="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      // Preserve a leading <strong> lede (e.g. hero tagline) when the field
      // has one — the bold phrase is part of the brand voice and not
      // something the director is expected to re-type every edit.
      var lede = node.querySelector("strong[data-chapter-lede]");
      if (lede) {
        // Replace only the text that follows the lede.
        while (node.lastChild && node.lastChild !== lede) {
          node.removeChild(node.lastChild);
        }
        node.appendChild(document.createTextNode(" " + value));
      } else {
        node.textContent = value;
      }
    }
  }

  function applyCounties(counties) {
    if (!Array.isArray(counties) || counties.length === 0) return;
    var grid = document.querySelector('[data-chapter-field="counties"]');
    if (!grid) return;
    grid.innerHTML = counties
      .map(function (c) { return '<div class="win95-chip">' + escapeHtml(c) + "</div>"; })
      .join("");
  }

  // Swap the hero image and caption from Firestore when the chapter doc
  // provides them. The hardcoded values in the static HTML remain as a
  // fallback when these fields are absent (or when Firestore is unreachable).
  function applyHeroImage(url, caption) {
    var img = document.querySelector(".win95-hero-right img");
    if (img && url) {
      img.src = url;
      if (caption) img.alt = caption;
    }
    var capEl = document.querySelector(".win95-hero-caption");
    if (capEl && caption) capEl.textContent = caption;
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
    el.style.display = visible ? "" : "none";
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
      if (img) img.src = url;
    }
  }

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

      // Match ChapterPage.jsx's photoUrlFor(): /assets/lps/<slug>.png where
      // slug = lowercase name, spaces → hyphens, apostrophes dropped. Keeps
      // the production output identical to the local SPA; applyLpPhotos
      // (run after this) still layers uploaded photos on top when present.
      var photoUrlFor = function (name) {
        if (!name) return null;
        return "/assets/lps/" + name.toLowerCase().replace(/\s+/g, "-").replace(/['’`]/g, "") + ".png";
      };

      grid.innerHTML = list.map(function (u) {
        var effectiveRole = u.role === 'superAdmin' ? (u.chapterRole || u.role) : u.role;
        var directorTag = effectiveRole === 'chapter_director'
          ? '<span class="win95-lp-director-tag">Chapter Director</span>'
          : '';
        var photoSrc = photoUrlFor(u.name);
        var alt = (u.name || '') +
                  (u.professionalRole ? ' - ' + u.professionalRole : '') +
                  ' - Good Neighbor Fund Limited Partner';
        var img = photoSrc
          ? '<img src="' + escapeHtml(photoSrc) + '" alt="' + escapeHtml(alt) + '" onerror="this.style.display=\'none\'" />'
          : '';
        var nameHtml = u.linkedinUrl
          ? '<a href="' + escapeHtml(u.linkedinUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(u.name || '') + '</a>'
          : escapeHtml(u.name || '');
        var proRole = u.professionalRole ? '<p class="win95-lp-role">' + escapeHtml(u.professionalRole) + '</p>' : '';
        var bio = u.bio ? '<p class="win95-lp-bio">' + escapeHtml(u.bio) + '</p>' : '';
        return '<div class="win95-lp-card">' + directorTag + img + '<h3>' + nameHtml + '</h3>' + proRole + bio + '</div>';
      }).join("");
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

      // Firestore is the source of truth for the LP roster — render first,
      // then let applyLpPhotos layer any chapter-director-uploaded custom
      // photos on top of the resulting cards.
      return renderLpRoster(data.name).then(function () {
        applyLpPhotos(data.lpPhotos);
      });
    })
    .catch(function (err) {
      // Non-fatal: defaults already rendered from static HTML.
      if (window.console && console.warn) console.warn("chapter hydration:", err);
    });
})();
