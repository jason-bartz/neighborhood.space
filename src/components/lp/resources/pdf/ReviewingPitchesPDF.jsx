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

const DOC_TITLE = 'GNF Reviewing Pitches';

export default function ReviewingPitchesPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Review · 04"
        number="04"
        title="Reviewing Pitches"
        summary="How the Review tab works, what each button does, and how to think about scoring when a term sheet isn't the point."
        accent="tangerine"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          Rating pitches is the job. Here's how the Review tab works, what
          each button actually does, and how to think about scoring when a
          term sheet isn't the point.
        </Text>

        <Text style={pdfStyles.h1First}>Where Reviewing Lives</Text>
        <Paragraph>
          When you log into the portal, you land on the Review Pitches tab
          by default. Everything submitted to your chapter shows up as a
          card until you rate it. No queue-opening, no rounds. Pitches
          flow in continuously and you work through them on your own time.
        </Paragraph>

        <Text style={pdfStyles.h1}>Reading the Pitch Cards</Text>
        <Paragraph>
          Each pitch is a card with the business name, founder, submission
          date, chapter, quarter, and a short AI-generated overview of
          what the pitch is about. The overview is meant to help you
          triage the list, not to replace the application. Anything that
          catches your eye deserves a real read.
        </Paragraph>
        <Paragraph>
          The stripe on the left edge tells you your review status at a
          glance:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Magenta.</Text> You haven't reviewed it yet.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Gold.</Text> You marked it a Favorite.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Aqua.</Text> You gave it a Consideration.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Gray.</Text> You rated it a Pass or Ineligible.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Opening a Pitch</Text>
        <Paragraph>
          Click any card and you'll drop into the full application the
          founder submitted, with every question they answered in their own
          words. Two buttons sit at the top of the detail panel:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Watch Pitch Video.</Text> Opens the pitch video in a new tab.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Visit Website.</Text> Opens the applicant's website, if they gave us one.</Bullet>

        <Callout label="If the video won't play">
          Every so often an applicant uploads to Google Drive without
          flipping the share settings to "anyone with the link." You'll
          click Watch and hit a permission wall. Don't rate the pitch yet.
          Slack your Chapter Director so they can reach out and get the
          permissions fixed. We don't want a founder penalized because
          Drive defaults bit them.
        </Callout>

        <Text style={pdfStyles.h1}>Filtering the List</Text>
        <Paragraph>
          The filters along the top of the Review tab keep the queue
          manageable. A few patterns worth using:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Show only unreviewed.</Text> Use the Review status filter. Fastest way to work through a new batch without re-scrolling past pitches you've already rated.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Pick a single quarter.</Text> Useful before your quarterly meeting when you only want to see the cycle you're about to discuss.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Hide Passes.</Text> Flip this on after your first pass and the remaining view is your Favorites and Considerations.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Search.</Text> Quickest way to find a specific pitch when someone mentions it in Slack.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Submitting a Review</Text>
        <Paragraph>
          Click a pitch card and a detail view opens alongside a review
          form. The form has one required field and three optional ones.
        </Paragraph>

        <Callout label="The one thing you must pick">
          Overall LP Recommendation. One of four ratings. Everything else
          is gravy.
        </Callout>

        <Text style={pdfStyles.h2}>The four ratings</Text>
        <Bullet><Text style={pdfStyles.bold}>Favorite.</Text> You'd vote for this at the quarterly meeting. Save it for pitches you really believe in. A chapter that marks everything a Favorite tells us nothing.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Consideration.</Text> Worth discussing; not a front-runner. Most solid pitches land here.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Pass.</Text> Not the right fit this quarter.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Ineligible.</Text> The application doesn't meet our criteria: wrong geography, already well-funded, not early-stage.</Bullet>

        <Text style={pdfStyles.h2}>Optional signal</Text>
        <Bullet><Text style={pdfStyles.bold}>Video Clarity.</Text> Strong / Average / Poor. How well did the pitch video communicate the idea?</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Business Model Viability.</Text> Do the economics make sense on a napkin?</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Product Market Fit Evidence.</Text> Is there proof anyone wants this yet?</Bullet>

        <Text style={pdfStyles.h2}>Notes for the Team</Text>
        <Paragraph>
          The textarea below the ratings is where you leave context for
          everyone else: a tip about the founder's reputation, a local
          angle you noticed, a question worth asking at the meeting.
          Notes are shared only within your chapter and stay strictly
          internal. Founders never see them.
        </Paragraph>
        <Paragraph>
          When you read other LPs' notes, they appear anonymized as
          "LP 1", "LP 2", etc. The review view is intentionally low-ego
          so opinions land on their own merits. Your Chapter Director can
          see real names over in the admin Reviews tab when they're
          facilitating the meeting.
        </Paragraph>

        <Callout label="Flow tip">
          After you hit Submit Review, click Next Unreviewed to jump
          straight to the next pitch you haven't rated yet. Fastest way to
          clear the queue before a meeting.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Reviewing Isn't Deciding</Text>
        <Paragraph>
          The most important thing to remember: your rating isn't the
          final word. Reviews are prep for the quarterly meeting. That's
          where the group actually picks the winner. A pitch you marked
          Pass can easily end up winning once someone around the table
          makes the case for it, and a unanimous Favorite can lose to a
          dark horse a single LP champions hard.
        </Paragraph>
        <Paragraph>
          So rate honestly, but hold your opinions loosely. The job at
          this stage is to form a real point of view and earmark the
          pitches worth talking about, not to settle anything. Leave
          notes. Flag the founders you'd want to hear more about. Show
          up to the meeting ready to argue and ready to be persuaded.
        </Paragraph>

        <Text style={pdfStyles.h1}>How to Think About Scoring</Text>
        <Paragraph>
          You are not an investment committee. You're a local with taste
          and a stake in your city. That's the whole premise.
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Trust your gut.</Text> If the pitch makes you want to root for the founder, that counts.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Weight local knowledge heavily.</Text> You know who's already doing this, what your city needs, and which founders have real grit. That's signal an outsider doesn't have.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Founder over idea.</Text> The $1,000 goes to a person. Pick people you'd want to see win.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Don't optimize for "returns."</Text> There are none. Pick the founder whose life $1,000 meaningfully changes.</Bullet>

        <Text style={pdfStyles.h1}>Cadence</Text>
        <Paragraph>
          Plan on ~1 hour a month of async review. Most chapters see a
          dozen-ish pitches per quarter; working through them over a few
          sittings keeps it easy. Try to clear your queue before the
          quarterly meeting so the group discussion starts with opinions,
          not reading.
        </Paragraph>

        <Text style={pdfStyles.h1}>Badges Fire on Submit</Text>
        <Paragraph>
          When you hit Submit Review, the portal checks whether you've
          unlocked any new badges (first review, review streaks, kingmaker
          accuracy, etc.). If you did, a notification pops up and the
          badge lands in your Trophy Case. Details in the Using the Portal
          guide.
        </Paragraph>

        <Callout label="Not sure how to rate something?">
          Drop it in your chapter's Slack channel. Reviews aren't supposed
          to be lonely. That's what the meetings and the chat are for.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
