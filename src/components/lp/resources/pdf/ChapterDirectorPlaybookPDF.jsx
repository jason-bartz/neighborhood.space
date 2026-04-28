import React from 'react';
import { Document, Page, Text } from '@react-pdf/renderer';
import {
  pdfStyles,
  CoverPage,
  PageFooter,
  Bullet,
  Numbered,
  Callout,
  Paragraph,
} from './PDFTheme';

const DOC_TITLE = 'GNF Chapter Director Playbook';

export default function ChapterDirectorPlaybookPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Admin · 06"
        number="06"
        title="Chapter Director Playbook"
        summary="Every tool the portal hands Chapter Directors. Inviting LPs, running the review, assigning winners, publishing them live, and the rhythm to use them."
        accent="grape"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          Running a chapter is mostly about keeping momentum. This is your
          admin tour. Every tool the portal hands Chapter Directors and
          the rhythm for using them.
        </Text>

        <Text style={pdfStyles.h1First}>What a Chapter Director Sees</Text>
        <Paragraph>
          When your account has the chapter_director role, the sidebar
          unlocks an Admin section. Everything inside is chapter-scoped to
          you automatically. You can't accidentally edit another chapter's
          data. SuperAdmins see the same tools across all chapters.
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Reviews.</Text> The group view of every LP's ratings.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Grant Winners.</Text> Mark winners, fill in their public info.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Users.</Text> Manage your chapter's LPs.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Create User.</Text> Invite new LPs.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Chapter.</Text> Edit your chapter's page content.</Bullet>

        <Text style={pdfStyles.h1}>Inviting New LPs</Text>
        <Paragraph>
          Head to the Create User tab. Fill in the form (email, full name,
          role, usually LP, and join date) and submit. The portal sends a
          magic-link invite email; the new LP clicks it, sets a password,
          and lands in the portal with your chapter already assigned.
        </Paragraph>

        <Callout label="Payment and access">
          The invite itself is free to send. LPs typically pay via the
          Stripe renewal link (annual or semi-annual) either just before or
          just after you create their account, whichever's cleanest for
          them. If someone goes quiet after the invite, a Slack DM is
          usually all it takes.
        </Callout>

        <Text style={pdfStyles.h2}>Who to make a second Chapter Director</Text>
        <Paragraph>
          Most chapters eventually add a co-director. Pick someone who (a)
          shows up, (b) is comfortable running a meeting, and (c) would
          happily take over if you needed a month off. Promote them by
          editing their user and changing role to Chapter Director.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>The Quarterly Meeting Is the Work</Text>
        <Paragraph>
          Your most important tool isn't in the portal. It's the
          quarterly meeting itself. In-person, around a table, with the
          Reviews tab up on a screen. That's where ratings become
          conversations, and conversations become winners.
        </Paragraph>
        <Paragraph>
          We strongly prefer in-person. Something about being in the same
          room changes how honestly people champion a pitch they love, or
          challenge one the group is ready to dismiss. Virtual works as a
          fallback when your LPs are spread across a metro, but it should
          be the exception.
        </Paragraph>

        <Text style={pdfStyles.h2}>Running the meeting from the Reviews tab</Text>
        <Paragraph>
          Open the Reviews tab in the admin panel, put it on a screen,
          and use it to drive the discussion:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Sort by weighted score</Text> to surface the pitches your chapter collectively loved.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Sort by average score</Text> for a different cut. Sometimes the top of this list surprises you.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Filter to Favorites only</Text> to set your initial finalist pool. Widen to Considerations if no clear winner emerges.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Read the team notes aloud.</Text> Each note is attributed to the LP who wrote it. Use that to draw them out if they haven't spoken up yet.</Bullet>
        <Paragraph>
          You're not there to rubber-stamp the top of the list. You're
          there to host a real discussion. The best meetings end with a
          winner nobody expected at the start. That's the group working
          as intended.
        </Paragraph>

        <Callout label="You see names here">
          On the regular Review Pitches tab, team notes are anonymized as
          "LP 1", "LP 2" for everyone, both LPs and Chapter Directors
          alike. In this admin Reviews tab they're attributed by name,
          which is part of why it's the right place to run the meeting
          from.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Scheduling the Meeting</Text>
        <Paragraph>
          A few small habits save you from the "nobody can make it"
          spiral:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Book the date a couple of weeks out.</Text> Far enough ahead that busy calendars have room; close enough that it stays on people's radar. More than a month out and you'll lose momentum.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Pick a real venue.</Text> A dinner at someone's house, the back room at a local spot, a co-working lounge after hours. Anywhere that feels like a dinner party, not a meeting.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Send a reminder one week before.</Text> Include the portal link so LPs can finish their reviews and arrive prepped.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Share the prep docs.</Text> The Reviewing Pitches guide in the Resources tab has an Export PDF button. Attach it to the reminder for any LP who wants a refresher.</Bullet>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Assigning Winners</Text>
        <Paragraph>
          Winners get picked at the quarterly meeting. The portal doesn't
          run the vote for you. Once the group has decided, here's how to
          make it official:
        </Paragraph>
        <Numbered n={1}>Go to the Grant Winners tab.</Numbered>
        <Numbered n={2}>Find the winning pitch and toggle the Winner flag on. The grantee is added to the tab marked Hidden — they're not yet visible on the public site.</Numbered>
        <Numbered n={3}>Fill in About (use Generate with AI for a draft, then edit), Website, and upload a Pitch Photo. Photos save to storage on upload; everything else saves when you click Save.</Numbered>
        <Numbered n={4}>Click Save All Changes.</Numbered>
        <Numbered n={5}>When you're ready to announce, flip the Live on website switch on the winner's card. The grantee appears on the public chapter page, the Founder Map, and the Neighborhood Navigator immediately.</Numbered>

        <Text style={pdfStyles.h2}>What "going live" actually means</Text>
        <Paragraph>
          Two flags govern visibility. isWinner marks the pitch as a grant
          recipient (used by your Statistics tab and internal totals).
          winnerPublished is the public switch — until you flip Live on
          website on, the grantee is hidden everywhere a member of the
          public would see them. New winners default to hidden so you can
          stage About, Website, and Photo without anything leaking before
          announcement day.
        </Paragraph>

        <Callout label="Announcement order matters">
          Tell the winner first (a call, ideally), then flip Live on
          website on, then post to Instagram / Slack / email. The public
          page updates the moment you flip the switch. Don't let a founder
          find out they won from a social post.
        </Callout>

        <Text style={pdfStyles.h2}>Un-publishing a winner</Text>
        <Paragraph>
          Flipping Live on website off hides the grantee again — useful if
          you spot a typo or need to delay an announcement. Toggling it
          doesn't affect their winner status, the award amount, or your
          internal stats; it only controls public visibility.
        </Paragraph>

        <Text style={pdfStyles.h2}>Editing a past winner</Text>
        <Paragraph>
          Returning to the Grant Winners tab later lets you update any
          winner's About, website, or photo. Useful when a grantee
          launches, rebrands, or sends better photography. Changes show up
          on the public chapter page instantly.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>User Management</Text>
        <Paragraph>
          The Users tab lists everyone in your chapter. From here you can:
        </Paragraph>
        <Bullet>Edit an LP's name, email, or role.</Bullet>
        <Bullet>Trigger a password reset email (the LP handles the rest).</Bullet>
        <Bullet>Deactivate a lapsed LP (or reactivate when they renew).</Bullet>
        <Paragraph>
          You cannot edit users outside your chapter. If an LP needs to
          move chapters (common when someone relocates), ping a SuperAdmin
          in the national Slack.
        </Paragraph>

        <Text style={pdfStyles.h1}>Editing Your Chapter Page</Text>
        <Paragraph>
          The Chapter tab lets you edit the copy and imagery on your
          public chapter page, the landing page prospective LPs and
          founders see before they apply. Use it to keep the meeting
          schedule fresh, swap the hero image seasonally, and update the
          LP roster.
        </Paragraph>
        <Paragraph>
          Note: some chapter pages (Denver, WNY, Central NY, Capital Region)
          are hand-built static HTML and are edited in code by GNF HQ, not
          through this tab. If you're unsure which you have, ask in the
          national Slack before assuming edits didn't save.
        </Paragraph>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>The Quarterly Rhythm</Text>
        <Paragraph>
          A chapter that runs on time is a chapter that stays alive. Loose
          template for each quarter:
        </Paragraph>
        <Bullet><Text style={pdfStyles.bold}>Weeks 1 to 3:</Text> promote the chapter, funnel applications.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Week 4:</Text> close applications. Post a deadline reminder in Slack.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Weeks 5 to 7:</Text> LPs review async. You nudge at week 6.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Week 8:</Text> quarterly meeting. The group reviews top finalists and votes on the winner.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Week 9:</Text> notify the winner, mark them in the Grant Winners tab, fill in their public info, then flip Live on website on and post everywhere.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Weeks 10 to 12:</Text> rest. Recruit one or two new LPs. Start the next cycle.</Bullet>

        <Text style={pdfStyles.h1}>Where to Get Help</Text>
        <Bullet><Text style={pdfStyles.bold}>hello@goodneighbor.fund</Text> for anything portal-related or sensitive.</Bullet>
        <Bullet>The Recruiting Limited Partners and New Chapter Handbook docs cover the non-admin side of the job.</Bullet>

        <Callout label="The heart of the role">
          The admin panel handles the paperwork. Your actual job is
          hosting. Setting the table, making the toast, welcoming a new
          LP, celebrating a grantee. You're not managing a process.
          You're building a neighborhood.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
