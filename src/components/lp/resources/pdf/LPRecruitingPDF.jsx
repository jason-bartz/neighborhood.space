import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  pdfStyles,
  PDF_COLORS,
  CoverPage,
  PageFooter,
  Bullet,
  Callout,
  Paragraph,
} from './PDFTheme';

const DOC_TITLE = 'GNF LP Recruiting';

const templateStyle = {
  borderWidth: 1,
  borderColor: PDF_COLORS.ink,
  backgroundColor: PDF_COLORS.paper,
  padding: 14,
  marginVertical: 10,
};

export default function LPRecruitingPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Growth · 03"
        number="03"
        title="Recruiting Limited Partners"
        summary="How to talk about GNF, who to invite, and how to turn a casual coffee into a founding LP commitment."
        accent="aqua"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          A chapter lives or dies by its LPs. This is how you talk about
          GNF, who you should invite, and how to turn "sounds cool" into a
          signed check.
        </Text>

        <Text style={pdfStyles.h1First}>Why LPs Say Yes</Text>
        <Paragraph>
          LPs don't join for ROI — there isn't one. They join for a
          feeling: that they're doing something unambiguously good, that
          they're connected to the most interesting people in town, and
          that the money actually reaches a founder who needed it. Lead
          with that.
        </Paragraph>

        <Callout label="The One-Liner">
          "It's $500 a year. We pool it with 8–10 neighbors, give $1,000
          grants to local founders we pick together, and it's the most fun
          quarterly meeting on your calendar."
        </Callout>

        <Text style={pdfStyles.h1}>Who to Invite</Text>
        <Paragraph>
          Target people who are already doing the thing — not people
          looking for an excuse to be seen.
        </Paragraph>

        <Text style={pdfStyles.h2}>Good fits</Text>
        <Bullet><Text style={pdfStyles.bold}>Past or present entrepreneurs.</Text> They know how much $1,000 meant at the beginning.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Active community builders.</Text> Chambers of commerce, incubator staff, local org leaders.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Creatives with networks.</Text> Designers, photographers, writers who know every founder in town.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Operators at growth-stage companies.</Text> Directors, VPs, founder-adjacent folks with $500 to spend.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Retired founders / angels.</Text> They've done the real thing; this is pure joy for them.</Bullet>

        <Text style={pdfStyles.h2}>Avoid</Text>
        <Bullet>Career networkers who want a title, not a role.</Bullet>
        <Bullet>Anyone pitching you their own thing within the first 10 minutes.</Bullet>
        <Bullet>Disengaged funders looking for another logo on their LinkedIn.</Bullet>
        <Bullet>Folks who'd be uncomfortable in a dive bar with a pitch deck on a TV.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>The Outreach Playbook</Text>

        <Text style={pdfStyles.h2}>Step 1 — Start with 10 warm asks</Text>
        <Paragraph>
          Your first LPs should be people you'd text about dinner, not
          people you cold-DM on LinkedIn. Make a list of 20 and aim to
          close 10.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 2 — Coffee, not pitch deck</Text>
        <Paragraph>
          Meet in person if you can. 20 minutes. Tell them the story: why
          GNF exists, why you're starting a chapter, why they specifically
          came to mind.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 3 — Name the ask clearly</Text>
        <Paragraph>
          "I'd love to have you as a founding LP. It's $500 a year, four
          meetings, and you get to give away $4,000 in grants to founders
          you pick. Want in?" Clear beats clever.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 4 — Send the one-pager within 24 hours</Text>
        <Paragraph>
          Attach the Chapter Handbook PDF and a link to the chapter
          landing page. One email, two links, a payment link when they're
          ready.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 5 — Close fast</Text>
        <Paragraph>
          Momentum matters. If someone says yes, get them paid and in the
          Slack channel within a week. Waiting turns a casual yes into a
          polite no.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Common Objections</Text>

        <Text style={pdfStyles.h2}>"I don't really know enough about startups."</Text>
        <Paragraph>
          Perfect. LPs aren't supposed to be investors — they're supposed
          to be neighbors. You rate pitches on gut, kindness, and local
          knowledge, not term sheets.
        </Paragraph>

        <Text style={pdfStyles.h2}>"Is this tax-deductible?"</Text>
        <Paragraph>
          No. GNF isn't a nonprofit or a fund. Think of it like buying a
          round for a friend who's starting something — it's a gift, not
          an investment.
        </Paragraph>

        <Text style={pdfStyles.h2}>"Why only $500? Why not more?"</Text>
        <Paragraph>
          $500 keeps the door wide open. We want LPs from every income
          level — the point is community, not capital.
        </Paragraph>

        <Text style={pdfStyles.h2}>"I'm too busy."</Text>
        <Paragraph>
          One hour a month of async pitch review. Four in-person meetings
          a year, two-hour minimum. That's it.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Email Templates</Text>

        <Text style={pdfStyles.h2}>First outreach</Text>
        <View style={templateStyle}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 10, marginBottom: 6 }}>
            Subject: A weird little thing I'm starting in [city]
          </Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
            Hey [name] —{'\n\n'}
            I'm starting a local chapter of Good Neighbor Fund — it's a
            community group of ~10 people who pool $500/year and give out
            $1,000 grants to early-stage founders every quarter. No
            equity, no paperwork, just belief capital for people taking
            their first swing.{'\n\n'}
            You came to mind because [specific reason]. I'd love to tell
            you more over coffee. 20 minutes, on me. This Thursday or
            next?{'\n\n'}
            [signature]
          </Text>
        </View>

        <Text style={pdfStyles.h2}>Follow-up after coffee</Text>
        <View style={templateStyle}>
          <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 10, marginBottom: 6 }}>
            Subject: Official ask — GNF [city]
          </Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
            [name] —{'\n\n'}
            Great catching up yesterday. As promised, the Chapter Handbook
            is attached and the chapter page is live at [link].{'\n\n'}
            Formal ask: would you come on as a founding LP? $500 for the
            first year, four meetings, ~1 hour/month of pitch review.
            Payment link: [link]. If you're in, reply here and I'll send
            you the Slack invite and first meeting date.{'\n\n'}
            No pressure either way — and thanks for hearing me out.{'\n\n'}
            [signature]
          </Text>
        </View>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Retention — Keeping LPs for Year Two</Text>
        <Paragraph>
          Year one is exciting. Year two is the cliff. Here's what keeps
          people around:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>In-person meetings that feel like a dinner party.</Text> Not a Zoom call. Not a conference room.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Shoutouts.</Text> Name each LP publicly when you announce grantees.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Grantee updates.</Text> Six months after the grant, share what the founder did with it.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Make renewal stupid easy.</Text> One-click Stripe, email in January, done.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Ask them to bring a friend.</Text> The best LPs recruit the next LPs.</Bullet>

        <Callout label="Stuck?">
          If recruiting stalls, ping the national Slack. Other Chapter
          Directors have been through the same wall — you don't have to
          figure this out alone.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
