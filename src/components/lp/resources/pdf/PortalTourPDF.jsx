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

const DOC_TITLE = 'GNF Using the Portal';

export default function PortalTourPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Portal · 05"
        number="05"
        title="Using the Portal"
        summary="The map, the trophies, the share kit, Slack, and keeping your LP seat. A tour of everything in the portal beyond reviewing pitches."
        accent="butter"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          The portal is your neighborhood. Review Pitches is where the work
          happens. This guide covers everything else: the map, the
          trophies, the share kit, Slack, and keeping your LP seat for next
          year.
        </Text>

        <Text style={pdfStyles.h1First}>The Layout</Text>
        <Paragraph>
          Tabs live on the left sidebar. Your chapter and name sit at the
          top; Slack and renewal buttons sit at the bottom. The main panel
          changes based on which tab you're on. Works on desktop and
          mobile, though desktop is the intended experience.
        </Paragraph>

        <Text style={pdfStyles.h1}>Pitch Map</Text>
        <Paragraph>
          The Pitch Map tab plots every pitch from your chapter on a real
          map. A fun way to see the geographic story of your neighborhood:
          who's pitching from which block, where past winners landed,
          how wide the chapter's reach goes.
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Pin icons.</Text> Regular pitches.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Trophy icons.</Text> Past grant winners.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Filters.</Text> Search, narrow by quarter, or flip to Show Winners Only.</Bullet>
        <Bullet>Click a pin to open that pitch's details.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Trophy Case</Text>
        <Paragraph>
          The Trophy Case tab is where your badges live. Every badge you've
          unlocked sits front and center with the date you earned it;
          locked ones show below with a progress bar toward the next
          unlock. Closest thing to a scoreboard we've got.
        </Paragraph>

        <Text style={pdfStyles.h2}>How badges work</Text>
        <Bullet><Text style={pdfStyles.bold}>Earn them by participating.</Text> Reviewing pitches, leaving team notes, voting with the group, being consistent over time.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Progress tracks automatically.</Text> No claim buttons. The system just watches your activity.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Some are quiet.</Text> A few badges are easter eggs. We're not going to spoil them.</Bullet>

        <Callout label="When you earn one">
          A notification pops up right after the action that triggered it,
          usually a review submission. The new badge also appears in your
          Trophy Case immediately.
        </Callout>

        <Text style={pdfStyles.h1}>Chapter Members</Text>
        <Paragraph>
          The Chapter Members tab is a directory of everyone in your
          neighborhood, the people whose opinions your ratings sit
          alongside. Each card shows:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Name and role.</Text> Who they are and what they do day-to-day.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Member since.</Text> Month and year they joined, so you can tell a founding LP from last quarter's addition.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>LinkedIn.</Text> One click to their profile.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Recent badges.</Text> Their last five unlocked trophies.</Bullet>
        <Paragraph>
          It's also a friendly way to see how your Trophy Case stacks up
          against the rest of the chapter, and a reminder that the
          people you'll meet at the next dinner are already on your team.
        </Paragraph>

        <Text style={pdfStyles.h1}>Share Kit (Social Cards)</Text>
        <Paragraph>
          The Social tab has four pre-made cards you can download and post.
          Each is sized for Instagram / LinkedIn / X and pulls your name
          and chapter automatically:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Welcome to GNF.</Text> Introduce yourself to your new chapter.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Badge Achievements.</Text> Show off the trophies you've earned.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Chapter Impact.</Text> Your chapter's funded-business tally.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>LP Recruitment.</Text> Rally new LPs into the network.</Bullet>
        <Paragraph>
          Click Download on any card and a PNG saves to your device. The
          cards are the easiest way to help your chapter grow. One post
          after you join often surfaces two or three new prospective LPs.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Join Slack</Text>
        <Paragraph>
          At the bottom of the sidebar you'll find a Join Slack button. One
          click opens our shared workspace invite in a new tab. Every
          chapter has its own channel; there's a national channel for
          cross-chapter chatter and asking Chapter Directors for help. This
          is where the neighborhood actually hangs out between meetings.
        </Paragraph>

        <Text style={pdfStyles.h1}>LP Membership Renewal</Text>
        <Paragraph>
          Directly above the Slack button, under LP Membership, you'll see
          one or two renewal buttons depending on how your chapter sets
          things up:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Renew Annual.</Text> One payment, one year of membership. Most LPs pick this.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Renew Semi-Annual.</Text> A smaller payment every six months. Useful if your chapter prefers the lighter cadence.</Bullet>
        <Paragraph>
          Clicking either button opens Stripe in a new tab. Both plans
          auto-renew on the same cadence going forward, so once you're
          in, you stay in. No calendar reminder required. Stripe emails
          a receipt each time and gives you a link to update your card or
          cancel.
        </Paragraph>

        <Callout label="Prefer not to use Stripe?">
          Check, ACH, and wire are all welcome. They just don't live in
          the portal. Message your Chapter Director directly and they'll
          coordinate the payment and keep your membership active.
        </Callout>

        <Text style={pdfStyles.h1}>Sign-out &amp; Account</Text>
        <Paragraph>
          Your name at the top of the sidebar is your account area. Click
          it to sign out. Password resets and email changes are handled by
          your Chapter Director in the admin panel; just ping them in
          Slack.
        </Paragraph>

        <Callout label="Something feel broken?">
          Post in #help on the national Slack or email
          hello@goodneighbor.fund. Screenshots help us move faster.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
