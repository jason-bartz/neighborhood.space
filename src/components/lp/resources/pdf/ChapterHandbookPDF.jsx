import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  pdfStyles,
  PDF_COLORS,
  CoverPage,
  PageFooter,
  Bullet,
  Numbered,
  Callout,
  Paragraph,
} from './PDFTheme';

const DOC_TITLE = 'GNF Chapter Handbook';

export default function ChapterHandbookPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Operations · 02"
        number="02"
        title="The Chapter Handbook"
        summary="Everything you need to launch a Good Neighbor Fund neighborhood. Mission, roles, timeline, operations, and the answers to common questions."
        accent="grape"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          Welcome. You're here because you're interested in launching a Good
          Neighbor Fund chapter, or as we call it, a Neighborhood. We're glad
          you found us.
        </Text>

        <Text style={pdfStyles.h1First}>Introduction</Text>
        <Paragraph>
          GNF started in Buffalo, NY, with a simple idea. Bold, early-stage
          entrepreneurs, especially those from underrepresented backgrounds,
          deserve belief, not the bureaucracy they typically encounter with
          early-stage business organizations. So we give out $1,000
          micro-grants (belief capital) to help founders take that first
          step.
        </Paragraph>
        <Paragraph>
          Since 2023, we've backed dozens of founders, built a grassroots
          LP community, and put together a replicable model that blends
          funding, mentorship, and local pride. Now we're opening up the
          playbook.
        </Paragraph>

        <Text style={pdfStyles.h1}>Our Mission</Text>
        <Paragraph>We level the playing field for entrepreneurship by:</Paragraph>
        <Bullet>Awarding no-strings-attached $1,000 micro-grants</Bullet>
        <Bullet>Supporting underrepresented and under-resourced founders</Bullet>
        <Bullet>Building local chapters powered by community-driven LPs</Bullet>
        <Paragraph>
          GNF is proudly national, proudly weird, and deeply committed to
          doing good in the neighborhoods we serve.
        </Paragraph>

        <Text style={pdfStyles.h1}>What's a GNF Neighborhood?</Text>
        <Paragraph>A GNF Neighborhood is a local group of Limited Partners (LPs) who:</Paragraph>
        <Bullet>Pool their money to fund quarterly $1,000 micro-grants</Bullet>
        <Bullet>Meet to review pitches and vote on winners</Bullet>
        <Bullet>Support local founders through connections, mentorship, and visibility</Bullet>
        <Paragraph>
          Each chapter is led by a Chapter Director, supported by GNF HQ,
          and connected to a national community of neighborhoods.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Starting a Chapter</Text>

        <Text style={pdfStyles.h2}>Step 1. Say Hi</Text>
        <Paragraph>
          Fill out our short new-chapter interest form at
          goodneighbor.fund/start-a-chapter.
        </Paragraph>

        <Text style={pdfStyles.h2}>Step 2. Recruit Your LPs</Text>
        <Paragraph>
          You'll need roughly 6 to 10 founding LPs. Typically, LPs are:
        </Paragraph>
        <Bullet>Founders, executives, creatives, or community leaders</Bullet>
        <Bullet>Actively involved in the local entrepreneurial ecosystem</Bullet>
        <Bullet>Excited to fund and support early-stage businesses</Bullet>
        <Paragraph>
          Each LP contributes $500/year, ideally upfront. Some chapters add
          a small margin to cover admin fees (e.g., $525/year).
        </Paragraph>

        <Callout label="Your Chapter, Your Numbers">
          The LP membership amount and the micro-grant amount issued is
          determined by your specific chapter's needs. We don't dictate
          that $1,000 must be the standard. We're always open to a
          conversation to help you determine the right fit for your area.
        </Callout>

        <Text style={pdfStyles.h2}>Step 3. Host Your First Meeting</Text>
        <Paragraph>Plan your inaugural LP meetup to:</Paragraph>
        <Bullet>Get to know each other</Bullet>
        <Bullet>Review early pitch submissions</Bullet>
        <Bullet>Select your first grantee (or plan when you'll open your first cycle)</Bullet>
        <Paragraph>
          Make it fun. Restaurants, cafes, rooftops, or breweries. Somewhere
          casual, inspiring, and local.
        </Paragraph>
        <Callout label="Best Practice">
          Use an online poll to align on dates, pick a restaurant, and be
          mindful of your LPs' dietary restrictions or alcohol preferences.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Y2K Energy</Text>
        <Paragraph>
          The aesthetic is on purpose. We're inspired by a time when
          people just started. The early internet era was raw, open, and
          full of possibility. That's how we want our founders to feel.
        </Paragraph>
        <Paragraph>
          More importantly: we back ideas before they're buttoned up. We
          fund courage, not polish.
        </Paragraph>

        <Text style={pdfStyles.h1}>How Chapters Operate</Text>
        <Text style={pdfStyles.h2}>Grant Timeline</Text>
        <Bullet>Most chapters operate quarterly; monthly or biannual is fine too.</Bullet>
        <Bullet>LPs vote on grant winners based on pitch applications and 60-second videos.</Bullet>
        <Bullet>The Chapter Director facilitates meetings and follows up with grantees.</Bullet>

        <Text style={pdfStyles.h2}>Grant Criteria: What we look for</Text>
        <Bullet>Passionate, ideation or early-stage founders</Bullet>
        <Bullet>Clear problem/solution articulation</Bullet>
        <Bullet>Specific, high-impact use of the $1,000 grant</Bullet>

        <Text style={pdfStyles.h2}>What we avoid</Text>
        <Bullet>Personal expenses (rent, bills)</Bullet>
        <Bullet>Established companies with significant revenue or funding</Bullet>
        <Bullet>One-off events or other charities</Bullet>
        <Bullet>Unclear deliverables</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>LP Responsibilities</Text>
        <Paragraph>Being an LP is light-lift, high-impact. LPs:</Paragraph>
        <Numbered n={1}><Text style={pdfStyles.bold}>Join quarterly meetings.</Text> Fun, social gatherings where we vote on winners.</Numbered>
        <Numbered n={2}><Text style={pdfStyles.bold}>Review pitches.</Text> Spend ~1 hour per month reading and rating applicants.</Numbered>
        <Numbered n={3}><Text style={pdfStyles.bold}>Pay $500/year.</Text> Directly funds our grants (may be increased slightly to cover chapter dues).</Numbered>
        <Numbered n={4}><Text style={pdfStyles.bold}>Engage on Slack.</Text> Stay active in our private channel and support founders.</Numbered>
        <Numbered n={5}><Text style={pdfStyles.bold}>Optional committees.</Text> Events, founder support, or social media, if desired.</Numbered>
        <Paragraph>
          LPs are not investors. GNF is not a fund. There is no ROI. Only
          impact, community, and belief.
        </Paragraph>

        <Text style={pdfStyles.h1}>Setting Up Your Chapter</Text>
        <Paragraph>We'll support you with:</Paragraph>
        <Bullet>A chapter landing page on goodneighbor.fund</Bullet>
        <Bullet>Access to our LP Portal (submission + review tool)</Bullet>
        <Bullet>A @goodneighbor.fund email address for the Chapter Director</Bullet>
        <Bullet>A private Slack community with a private chapter channel</Bullet>
        <Bullet>Canva graphics kit + social media starter copy and assets</Bullet>
        <Bullet>Knowledge base with event ideas, LP onboarding, and templates</Bullet>

        <Text style={pdfStyles.h2}>Optional support services</Text>
        <Bullet>Additional email address provisions</Bullet>
        <Bullet>Banking services. Online banking plus Stripe for recurring memberships</Bullet>
        <Bullet>Custom GNF Oxford Pennant ordering</Bullet>
        <Bullet>Custom GNF novelty check ordering</Bullet>

        <Callout label="Chapter Dues">
          $25/month or $275/year. Covers hosting, maintenance, email,
          platform tools, and more.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Running a Meeting</Text>
        <Bullet><Text style={pdfStyles.bold}>Pre-meeting.</Text> LPs review and rate pitches asynchronously.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>During meeting.</Text> Director facilitates; LPs share top picks, discuss, and vote.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Post-meeting.</Text> Director announces winner, coordinates disbursement, and shares publicly.</Bullet>
        <Callout label="In person when possible">
          Host in person when possible. Zoom is a suitable fallback if you're
          unable to align schedules.
        </Callout>

        <Text style={pdfStyles.h2}>How Pitches Are Ranked</Text>
        <Paragraph>
          Each LP gives a pitch one of four ratings. Behind the scenes,
          every rating carries a weight:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Favorite</Text> = +2</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Consideration</Text> = +1</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Pass</Text> = 0</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Ineligible</Text> = −2</Bullet>
        <Paragraph>
          When you sort pitches in the LP Portal, two numbers do the
          work. Total Score is the raw sum of those weights — it rewards
          volume of favorable reviews. Weighted Avg (the default sort,
          shown as "avg" on each card) is the smarter ranking, and it's
          the one we recommend leaning on.
        </Paragraph>
        <Paragraph>
          The Weighted Avg blends a pitch's actual rating average with
          the chapter-wide average, weighted by how many reviews it has.
          Pitches with lots of reviews stick close to their real average.
          Pitches with only one or two reviews get pulled toward the
          middle of the pack until more LPs weigh in. This stops a
          single five-star rave from outranking a pitch that's earned
          five Favorites and a Consideration, which would otherwise look
          worse on paper.
        </Paragraph>
        <Callout label="What you'll see">
          On the live review screen, each pitch shows three numbers:
          Score (the raw sum), Avg (the Weighted Avg used for sorting),
          and Raw (the unweighted average). Hover any of them for a quick
          refresher.
        </Callout>
        <Paragraph>
          Scores are a starting point for discussion, not a verdict.
          The meeting is still where the decision happens — the
          rankings just help you spend that hour on the pitches most
          worth talking about.
        </Paragraph>

        <Text style={pdfStyles.h1}>Events &amp; Promotion</Text>
        <Paragraph>Chapters are encouraged to:</Paragraph>
        <Bullet>Host local events (pitch nights, happy hours, hackathons, founder showcases)</Bullet>
        <Bullet>Launch chapter-specific socials (e.g., @gnf.austin)</Bullet>
        <Bullet>Partner with incubators, schools, and civic groups</Bullet>
        <Paragraph>We'll provide:</Paragraph>
        <Bullet>Logos, Canva templates, and language guidelines</Bullet>
        <Bullet>Sample posts and outreach copy</Bullet>
        <Bullet>A media kit for local press</Bullet>

        <Text style={pdfStyles.h1}>LP Criteria: For Directors Recruiting LPs</Text>
        <Paragraph>We suggest inviting people who are:</Paragraph>
        <Bullet>Past or present entrepreneurs</Bullet>
        <Bullet>Actively supporting the local business community</Bullet>
        <Bullet>Passionate about economic development or innovation</Bullet>
        <Bullet>Collaborative, humble, and engaged</Bullet>
        <Bullet>Open to mentoring or supporting grantees beyond the money</Bullet>
        <Callout label="Avoid">
          Self-promotion, ego plays, or disengaged funders.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>FAQs</Text>

        <Text style={pdfStyles.h2}>What if our LPs can't attend a meeting?</Text>
        <Paragraph>
          We recommend 2 out of 4 per year minimum. Remote voting is okay
          in a pinch.
        </Paragraph>

        <Text style={pdfStyles.h2}>Can I invest in GNF grantees personally?</Text>
        <Paragraph>
          Yes. GNF is not exclusive. Feel free to follow up outside of our
          platform if you want to support further.
        </Paragraph>

        <Text style={pdfStyles.h2}>How do we handle the money?</Text>
        <Paragraph>
          Up to you. Some chapters use a shared bank account. Others just
          Venmo. Or you can leverage our services. Choose what works.
        </Paragraph>

        <Text style={pdfStyles.h2}>Can I bring a guest to a meeting?</Text>
        <Paragraph>
          Absolutely. Some chapters allow guest LPs to vote, others just
          observe. Your call.
        </Paragraph>

        <Text style={pdfStyles.h1}>Ready to Launch?</Text>
        <Paragraph>
          We've got everything you need. Just submit your New Chapter
          Form. If accepted, we will:
        </Paragraph>
        <Bullet>Schedule an intro call</Bullet>
        <Bullet>Get you a starter kit + backend access</Bullet>
        <Bullet>Invite you to the national Slack channel</Bullet>
        <Paragraph>Let's bring belief capital to your block.</Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>From the Founders</Text>
        <Paragraph>
          Hey there. We're Susan and Jason, co-founders of Good Neighbor
          Fund.
        </Paragraph>
        <Paragraph>
          We launched GNF with a borrowed logo and $1,000 in belief. What
          we saw immediately was the hunger for this kind of support. For
          simple, accessible, joyful ways to help people start.
        </Paragraph>
        <Paragraph>
          Whether you start a chapter or just share this idea with a
          friend, you're a part of something that's growing bigger every
          day. Thanks for believing in others before the rest of the world
          catches on.
        </Paragraph>

        <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: PDF_COLORS.ink, paddingTop: 16 }}>
          <Text style={{ fontFamily: 'Instrument Serif', fontSize: 18, marginBottom: 4 }}>With love,</Text>
          <Text style={{ fontFamily: 'Instrument Serif', fontSize: 18 }}>Jason and Susan</Text>
          <Text style={{ fontSize: 10, color: PDF_COLORS.ink60, marginTop: 4 }}>
            Co-Founders, Good Neighbor Fund
          </Text>
        </View>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
