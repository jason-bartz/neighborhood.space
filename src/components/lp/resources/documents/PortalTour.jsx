import React from 'react';

export default function PortalTour() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        The portal is your neighborhood. Review Pitches is where the work
        happens. This guide covers everything else: the map, the trophies,
        the share kit, Slack, and keeping your LP seat for next year.
      </p>

      <h2>The Layout</h2>
      <p>
        Tabs live on the left sidebar. Your chapter and name sit at the
        top; Slack and renewal buttons sit at the bottom. The main panel
        changes based on which tab you're on. Works the same on desktop
        and mobile, though we recommend desktop. This is a
        Windows-95-in-pastels operation.
      </p>

      <h2>Pitch Map</h2>
      <p>
        The <strong>Pitch Map</strong> tab plots every pitch from your
        chapter on a real map. It's a fun way to see the geographic story
        of your neighborhood: who's pitching from which block, where past
        winners landed, how wide the chapter's reach goes.
      </p>
      <ul>
        <li><strong>📍 pins</strong> are regular pitches.</li>
        <li><strong>🏆 pins</strong> are past grant winners.</li>
        <li><strong>Filters</strong> on top let you search, narrow by quarter, or flip to <em>Show Winners Only</em>.</li>
        <li>Click a pin to open that pitch's details.</li>
      </ul>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)', marginTop: -8 }}>
        Pitches only show up on the map if they have location data from the
        application. Most do; the occasional one slips through without.
      </p>

      <h2>Trophy Case</h2>
      <p>
        The <strong>Trophy Case</strong> tab is where your badges live.
        Every badge you've unlocked sits front and center with the date you
        earned it; locked ones show below with a progress bar toward the
        next unlock. It's the closest thing to a scoreboard we've got.
      </p>

      <h3>How badges work</h3>
      <ul>
        <li><strong>Earn them by participating.</strong> Reviewing pitches, leaving team notes, voting with the group, being consistent over time.</li>
        <li><strong>Progress tracks automatically.</strong> No claim buttons. The system just watches your activity.</li>
        <li><strong>Some are quiet.</strong> A few badges are easter eggs. We're not going to spoil them.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">When you earn one</p>
        <p style={{ margin: 0 }}>
          A notification pops up right after the action that triggered it,
          usually a review submission. The new badge also appears in your
          Trophy Case immediately.
        </p>
      </div>

      <h2>Chapter Members</h2>
      <p>
        The <strong>Chapter Members</strong> tab is a directory of everyone
        in your neighborhood, the people whose opinions your ratings sit
        alongside. Each member card shows:
      </p>
      <ul>
        <li><strong>Name and role.</strong> Who they are and what they do day-to-day.</li>
        <li><strong>Member since.</strong> Month and year they joined, so you can tell a founding LP from last quarter's addition.</li>
        <li><strong>LinkedIn.</strong> One click to their profile.</li>
        <li><strong>Recent badges.</strong> Their last five unlocked trophies.</li>
      </ul>
      <p>
        It's also a friendly way to see how your Trophy Case stacks up
        against the rest of the chapter, and a reminder that the people
        you'll meet at the next dinner are already on your team.
      </p>

      <h2>Share Kit (Social Cards)</h2>
      <p>
        The <strong>Social</strong> tab has four pre-made cards you can
        download and post. Each one is sized for Instagram / LinkedIn / X
        and pulls your name and chapter automatically:
      </p>
      <ul>
        <li><strong>Welcome to GNF.</strong> Introduce yourself to your new chapter.</li>
        <li><strong>Badge Achievements.</strong> Show off the trophies you've earned.</li>
        <li><strong>Chapter Impact.</strong> Your chapter's funded-business tally.</li>
        <li><strong>LP Recruitment.</strong> Rally new LPs into the network.</li>
      </ul>
      <p>
        Click <strong>Download</strong> on any card and a PNG saves to your
        device. The cards are the easiest way to help your chapter grow.
        One post after you join is often enough to surface two or three new
        prospective LPs.
      </p>

      <h2>Join Slack</h2>
      <p>
        At the bottom of the sidebar you'll find a <strong>Join Slack</strong>
        button. One click opens our shared workspace invite in a new tab.
        Every chapter has its own channel; there's a national channel for
        cross-chapter chatter, meme-sharing, and asking Chapter Directors
        for help. This is where the neighborhood actually hangs out between
        meetings.
      </p>

      <h2>LP Membership Renewal</h2>
      <p>
        Directly above the Slack button, under <strong>LP Membership</strong>,
        you'll see one or two renewal buttons depending on how your chapter
        sets things up:
      </p>
      <ul>
        <li><strong>Renew Annual.</strong> One payment, one year of membership. The simplest option; most LPs pick this.</li>
        <li><strong>Renew Semi-Annual.</strong> A smaller payment every six months. Useful if your chapter prefers the lighter cadence or you're spreading cost.</li>
      </ul>
      <p>
        Clicking either button opens Stripe in a new tab. Both plans
        <strong> auto-renew</strong> on the same cadence going forward, so
        once you're in, you stay in. No calendar reminder required.
        Stripe emails a receipt each time and gives you a link to update
        your card or cancel.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Prefer not to use Stripe?</p>
        <p style={{ margin: 0 }}>
          Check, ACH, and wire are all welcome. They just don't live in
          the portal. Message your Chapter Director directly and they'll
          coordinate the payment and keep your membership active.
        </p>
      </div>

      <h2>Sign-out &amp; Account</h2>
      <p>
        Your name at the top of the sidebar is your account area. Click it
        to sign out. Password resets and email changes are handled by your
        Chapter Director in the admin panel; just ping them in Slack.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Something feel broken?</p>
        <p style={{ margin: 0 }}>
          Post in <strong>#help</strong> on the national Slack or email
          <a href="mailto:hello@goodneighbor.fund"> hello@goodneighbor.fund</a>.
          Screenshots help us move faster.
        </p>
      </div>
    </>
  );
}
