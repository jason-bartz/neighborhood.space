import React from 'react';

export default function ChapterDirectorPlaybook() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        Running a chapter is mostly about keeping momentum. This is your
        admin tour. Every tool the portal hands Chapter Directors and the
        rhythm for using them.
      </p>

      <h2>What a Chapter Director Sees That Others Don't</h2>
      <p>
        When your account has the <code>chapter_director</code> role, the
        sidebar unlocks an <strong>Admin</strong> section. Everything inside
        is chapter-scoped to you automatically. You can't accidentally
        edit another chapter's data. SuperAdmins see the same tools across
        all chapters.
      </p>
      <ul>
        <li><strong>Reviews.</strong> The group view of every LP's ratings.</li>
        <li><strong>Grant Winners.</strong> Mark winners, fill in their public info.</li>
        <li><strong>Users.</strong> Manage your chapter's LPs.</li>
        <li><strong>Create User.</strong> Invite new LPs.</li>
        <li><strong>Chapter.</strong> Edit your chapter's page content.</li>
      </ul>

      <h2>Inviting New LPs</h2>
      <p>
        Head to the <strong>Create User</strong> tab. Fill in the form
        (email, full name, role, usually LP, and join date) and submit. The
        portal sends a magic-link invite email; the new LP clicks it, sets
        a password, and lands in the portal with your chapter already
        assigned.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Payment and access</p>
        <p style={{ margin: 0 }}>
          The invite itself is free to send. LPs typically pay via the
          Stripe renewal link (annual or semi-annual) either just before or
          just after you create their account, whichever's cleanest for
          them. If someone goes quiet after the invite, a Slack DM is
          usually all it takes.
        </p>
      </div>

      <h3>Who to make a second Chapter Director</h3>
      <p>
        Most chapters eventually add a co-director. Pick someone who (a)
        shows up, (b) is comfortable running a meeting, and (c) would
        happily take over if you needed a month off. Promote them by
        editing their user and changing role to Chapter Director.
      </p>

      <h2>The Quarterly Meeting Is the Work</h2>
      <p>
        Your most important tool isn't in the portal. It's the quarterly
        meeting itself. In-person, around a table, with the Reviews tab
        up on a screen. That's where ratings become conversations, and
        conversations become winners.
      </p>
      <p>
        <strong>We strongly prefer in-person.</strong> Something about
        being in the same room changes how honestly people champion a
        pitch they love, or challenge one the group is ready to dismiss.
        Virtual works as a fallback when your LPs are spread across a
        metro, but it should be the exception.
      </p>

      <h3>Running the meeting from the Reviews tab</h3>
      <p>
        Open the <strong>Reviews</strong> tab in the admin panel, put it
        on a screen, and use it to drive the discussion:
      </p>
      <ul>
        <li><strong>Sort by weighted score</strong> to surface the pitches your chapter collectively loved.</li>
        <li><strong>Sort by average score</strong> for a different cut. Sometimes the top of this list surprises you.</li>
        <li><strong>Filter to Favorites only</strong> to set your initial finalist pool. Widen to Considerations if no clear winner emerges.</li>
        <li><strong>Read the team notes aloud.</strong> Each note is attributed to the LP who wrote it. Use that to draw them out if they haven't spoken up yet.</li>
      </ul>
      <p>
        You're not there to rubber-stamp the top of the list. You're
        there to host a real discussion. The best meetings end with a
        winner nobody expected at the start. That's the group working as
        intended.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">You see names here</p>
        <p style={{ margin: 0 }}>
          On the regular <strong>Review Pitches</strong> tab, team notes
          are anonymized as "LP 1", "LP 2" for everyone, both LPs and
          Chapter Directors alike. In this admin <strong>Reviews</strong>
          tab they're attributed by name, which is part of why it's the
          right place to run the meeting from.
        </p>
      </div>

      <h3>Shortlisting as you go</h3>
      <p>
        Every pitch card in the admin Reviews tab has a{' '}
        <strong>Shortlist</strong> button. As the conversation moves and
        a pitch earns real interest from the room (someone champions it,
        or the group pauses on it), hit Shortlist. It's a one-click
        bookmark shared across everyone with admin access.
      </p>
      <p>
        When you've worked through the list, switch the rating filter to{' '}
        <strong>Shortlisted Only</strong>. Now you're looking at just the
        pitches the group wanted to come back to. Run the final round of
        discussion from that subset and pick your winner from there.
      </p>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)' }}>
        Shortlist is persistent. It stays on the pitch across sessions.
        Clear it by tapping the button again if you change your mind. A
        co-director on the same pitch sees the same shortlist in
        real-ish time.
      </p>

      <h3>Taking notes during the discussion</h3>
      <p>
        When you expand a pitch in the admin Reviews tab, below the LP
        Review Comments you'll find{' '}
        <strong>Admin Discussion Notes</strong>. This is where follow-ups,
        open questions, and memorable moments from the conversation live.
        Use it the way the LPs use their private notes on the review form,
        except here anyone with admin access can add a note, and every
        note is attributed to the admin who wrote it.
      </p>
      <ul>
        <li><strong>Capture follow-ups.</strong> "Need to verify the revenue claim." "Circle back on their brick-and-mortar plans." Notes keep context you'd otherwise lose by the next meeting.</li>
        <li><strong>Record the room's take.</strong> If a pitch swung the group in an unexpected direction, write it down. It's material for next quarter's recruiting and a paper trail for funders.</li>
        <li><strong>Split the work with a co-director.</strong> One of you facilitates, the other types. Each note lands under its real author so you can see who captured what.</li>
      </ul>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)' }}>
        LPs never see admin discussion notes. Only accounts with{' '}
        <code>chapter_director</code> or <code>superAdmin</code> access do.
        You can edit or delete your own notes; superAdmins can manage any.
      </p>

      <h2>Scheduling the Meeting</h2>
      <p>
        A few small habits save you from the "nobody can make it" spiral:
      </p>
      <ul>
        <li><strong>Book the date a couple of weeks out.</strong> Far enough ahead that busy calendars have room; close enough that it stays on people's radar. More than a month out and you'll lose momentum.</li>
        <li><strong>Pick a real venue.</strong> A dinner at someone's house, the back room at a local spot, a co-working lounge after hours. Anywhere that feels like a dinner party, not a meeting.</li>
        <li><strong>Send a reminder one week before.</strong> Include the portal link so LPs can finish their reviews and arrive prepped.</li>
        <li><strong>Share the prep docs.</strong> The <em>Reviewing Pitches</em> guide in the Resources tab has an Export PDF button. Attach it to the reminder for any LP who wants a refresher.</li>
      </ul>

      <h2>Assigning Winners</h2>
      <p>
        Winners get picked at the quarterly meeting. The portal doesn't
        run the vote for you. Once the group has decided, here's how to
        make it official:
      </p>
      <ol>
        <li>Go to the <strong>Grant Winners</strong> tab.</li>
        <li>Find the winning pitch and toggle the <strong>Winner</strong> flag on. The grantee is added to the tab marked <strong>Hidden</strong> — they're not yet visible on the public site.</li>
        <li>Fill in (or edit) their public fields:
          <ul>
            <li><strong>About.</strong> A short paragraph about the business. The <strong>Generate with AI</strong> button drafts one from the application; edit before saving.</li>
            <li><strong>Website.</strong> Their URL.</li>
            <li><strong>Pitch Photo.</strong> Upload a portrait or product shot. Saves to Firebase Storage immediately on upload.</li>
          </ul>
        </li>
        <li>Click <strong>Save All Changes</strong>.</li>
        <li>When you're ready to announce, flip the <strong>Live on website</strong> switch on the winner's card. The grantee appears on the public chapter page, the Founder Map, and the Neighborhood Navigator immediately.</li>
      </ol>

      <h3>What "going live" actually means</h3>
      <p>
        Two flags govern visibility. <code>isWinner</code> marks the pitch as
        a grant recipient (used by your Statistics tab and internal totals).
        <code>winnerPublished</code> is the public switch — until you flip
        <strong>Live on website</strong> on, the grantee is hidden everywhere
        a member of the public would see them. New winners default to
        hidden so you can stage About, Website, and Photo without anything
        leaking before announcement day.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Announcement order matters</p>
        <p style={{ margin: 0 }}>
          Tell the winner first (a call, ideally), then flip <strong>Live on
          website</strong> on, then post to Instagram / Slack / email. The
          public page updates the moment you flip the switch. Don't let a
          founder find out they won from a social post.
        </p>
      </div>

      <h3>Un-publishing a winner</h3>
      <p>
        Flipping <strong>Live on website</strong> off hides the grantee
        again — useful if you spot a typo or need to delay an
        announcement. Toggling it doesn't affect their winner status, the
        award amount, or your internal stats; it only controls public
        visibility.
      </p>

      <h3>Editing a past winner</h3>
      <p>
        Returning to the Grant Winners tab later lets you update any
        winner's About, website, or photo. Useful when a grantee launches,
        rebrands, or sends better photography. The changes show up on the
        public chapter page instantly.
      </p>

      <h2>User Management</h2>
      <p>
        The <strong>Users</strong> tab lists everyone in your chapter. From
        here you can:
      </p>
      <ul>
        <li>Edit an LP's name, email, or role.</li>
        <li>Trigger a password reset email (the LP handles the rest).</li>
        <li>Deactivate a lapsed LP (or reactivate when they renew).</li>
      </ul>
      <p>
        You cannot edit users outside your chapter. If an LP needs to move
        chapters (common when someone relocates), ping a SuperAdmin in the
        national Slack.
      </p>

      <h2>Editing Your Chapter Page</h2>
      <p>
        The <strong>Chapter</strong> tab lets you edit the copy and
        imagery that renders on your public chapter page, the landing
        page prospective LPs and founders see before they apply. Use this
        to keep the meeting schedule fresh, swap the hero image seasonally,
        and update the LP roster.
      </p>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)', marginTop: -8 }}>
        Some chapter pages are hand-built static HTML (Denver, WNY, Central NY,
        Capital Region). Those are edited in code by GNF HQ, not through
        this tab. If you're unsure which you have, ask in the national
        Slack before assuming edits didn't save.
      </p>

      <h2>The Quarterly Rhythm</h2>
      <p>
        A chapter that runs on time is a chapter that stays alive. Loose
        template for each quarter:
      </p>
      <ul>
        <li><strong>Weeks 1 to 3:</strong> promote the chapter, funnel applications.</li>
        <li><strong>Week 4:</strong> close applications. Post a deadline reminder in Slack.</li>
        <li><strong>Weeks 5 to 7:</strong> LPs review async. You nudge at week 6.</li>
        <li><strong>Week 8:</strong> quarterly meeting. The group reviews top finalists and votes on the winner.</li>
        <li><strong>Week 9:</strong> notify the winner, mark them in the Grant Winners tab, fill in their public info, then flip <strong>Live on website</strong> on and post everywhere.</li>
        <li><strong>Weeks 10 to 12:</strong> rest. Recruit one or two new LPs. Start the next cycle.</li>
      </ul>

      <h2>Where to Get Help</h2>
      <ul>
        <li><strong>hello@goodneighbor.fund</strong> for anything portal-related or sensitive.</li>
        <li>The <em>Recruiting Limited Partners</em> and <em>New Chapter Handbook</em> docs in this library cover the non-admin side of the job.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">The heart of the role</p>
        <p style={{ margin: 0 }}>
          The admin panel handles the paperwork. Your actual job is
          hosting. Setting the table, making the toast, welcoming a new
          LP, celebrating a grantee. You're not managing a process.
          You're building a neighborhood.
        </p>
      </div>
    </>
  );
}
