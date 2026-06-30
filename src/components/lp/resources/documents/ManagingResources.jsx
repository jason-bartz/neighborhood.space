import React from 'react';

export default function ManagingResources() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        The Resources tab is the index a founder lands on when they ask
        the AI Concierge "where do I start?" What you put in here is
        what gets surfaced. The cleaner and tighter the entries, the
        more useful the matches.
      </p>

      <h2>The Two Ways to Add Resources</h2>
      <p>
        Most chapters use both. <strong>Add Resource</strong> is best
        when you're capturing a single new org you just learned about.
        <strong> Upload CSV</strong> is best when you're seeding a new
        chapter or doing a quarterly cleanup pass on twenty rows at
        once. Same data model, same Firestore collection — pick the
        one that matches the shape of your work.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">You only see your chapter</p>
        <p style={{ margin: 0 }}>
          The Chapter column is pinned to your chapter — you can't
          accidentally edit Denver's resources from the WNY portal,
          and uploads ignore any other chapter named in a CSV. Super
          admins can move between chapters freely.
        </p>
      </div>

      <h2>Adding One Resource at a Time</h2>
      <p>
        Click <strong>+ Add Resource</strong>. The form opens with
        three sections: Basics, Focus &amp; Reach, and Details. Three
        fields are required — Resource Name, Type, and Business Stage
        — and the rest sharpen the match.
      </p>

      <h3>Resource Name</h3>
      <p>
        2-80 characters. Use the name a founder would Google. "43North
        Accelerator," not "43N." If the program is part of a parent
        org, lead with the program: "Buffalo Urban League — Start Up
        Together," not "Buffalo Urban League." That's how the cards
        render and how the search ranks.
      </p>

      <h3>Type</h3>
      <p>
        Pick from the dropdown — Funding, Incubator/Accelerator,
        Mentorship, Community, and so on. Don't invent new types in
        the CSV; the Concierge keys off this field to color-code
        cards and the AI uses it as a high-signal filter. If the type
        you need genuinely doesn't exist, message a super admin
        instead of forcing a square peg.
      </p>

      <h3>Business Stage</h3>
      <p>
        Ideation, Early, Growth, Established, or All. <strong>Use
        "All" sparingly</strong> — it means the resource genuinely
        serves every stage, which is rare. A general-purpose
        coworking space is "All." A pre-seed accelerator is "Early."
        When in doubt, pick the narrowest stage that's accurate,
        because "All" entries surface in every search and dilute
        results.
      </p>

      <h3>Focus Area</h3>
      <p>
        Optional but recommended. A short phrase, max 80 chars: "Tech
        startups," "Minority-led small business," "Health/Medtech."
        This is the line that appears under the resource name on
        cards, so write it like a tag, not a sentence.
      </p>

      <h3>Counties Served</h3>
      <p>
        Comma-separated list, or "All 8 counties," or "Global" for
        anything that doesn't care about geography. Helps founders
        understand whether they're eligible before they click through.
      </p>

      <h3>Average Check Size</h3>
      <p>
        Free-form. "$50K-$250K," "$1M," or "NA" if money isn't the
        product. Founders looking at capital sources scan this column
        first.
      </p>

      <h3>Relocation Required?</h3>
      <p>
        Yes or No. Most resources don't require it; the ones that do
        (43North is the canonical example) need to flag it loudly so
        a Buffalo founder doesn't apply to a program that wants them
        in another city.
      </p>

      <h3>URL</h3>
      <p>
        Full URL with the <code>https://</code> prefix. Cards render
        a "Visit" link that opens this in a new tab.
      </p>

      <h3>Expanded Details</h3>
      <p>
        This is the field that makes the AI Concierge useful or
        useless. <strong>1-3 sentences. ~200-500 characters hits the
        sweet spot.</strong> Tell a founder what they actually get,
        who it's for, and what makes it different from the next
        resource in the same category.
      </p>
      <p>
        The form shows a live character count. Aqua means you're in
        the sweet spot. The hard cap is 800 characters — anything
        longer and you're writing copy, not a description.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Avoid marketing language</p>
        <p style={{ margin: 0 }}>
          "Innovative," "cutting-edge," "world-class." The Concierge
          will down-rank vague descriptions because they don't help
          it match. Write it the way you'd describe the resource to
          a friend over coffee.
        </p>
      </div>

      <h3>A good Expanded Details example</h3>
      <p style={{
        background: 'var(--mb-paper)',
        border: '2px solid var(--mb-ink)',
        padding: '14px 18px',
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        lineHeight: 1.5,
      }}>
        "Annual competition awarding $1M each to 5 startups.
        Companies relocate to Buffalo for 12 months and receive a
        year of free workspace, mentorship, and access to a network
        of investors. Best fit for traction-stage tech founders
        comfortable moving operations."
      </p>
      <p>
        That's 47 words, 280 characters. It tells a founder what
        they get, what's required, and who it's for. The Concierge
        will match it precisely because the language is concrete.
      </p>

      <h2>Bulk Import via CSV</h2>
      <p>
        Use this when you're seeding a new chapter, importing a list
        from a spreadsheet, or running a cleanup pass on a dozen
        rows. Two-step flow: download a template, edit it, upload.
      </p>

      <h3>Step 1 — Download the template</h3>
      <p>
        Click <strong>Download Template</strong>. The CSV that lands
        in your downloads folder has three things:
      </p>
      <ul>
        <li>A row of column headers (don't change these names).</li>
        <li>Five comment rows starting with <code>#</code> with the allowed values for Type, Business Stage, and length guidance for Expanded Details.</li>
        <li>Two example rows with realistic data, already pinned to your chapter.</li>
      </ul>
      <p>
        Open it in Google Sheets, Numbers, or Excel. Use the example
        rows as a model, then delete them (and the comment rows)
        before uploading. Anything that starts with <code>#</code>
        is ignored on parse, so leaving them in won't break the
        import — but it's cleaner to delete them.
      </p>

      <h3>Step 2 — Fill in your rows</h3>
      <p>
        Required columns: <code>Resource</code>, <code>Type</code>,{' '}
        <code>Business Stage</code>. The Chapter column is filled
        automatically with your chapter name on import (you can leave
        it blank or wrong — it'll be overwritten). Everything else is
        optional but, again, the more you fill in the better the AI
        Concierge gets.
      </p>

      <h3>Step 3 — Upload</h3>
      <p>
        Click <strong>Upload CSV</strong>, pick the file. The portal
        parses it on the spot and shows a preview panel with two
        columns of information:
      </p>
      <ul>
        <li><strong>Valid rows</strong> — these will write to Firestore on commit. Each one shows the resource name, type, stage, chapter, and focus area.</li>
        <li><strong>Skipped rows</strong> — these failed validation. Each one tells you why ("Type 'Coffee' not in allowed list," "Resource Name missing," "URL must start with http:// or https://").</li>
      </ul>
      <p>
        Nothing has been written yet. Read the skipped rows, fix
        them in your spreadsheet, and re-upload. Or click{' '}
        <strong>Cancel</strong> and start over.
      </p>

      <h3>Step 4 — Commit</h3>
      <p>
        Click <strong>Import N resources</strong> at the top of the
        preview. The portal writes everything in batches of 400 (a
        Firestore limit) and refreshes the table. New resources are
        live to the AI Concierge and chapter pages within a minute.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Validation rules</p>
        <p style={{ margin: 0 }}>
          A row is skipped if Resource, Type, or Business Stage is
          missing; if Type isn't in the allowed list; if Business
          Stage isn't one of the five values; if URL doesn't start
          with http:// or https://; or if any field exceeds its
          length cap (Expanded Details: 800 chars). Everything else
          is permissive.
        </p>
      </div>

      <h2>Editing &amp; Deleting</h2>
      <p>
        Each row in the table has Edit and Delete buttons in the
        Actions column. Edit opens the same form you used to create
        the resource, pre-filled. Delete asks once and then removes
        the resource immediately — it disappears from the AI
        Concierge and chapter pages on the next page load. There's
        no soft-delete and no undo.
      </p>

      <h2>Filters</h2>
      <p>
        The toolbar above the table has search, chapter (super
        admins only), type, and stage filters. They stack — searching
        "buffalo" with stage "Early" returns rows that match both.
        Use these to find the resource you want to edit, not to
        scroll the whole list.
      </p>

      <h2>What Happens When You Save</h2>
      <p>
        Resources are written to the <code>/resources</code>{' '}
        Firestore collection. From there:
      </p>
      <ul>
        <li>The chapter page (e.g., <code>/wny</code>) reads them on render and lists them by type.</li>
        <li>The AI Concierge on <code>/resources</code> queries the full collection, filters by chapter and stage, and ranks the rest with Haiku.</li>
        <li>Static chapter HTML pages get the data via the chapter-hydration script — propagation is near-instant for the AI Concierge, ~5 minutes for the static pages (cache).</li>
      </ul>

      <h2>Routine Maintenance</h2>
      <p>
        A reasonable cadence for a chapter director:
      </p>
      <ul>
        <li><strong>Quarterly</strong> — review the full list. Anything that's gone defunct? Anything new in town that should be here? Ten minutes, on the same calendar slot every quarter.</li>
        <li><strong>Annually</strong> — re-read the Expanded Details on every entry. Programs change focus, check sizes shift, application windows move. Stale copy is worse than no copy.</li>
        <li><strong>As needed</strong> — when an LP introduces you to an org you didn't know about, add it that day. Don't batch.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">The point of all of this</p>
        <p style={{ margin: 0 }}>
          A founder lands on the AI Concierge, types their zip,
          picks "Capital" and "Mentors," and gets a six-resource
          shortlist with a one-line "here's why" for each. That
          experience is only as good as the data behind it. Your
          quarterly ten minutes here is the highest-leverage admin
          work in the portal.
        </p>
      </div>
    </>
  );
}
