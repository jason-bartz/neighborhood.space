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

const DOC_TITLE = 'GNF Chapter Committees';

export default function ChapterCommitteesPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Admin · 07"
        number="07"
        title="Chapter Committees"
        summary="Optional scaffolding for a growing chapter. The committees other chapters have found useful, and how to run them on Slack."
        accent="aqua"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          Committees are optional scaffolding for a growing chapter. Once
          you have more than a handful of LPs, splitting the work into
          small standing groups keeps momentum up and pulls more people
          into ownership.
        </Text>

        <Text style={pdfStyles.h1First}>It's Your Call</Text>
        <Paragraph>
          Number, shape, and scope of committees is entirely at the
          Chapter Director's discretion. A chapter of six probably doesn't
          need a single one. A chapter of twenty usually wants three or
          four. Stand them up when the work calls for it. Don't create
          four empty committees on launch day and watch them gather dust.
        </Paragraph>
        <Paragraph>
          Treat this doc as inspiration, not a blueprint. The committees
          below are the ones other chapters have found useful. Steal the
          ones that fit, skip the ones that don't, and invent your own
          when your chapter needs something these don't cover.
        </Paragraph>

        <Text style={pdfStyles.h1}>Common Committees</Text>

        <Text style={pdfStyles.h2}>Selection Committee</Text>
        <Paragraph>
          A group of LPs dedicated to the actual review and selection of
          pitches: reading applications, scoring in the portal, and
          shaping the finalist list the full chapter votes on at the
          quarterly meeting. Useful when your application volume has
          grown past the point where every LP can read every pitch
          carefully.
        </Paragraph>

        <Text style={pdfStyles.h2}>Governance Committee</Text>
        <Paragraph>
          The group that handles leadership-type decisions: anything
          that doesn't cleanly fall under "pick a winner" or "throw an
          event." A few examples of what tends to land here:
        </Paragraph>
        <Bullet>Requests to sponsor other organizations' events.</Bullet>
        <Bullet>Approving unusual uses of funds, like replacement checks, stipends, or a bigger-than-usual event budget.</Bullet>
        <Bullet>Chapter-level policy questions and anything sensitive enough to want more than one set of eyes on.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h2}>Events Committee</Text>
        <Paragraph>
          Plans Good Neighbor Fun events. We highly encourage chapters to
          host them: on brand, on mission, and genuinely fun. Same
          committee usually handles co-hosting opportunities with aligned
          local orgs. If your chapter is looking for a low-stakes way to
          activate newer LPs, this is often the best on-ramp.
        </Paragraph>

        <Text style={pdfStyles.h2}>Founder Support Committee</Text>
        <Paragraph>
          The LPs who go out to meet the awardees. Present the check in
          person, sit down with the founder, hear their actual needs and
          goals, and bring that back to the rest of the chapter afterward.
          This is where the "neighbor" in Good Neighbor Fund gets real.
          The relationship with a grantee usually outlasts the grant.
        </Paragraph>

        <Callout label="Start with one">
          You don't have to launch all four at once. Most chapters start
          with whichever committee solves their most immediate bottleneck
          (usually Selection or Events) and add others as the chapter
          grows into them.
        </Callout>

        <Text style={pdfStyles.h1}>Running Committees on Slack</Text>
        <Paragraph>
          Use the national GNF Slack to spin up a dedicated channel per
          committee. Keeps conversation searchable, pulls the right
          people in, and leaves a paper trail the next committee lead can
          pick up.
        </Paragraph>

        <Text style={pdfStyles.h2}>Recommended channel naming</Text>
        <Paragraph>
          Prefix every channel with your chapter abbreviation so they're
          discoverable across the shared workspace. For Western New York
          (wny):
        </Paragraph>
        <Bullet>#wny-selection-committee</Bullet>
        <Bullet>#wny-governance-committee</Bullet>
        <Bullet>#wny-events-committee</Bullet>
        <Bullet>#wny-founder-support</Bullet>
        <Paragraph>
          Swap the prefix for yours: #denver-events-committee,
          #capital-region-selection-committee, and so on. Keep the suffix
          consistent across chapters so LPs moving between workspaces
          aren't relearning conventions.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Keep Committee Channels Private</Text>
        <Paragraph>
          All chapters share the same Slack workspace, so default every
          committee channel to private and invite only the LPs who need
          to be in it. A public channel here isn't public to your chapter.
          It's public to every chapter, and committee conversation
          (pitches mid-review, funding decisions, founder details) isn't
          meant for that audience. Private by default, add members
          explicitly, remove them when they rotate off.
        </Paragraph>

        <Text style={pdfStyles.h1}>Running a Committee Well</Text>
        <Bullet><Text style={pdfStyles.bold}>Give each committee a named lead.</Text> Someone owns the channel, calls the meeting, and brings decisions back to the full chapter.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Meet as often as the work requires.</Text> Not more. A dormant committee that meets anyway will kill enthusiasm faster than no committee at all.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Report up.</Text> Every committee should surface its decisions and open questions to the full chapter at the quarterly meeting. Otherwise you've just built silos.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Rotate membership.</Text> A year on a committee is plenty. Bringing fresh LPs in keeps the work from calcifying and gives newer LPs a clear path to leadership.</Bullet>

        <Callout label="The point of committees">
          Committees exist to give more LPs real ownership of the chapter,
          not to manufacture meetings. If a committee isn't making the
          chapter better, retire it. Tell its members they did good
          work. That's a healthy chapter, not a failed committee.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
