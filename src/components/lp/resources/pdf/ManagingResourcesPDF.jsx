import React from 'react';
import { Document, Page, Text } from '@react-pdf/renderer';
import {
  pdfStyles,
  CoverPage,
  PageFooter,
  Bullet,
  Callout,
  Paragraph,
} from './PDFTheme';

const DOC_TITLE = 'GNF Managing Chapter Resources';

export default function ManagingResourcesPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Admin · 08"
        number="08"
        title="Managing Chapter Resources"
        summary="Adding, editing, and bulk-importing the funding orgs, incubators, and community resources your chapter points founders toward."
        accent="tangerine"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          The Resources tab is the index a founder lands on when they
          ask the AI Concierge "where do I start?" What you put in
          here is what gets surfaced. The cleaner and tighter the
          entries, the more useful the matches.
        </Text>

        <Text style={pdfStyles.h1First}>The Two Ways to Add Resources</Text>
        <Paragraph>
          Most chapters use both. <Text style={pdfStyles.bold}>Add Resource</Text>{' '}
          is best when you're capturing a single new org you just
          learned about. <Text style={pdfStyles.bold}>Upload CSV</Text>{' '}
          is best when you're seeding a new chapter or doing a
          quarterly cleanup pass on twenty rows at once. Same data
          model, same Firestore collection — pick the one that
          matches the shape of your work.
        </Paragraph>

        <Callout label="You only see your chapter">
          The Chapter column is pinned to your chapter — you can't
          accidentally edit Denver's resources from the WNY portal,
          and uploads ignore any other chapter named in a CSV. Super
          admins can move between chapters freely.
        </Callout>

        <Text style={pdfStyles.h1}>Adding One Resource at a Time</Text>
        <Paragraph>
          Click + Add Resource. The form opens with three sections:
          Basics, Focus &amp; Reach, and Details. Three fields are
          required — Resource Name, Type, and Business Stage — and
          the rest sharpen the match.
        </Paragraph>

        <Text style={pdfStyles.h2}>Resource Name</Text>
        <Paragraph>
          2-80 characters. Use the name a founder would Google.
          "43North Accelerator," not "43N." If the program is part
          of a parent org, lead with the program: "Buffalo Urban
          League — Start Up Together," not "Buffalo Urban League."
          That's how the cards render and how the search ranks.
        </Paragraph>

        <Text style={pdfStyles.h2}>Type</Text>
        <Paragraph>
          Pick from the dropdown — Funding, Incubator/Accelerator,
          Mentorship, Community, and so on. Don't invent new types
          in the CSV; the Concierge keys off this field to color-code
          cards and the AI uses it as a high-signal filter. If the
          type you need genuinely doesn't exist, message a super
          admin instead of forcing a square peg.
        </Paragraph>

        <Text style={pdfStyles.h2}>Business Stage</Text>
        <Paragraph>
          Ideation, Early, Growth, Established, or All.{' '}
          <Text style={pdfStyles.bold}>Use "All" sparingly</Text> — it
          means the resource genuinely serves every stage, which is
          rare. A general-purpose coworking space is "All." A
          pre-seed accelerator is "Early." When in doubt, pick the
          narrowest stage that's accurate, because "All" entries
          surface in every search and dilute results.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h2}>Focus Area</Text>
        <Paragraph>
          Optional but recommended. A short phrase, max 80 chars:
          "Tech startups," "Minority-led small business,"
          "Health/Medtech." This is the line that appears under the
          resource name on cards, so write it like a tag, not a
          sentence.
        </Paragraph>

        <Text style={pdfStyles.h2}>Counties Served</Text>
        <Paragraph>
          Comma-separated list, or "All 8 counties," or "Global" for
          anything that doesn't care about geography. Helps founders
          understand whether they're eligible before they click
          through.
        </Paragraph>

        <Text style={pdfStyles.h2}>Average Check Size</Text>
        <Paragraph>
          Free-form. "$50K-$250K," "$1M," or "NA" if money isn't the
          product. Founders looking at capital sources scan this
          column first.
        </Paragraph>

        <Text style={pdfStyles.h2}>Relocation Required?</Text>
        <Paragraph>
          Yes or No. Most resources don't require it; the ones that
          do (43North is the canonical example) need to flag it
          loudly so a Buffalo founder doesn't apply to a program that
          wants them in another city.
        </Paragraph>

        <Text style={pdfStyles.h2}>URL</Text>
        <Paragraph>
          Full URL with the https:// prefix. Cards render a "Visit"
          link that opens this in a new tab.
        </Paragraph>

        <Text style={pdfStyles.h2}>Expanded Details</Text>
        <Paragraph>
          This is the field that makes the AI Concierge useful or
          useless. <Text style={pdfStyles.bold}>1-3 sentences. ~200-500 characters hits the sweet spot.</Text>{' '}
          Tell a founder what they actually get, who it's for, and
          what makes it different from the next resource in the same
          category.
        </Paragraph>
        <Paragraph>
          The form shows a live character count. Aqua means you're
          in the sweet spot. The hard cap is 800 characters —
          anything longer and you're writing copy, not a description.
        </Paragraph>

        <Callout label="Avoid marketing language">
          "Innovative," "cutting-edge," "world-class." The Concierge
          will down-rank vague descriptions because they don't help
          it match. Write it the way you'd describe the resource to
          a friend over coffee.
        </Callout>

        <Text style={pdfStyles.h2}>A good Expanded Details example</Text>
        <Paragraph>
          "Annual competition awarding $1M each to 5 startups.
          Companies relocate to Buffalo for 12 months and receive a
          year of free workspace, mentorship, and access to a
          network of investors. Best fit for traction-stage tech
          founders comfortable moving operations."
        </Paragraph>
        <Paragraph>
          47 words, 280 characters. It tells a founder what they
          get, what's required, and who it's for. The Concierge will
          match it precisely because the language is concrete.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Bulk Import via CSV</Text>
        <Paragraph>
          Use this when you're seeding a new chapter, importing a
          list from a spreadsheet, or running a cleanup pass on a
          dozen rows. Two-step flow: download a template, edit it,
          upload.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 1 — Download the template</Text>
        <Paragraph>
          Click Download Template. The CSV that lands in your
          downloads folder has three things:
        </Paragraph>
        <Bullet>A row of column headers (don't change these names).</Bullet>
        <Bullet>Five comment rows starting with # with the allowed values for Type, Business Stage, and length guidance for Expanded Details.</Bullet>
        <Bullet>Two example rows with realistic data, already pinned to your chapter.</Bullet>
        <Paragraph>
          Open it in Google Sheets, Numbers, or Excel. Use the
          example rows as a model, then delete them (and the comment
          rows) before uploading. Anything that starts with # is
          ignored on parse, so leaving them in won't break the
          import — but it's cleaner to delete them.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 2 — Fill in your rows</Text>
        <Paragraph>
          Required columns: Resource, Type, Business Stage. The
          Chapter column is filled automatically with your chapter
          name on import (you can leave it blank or wrong — it'll be
          overwritten). Everything else is optional but, again, the
          more you fill in the better the AI Concierge gets.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 3 — Upload</Text>
        <Paragraph>
          Click Upload CSV, pick the file. The portal parses it on
          the spot and shows a preview panel with two columns of
          information:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Valid rows</Text> — these will write to Firestore on commit. Each one shows the resource name, type, stage, chapter, and focus area.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Skipped rows</Text> — these failed validation. Each one tells you why ("Type 'Coffee' not in allowed list," "Resource Name missing," "URL must start with http:// or https://").</Bullet>
        <Paragraph>
          Nothing has been written yet. Read the skipped rows, fix
          them in your spreadsheet, and re-upload. Or click Cancel
          and start over.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 4 — Commit</Text>
        <Paragraph>
          Click Import N resources at the top of the preview. The
          portal writes everything in batches of 400 (a Firestore
          limit) and refreshes the table. New resources are live to
          the AI Concierge and chapter pages within a minute.
        </Paragraph>

        <Callout label="Validation rules">
          A row is skipped if Resource, Type, or Business Stage is
          missing; if Type isn't in the allowed list; if Business
          Stage isn't one of the five values; if URL doesn't start
          with http:// or https://; or if any field exceeds its
          length cap (Expanded Details: 800 chars). Everything else
          is permissive.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Editing &amp; Deleting</Text>
        <Paragraph>
          Each row in the table has Edit and Delete buttons in the
          Actions column. Edit opens the same form you used to
          create the resource, pre-filled. Delete asks once and then
          removes the resource immediately — it disappears from the
          AI Concierge and chapter pages on the next page load.
          There's no soft-delete and no undo.
        </Paragraph>

        <Text style={pdfStyles.h1}>Filters</Text>
        <Paragraph>
          The toolbar above the table has search, chapter (super
          admins only), type, and stage filters. They stack —
          searching "buffalo" with stage "Early" returns rows that
          match both. Use these to find the resource you want to
          edit, not to scroll the whole list.
        </Paragraph>

        <Text style={pdfStyles.h1}>What Happens When You Save</Text>
        <Paragraph>
          Resources are written to the /resources Firestore
          collection. From there:
        </Paragraph>
        <Bullet>The chapter page (e.g., /wny) reads them on render and lists them by type.</Bullet>
        <Bullet>The AI Concierge on /resources queries the full collection, filters by chapter and stage, and ranks the rest with Haiku.</Bullet>
        <Bullet>Static chapter HTML pages get the data via the chapter-hydration script — propagation is near-instant for the AI Concierge, ~5 minutes for the static pages (cache).</Bullet>

        <Text style={pdfStyles.h1}>Routine Maintenance</Text>
        <Paragraph>
          A reasonable cadence for a chapter director:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Quarterly</Text> — review the full list. Anything that's gone defunct? Anything new in town that should be here? Ten minutes, on the same calendar slot every quarter.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Annually</Text> — re-read the Expanded Details on every entry. Programs change focus, check sizes shift, application windows move. Stale copy is worse than no copy.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>As needed</Text> — when an LP introduces you to an org you didn't know about, add it that day. Don't batch.</Bullet>

        <Callout label="The point of all of this">
          A founder lands on the AI Concierge, types their zip,
          picks "Capital" and "Mentors," and gets a six-resource
          shortlist with a one-line "here's why" for each. That
          experience is only as good as the data behind it. Your
          quarterly ten minutes here is the highest-leverage admin
          work in the portal.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
