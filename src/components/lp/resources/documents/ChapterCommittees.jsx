import React from 'react';

export default function ChapterCommittees() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        Committees are optional scaffolding for a growing chapter. Once you
        have more than a handful of LPs, splitting the work into small
        standing groups keeps momentum up and pulls more people into
        ownership.
      </p>

      <h2>It's Your Call</h2>
      <p>
        Number, shape, and scope of committees is entirely at the Chapter
        Director's discretion. A chapter of six probably doesn't need a
        single one. A chapter of twenty usually wants three or four. Stand
        them up when the work calls for it. Don't create four empty
        committees on launch day and watch them gather dust.
      </p>
      <p>
        Treat this doc as inspiration, not a blueprint. The committees
        below are the ones other chapters have found useful. Steal the
        ones that fit, skip the ones that don't, and invent your own when
        your chapter needs something these don't cover.
      </p>

      <h2>Common Committees</h2>

      <h3>Selection Committee</h3>
      <p>
        A group of LPs dedicated to the actual review and selection of
        pitches: reading applications, scoring in the portal, and shaping
        the finalist list the full chapter votes on at the quarterly
        meeting. Useful when your application volume has grown past the
        point where every LP can read every pitch carefully.
      </p>

      <h3>Governance Committee</h3>
      <p>
        The group that handles leadership-type decisions: anything that
        doesn't cleanly fall under "pick a winner" or "throw an event." A
        few examples of what tends to land here:
      </p>
      <ul>
        <li>Requests to sponsor other organizations' events.</li>
        <li>Approving unusual uses of funds, like replacement checks, stipends, or a bigger-than-usual event budget.</li>
        <li>Chapter-level policy questions and anything sensitive enough to want more than one set of eyes on.</li>
      </ul>

      <h3>Events Committee</h3>
      <p>
        Plans Good Neighbor Fun events. We highly encourage chapters to
        host them: on brand, on mission, and genuinely fun. Same committee
        usually handles co-hosting opportunities with aligned local orgs.
        If your chapter is looking for a low-stakes way to activate newer
        LPs, this is often the best on-ramp.
      </p>

      <h3>Founder Support Committee</h3>
      <p>
        The LPs who go out to meet the awardees. Present the check in
        person, sit down with the founder, hear their actual needs and
        goals, and bring that back to the rest of the chapter afterward.
        This is where the "neighbor" in Good Neighbor Fund gets real.
        The relationship with a grantee usually outlasts the grant.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Start with one</p>
        <p style={{ margin: 0 }}>
          You don't have to launch all four at once. Most chapters start
          with whichever committee solves their most immediate bottleneck
          (usually Selection or Events) and add others as the chapter
          grows into them.
        </p>
      </div>

      <h2>Running Committees on Slack</h2>
      <p>
        Use the national GNF Slack to spin up a dedicated channel per
        committee. Keeps conversation searchable, pulls the right people
        in, and leaves a paper trail the next committee lead can pick up.
      </p>

      <h3>Recommended channel naming</h3>
      <p>
        Prefix every channel with your chapter abbreviation so they're
        discoverable across the shared workspace. For a chapter like
        Western New York (<code>wny</code>):
      </p>
      <ul>
        <li><code>#wny-selection-committee</code></li>
        <li><code>#wny-governance-committee</code></li>
        <li><code>#wny-events-committee</code></li>
        <li><code>#wny-founder-support</code></li>
      </ul>
      <p>
        Swap the prefix for yours: <code>#denver-events-committee</code>,{' '}
        <code>#capital-region-selection-committee</code>, and so on. Keep
        the suffix consistent across chapters so LPs moving between
        workspaces aren't relearning conventions.
      </p>

      <h3>Keep committee channels private</h3>
      <p>
        All chapters share the same Slack workspace, so default every
        committee channel to <strong>private</strong> and invite only the
        LPs who need to be in it. A public channel here isn't public to
        your chapter. It's public to every chapter, and committee
        conversation (pitches mid-review, funding decisions, founder
        details) isn't meant for that audience. Private by default, add
        members explicitly, remove them when they rotate off.
      </p>

      <h2>Running a Committee Well</h2>
      <ul>
        <li><strong>Give each committee a named lead.</strong> Someone owns the channel, calls the meeting, and brings decisions back to the full chapter.</li>
        <li><strong>Meet as often as the work requires.</strong> Not more. A dormant committee that meets anyway will kill enthusiasm faster than no committee at all.</li>
        <li><strong>Report up.</strong> Every committee should surface its decisions and open questions to the full chapter at the quarterly meeting. Otherwise you've just built silos.</li>
        <li><strong>Rotate membership.</strong> A year on a committee is plenty. Bringing fresh LPs in keeps the work from calcifying and gives newer LPs a clear path to leadership.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">The point of committees</p>
        <p style={{ margin: 0 }}>
          Committees exist to give more LPs real ownership of the chapter,
          not to manufacture meetings. If a committee isn't making the
          chapter better, retire it. Tell its members they did good
          work. That's a healthy chapter, not a failed committee.
        </p>
      </div>
    </>
  );
}
